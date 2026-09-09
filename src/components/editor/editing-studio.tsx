"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronLeft,
  Download,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  SlidersHorizontal,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { loadSource, probeVideo, probeImage } from "@/lib/editor/media";
import {
  addOverlay,
  duplicateClip,
  moveClip,
  patchProject,
  removeClip,
  removeOverlay,
  reorderClips,
  splitClipAt,
  updateClip,
  updateOverlay,
  withClips,
  formatTimecode,
} from "@/lib/editor/project";
import {
  deleteProject,
  listProjects,
  loadBrandKit,
  resumeOrCreate,
  saveProject,
} from "@/lib/editor/storage";
import {
  DEFAULT_WATERMARK,
  defaultClip,
  defaultOverlay,
  emptyProject,
  type Project,
  IMAGE_CLIP_DEFAULT_DURATION,
  type ClipKind,
} from "@/lib/editor/types";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";
import { ExportDialog } from "./export-dialog";
import { Inspector, type InspectorTab } from "./inspector";
import { MediaLibrary, LibraryHeader, type LibraryItem } from "./media-library";
import { PreviewStage } from "./preview-stage";
import { Timeline, type Selection } from "./timeline";
import { useStudioEngine } from "./use-studio-engine";

/** How long after the last keystroke or drag the project is written to
 *  localStorage. Long enough that dragging a slider doesn't serialise the
 *  whole document on every frame. */
const AUTOSAVE_DELAY_MS = 800;

/** Depth of the undo stack. Each entry is a whole Project — small (it holds
 *  no media) but not free, and nobody is undoing eighty steps. */
const HISTORY_LIMIT = 50;

/**
 * How long a run of continuous changes stays one undo step.
 *
 * Dragging a slider fires dozens of commits a second, and recording each as
 * its own step would mean pressing Ctrl+Z forty times to get back to before
 * the drag. They coalesce while they keep coming; a pause longer than this
 * starts a new step, so "brightness, then contrast" is still two undos.
 */
const HISTORY_COALESCE_MS = 900;

/**
 * The document plus its history, in ONE state value.
 *
 * Splitting them into a project state and a separate history state is the
 * obvious shape and the wrong one: an undo has to move a project into the
 * future stack and pull another out of the past in the same commit, and two
 * setState calls can be batched such that one of them computes from a stale
 * copy of the other. Held together, every transition is a single pure
 * function of the previous whole.
 */
type EditorState = {
  project: Project;
  past: Project[];
  future: Project[];
  /** When the last commit landed, and whether it was a coalescing one. */
  lastCommitAt: number;
  lastTransient: boolean;
};

function initialState(project: Project): EditorState {
  return { project, past: [], future: [], lastCommitAt: 0, lastTransient: false };
}

export function EditingStudio() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const searchParams = useSearchParams();

  const [state, setState] = useState<EditorState>(() => initialState(emptyProject()));
  const project = state.project;
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;
  const [hydrated, setHydrated] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [tab, setTab] = useState<InspectorTab>("clip");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const engine = useStudioEngine(project);
  const { duration, layout, seek, pause, time } = engine;

  /* ------------------------------------------------------------- history */

  /**
   * Every mutation goes through here, which is what makes undo a one-liner:
   * the previous document is pushed onto the stack before the new one takes
   * its place.
   *
   * `transient` marks a continuous change — a slider or a trim drag — which
   * joins the step already in progress rather than opening a new one. See
   * HISTORY_COALESCE_MS.
   */
  const commit = useCallback((next: Project, options?: { transient?: boolean }) => {
    setState((current) => {
      if (next === current.project) return current;

      const now = Date.now();
      const joinsPreviousStep =
        Boolean(options?.transient) &&
        current.lastTransient &&
        now - current.lastCommitAt < HISTORY_COALESCE_MS;

      return {
        project: next,
        past: joinsPreviousStep
          ? current.past
          : [...current.past, current.project].slice(-HISTORY_LIMIT),
        // Any new edit invalidates the redo branch — the timeline it led to
        // no longer exists.
        future: [],
        lastCommitAt: now,
        lastTransient: Boolean(options?.transient),
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return {
        project: previous,
        past: current.past.slice(0, -1),
        future: [current.project, ...current.future].slice(0, HISTORY_LIMIT),
        lastCommitAt: 0,
        lastTransient: false,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      const next = current.future[0];
      if (!next) return current;
      return {
        project: next,
        past: [...current.past, current.project].slice(-HISTORY_LIMIT),
        future: current.future.slice(1),
        lastCommitAt: 0,
        lastTransient: false,
      };
    });
  }, []);

  /* ------------------------------------------------------- load & resume */

  /**
   * Re-signs every clip in a restored project.
   *
   * A stored project holds only generation ids — its playback URLs were
   * short-lived signed R2 links and are long dead by the time anyone comes
   * back (see resumeOrCreate, which blanks them rather than leaving them to
   * fail as a black frame). A clip whose generation has since been deleted is
   * dropped, with a note, instead of sitting there permanently broken.
   */
  const rehydrate = useCallback(async (stored: Project): Promise<Project> => {
    const stale = stored.clips.filter((clip) => !clip.sourceUrl);
    if (stale.length === 0) return stored;

    const resolved = await Promise.all(
      stale.map(async (clip) => {
        try {
          const res = await apiFetch(`/api/generations/${clip.sourceId}`);
          if (!res.ok) return null;
          const item = (await res.json()) as {
            resultUrl: string | null;
            thumbnailUrl: string | null;
          };
          return item.resultUrl
            ? { id: clip.id, resultUrl: item.resultUrl, thumbnailUrl: item.thumbnailUrl }
            : null;
        } catch {
          return null;
        }
      }),
    );

    const byClip = new Map(
      resolved.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => [r.id, r]),
    );

    const clips = stored.clips.flatMap((clip) => {
      if (clip.sourceUrl) return [clip];
      const fresh = byClip.get(clip.id);
      if (!fresh) return [];
      return [{ ...clip, sourceUrl: fresh.resultUrl, posterUrl: fresh.thumbnailUrl }];
    });

    return { ...stored, clips };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = resumeOrCreate();
      const brandKit = loadBrandKit();
      const restored = await rehydrate(stored);
      if (cancelled) return;

      const dropped = stored.clips.length - restored.clips.length;
      if (dropped > 0) {
        toast({
          title: `${dropped} clip${dropped === 1 ? "" : "s"} no longer available`,
          description: "The generation behind it was deleted, so it was removed from this edit.",
        });
      }

      // Replaces the history too: what came before the restore was the
      // placeholder empty project, and undoing back into it would wipe the
      // edit the user just came back to.
      setState(
        initialState({
          ...restored,
          // A saved project keeps its own watermark; only a brand-new one
          // picks up the brand kit, always switched off (see saveBrandKit).
          watermark:
            restored.clips.length === 0 && brandKit
              ? { ...brandKit, enabled: false }
              : restored.watermark,
        }),
      );
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once: this is the initial load, and re-running it would discard
    // whatever the user has done since.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------------- adding clips */

  const addFromLibrary = useCallback(
    async (item: LibraryItem) => {
      if (!item.resultUrl) return;
      setAddingId(item.id);
      try {
        // Probing needs the real file, so the download happens here rather
        // than at first paint — the clip's true length and pixel size drive
        // the trim handles and the fit maths, and `parameters.duration` on
        // the generation is what was *asked for*, which providers miss.
        const objectUrl = await loadSource(item.id, item.resultUrl);
        // A still has no duration to read, so it is probed for size only and
        // given a chosen length instead — see IMAGE_CLIP_DEFAULT_DURATION.
        const kind: ClipKind = item.type === "text-to-image" ? "image" : "video";
        const probe = kind === "image" ? await probeImage(objectUrl) : await probeVideo(objectUrl);

        const clip = defaultClip({
          sourceId: item.id,
          sourceUrl: item.resultUrl,
          posterUrl: item.thumbnailUrl,
          label: truncate(item.prompt || (kind === "image" ? "Image" : "Clip"), 40),
          duration: probe.duration,
          kind,
          initialOut: kind === "image" ? IMAGE_CLIP_DEFAULT_DURATION : undefined,
        });

        // Not routed through `commit`: this runs after an await, so the
        // `project` captured when the click happened may already be stale.
        // The updater form reads whatever is current at apply time.
        setState((current) => ({
          project: withClips(current.project, [...current.project.clips, clip]),
          past: [...current.past, current.project].slice(-HISTORY_LIMIT),
          future: [],
          lastCommitAt: Date.now(),
          lastTransient: false,
        }));
        setSelection({ kind: "clip", id: clip.id });
        setTab("clip");
      } catch (error) {
        toast({
          title: "Couldn't add that clip",
          description: error instanceof Error ? error.message : undefined,
          variant: "error",
        });
      } finally {
        setAddingId(null);
      }
    },
    [toast],
  );

  // Deep link from the gallery: /editor?add=<generation id>. Handled once,
  // and only after the stored project has loaded, so the clip lands in the
  // resumed edit rather than in an empty one that is about to be replaced.
  // Which panel is showing in a sheet on narrow screens. Below lg the
  // library aside and below xl the inspector aside are display:none, so
  // without this the editor is unusable on a phone — no way to add a clip
  // and no way to change anything about one.
  const [mobilePanel, setMobilePanel] = useState<"library" | "inspector" | null>(null);

  const consumedDeepLink = useRef(false);
  useEffect(() => {
    const id = searchParams.get("add");
    if (!hydrated || !id || consumedDeepLink.current) return;
    consumedDeepLink.current = true;

    void (async () => {
      try {
        const res = await apiFetch(`/api/generations/${id}`);
        if (!res.ok) throw new Error("That generation couldn't be opened.");
        const item = (await res.json()) as LibraryItem;
        if (!item.resultUrl) throw new Error("That generation has no file to edit.");
        await addFromLibrary(item);
      } catch (error) {
        toast({
          title: "Couldn't open that generation",
          description: error instanceof Error ? error.message : undefined,
          variant: "error",
        });
      }
    })();
  }, [hydrated, searchParams, addFromLibrary, toast]);

  /* ------------------------------------------------------------ autosave */

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      saveProject(project);
      setSavedAt(new Date().toISOString());
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [project, hydrated]);

  /* ----------------------------------------------------------- shortcuts */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Never steal a keystroke from a field — "s" is Split here and the
      // letter s everywhere someone is typing a caption.
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      switch (event.key) {
        case " ":
          event.preventDefault();
          engine.toggle();
          break;
        case "s":
        case "S":
          commit(splitClipAt(project, time));
          break;
        case "t":
        case "T": {
          const overlay = defaultOverlay(time, Math.min(duration, time + 3));
          commit(addOverlay(project, overlay));
          setSelection({ kind: "overlay", id: overlay.id });
          setTab("text");
          break;
        }
        case "Delete":
        case "Backspace":
          if (selection?.kind === "clip") commit(removeClip(project, selection.id));
          if (selection?.kind === "overlay") commit(removeOverlay(project, selection.id));
          setSelection(null);
          break;
        case "ArrowLeft":
          // A frame at a time with Shift, a beat at a time without.
          seek(time - (event.shiftKey ? 1 / project.fps : 0.5));
          break;
        case "ArrowRight":
          seek(time + (event.shiftKey ? 1 / project.fps : 0.5));
          break;
        case "Home":
          seek(0);
          break;
        case "End":
          seek(duration);
          break;
        case "[":
          if (selection?.kind === "clip") commit(moveClip(project, selection.id, -1));
          break;
        case "]":
          if (selection?.kind === "clip") commit(moveClip(project, selection.id, 1));
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commit, duration, engine, project, redo, seek, selection, time, undo]);

  /* ------------------------------------------------------------ handlers */

  const usedSourceIds = useMemo(
    () => new Set(project.clips.map((c) => c.sourceId)),
    [project.clips],
  );

  const openProject = useCallback(
    async (stored: Project) => {
      pause();
      const restored = await rehydrate({
        ...stored,
        clips: stored.clips.map((clip) => ({ ...clip, sourceUrl: "", posterUrl: null })),
      });
      // Switching documents resets the history: undo must not walk backwards
      // out of one project and into another.
      setState(initialState(restored));
      setSelection(null);
      setProjectsOpen(false);
    },
    [pause, rehydrate],
  );

  const startNew = useCallback(() => {
    pause();
    const brandKit = loadBrandKit();
    setState(
      initialState({
        ...emptyProject(),
        watermark: brandKit ? { ...brandKit, enabled: false } : { ...DEFAULT_WATERMARK },
      }),
    );
    setSelection(null);
    setProjectsOpen(false);
  }, [pause]);

  // Defined once and rendered in two places — the desktop asides and the
  // mobile sheets — so the two can never drift into different behaviour.
  const libraryPanel = (
    <MediaLibrary
      onAdd={(item) => {
        void addFromLibrary(item);
        // On a phone the sheet covers the timeline, so it closes on pick:
        // the point of adding a clip is to see it land.
        setMobilePanel(null);
      }}
      addingId={addingId}
      usedSourceIds={usedSourceIds}
    />
  );

  const inspectorPanel = (
    <Inspector
      project={project}
      duration={duration}
      selection={selection}
      tab={tab}
      onTabChange={setTab}
      onSelect={setSelection}
      onPatchProject={(patch) => commit(patchProject(project, patch), { transient: true })}
      onPatchClip={(clipId, patch) =>
        commit(updateClip(project, clipId, patch), { transient: true })
      }
      onPatchOverlay={(id, patch) =>
        commit(updateOverlay(project, id, patch), { transient: true })
      }
      onAddOverlay={() => {
        const overlay = defaultOverlay(time, Math.min(duration, time + 3));
        commit(addOverlay(project, overlay));
        setSelection({ kind: "overlay", id: overlay.id });
      }}
      onRemoveOverlay={(id) => {
        commit(removeOverlay(project, id));
        setSelection(null);
      }}
      onDeleteClip={(clipId) => {
        commit(removeClip(project, clipId));
        setSelection(null);
      }}
    />
  );

  return (
    // dvh, not vh: on mobile Safari/Chrome the URL bar collapses on scroll
    // and a vh-sized editor would resize under the user mid-drag. The 6rem
    // below lg matches AppShell's h-16 header plus its p-4 padding; 8rem is
    // the same sum once that padding grows to p-8.
    <div className="flex h-[calc(100dvh-6rem)] min-h-[30rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 lg:h-[calc(100dvh-8rem)] lg:min-h-[35rem]">
      {/* -------------------------------------------------------- header */}
      {/* Wraps instead of overflowing: at 375px the action cluster alone is
          ~267px, which squeezed the name field down to an unusable 34px and
          still pushed Export off the edge. On a narrow screen the actions
          simply take their own row. */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        {/* Collapses the docked aside. Hidden below lg, where that aside is
            display:none and this button therefore toggled nothing visible. */}
        <Tooltip content={libraryOpen ? "Hide your library" : "Show your library"}>
          <button
            type="button"
            onClick={() => setLibraryOpen((v) => !v)}
            aria-label={libraryOpen ? "Hide library" : "Show library"}
            className="hidden rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-ink lg:block"
          >
            {libraryOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
          </button>
        </Tooltip>

        {/* The same library, as a sheet, for the viewports where the aside
            can't exist. */}
        <button
          type="button"
          onClick={() => setMobilePanel("library")}
          aria-label="Show your library"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-ink lg:hidden"
        >
          <PanelLeftOpen className="size-4" />
        </button>

        <Input
          value={project.name}
          onChange={(e) => commit(patchProject(project, { name: e.target.value }), { transient: true })}
          aria-label="Project name"
          className="h-9 min-w-28 flex-1 py-1.5 text-label sm:w-56 sm:flex-none lg:w-64"
        />

        <span className="hidden items-center gap-1 text-caption text-text-tertiary sm:flex">
          {savedAt ? (
            <>
              <Check className="size-3" aria-hidden="true" /> Saved {formatRelativeTime(savedAt)}
            </>
          ) : null}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <Tooltip content="Undo (Ctrl+Z)">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-ink disabled:opacity-30"
            >
              <Undo2 className="size-4" />
            </button>
          </Tooltip>
          <Tooltip content="Redo (Ctrl+Shift+Z)">
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-ink disabled:opacity-30"
            >
              <Redo2 className="size-4" />
            </button>
          </Tooltip>

          {/* Below xl the inspector aside is display:none, so every clip,
              text and audio control was unreachable. Same panel, in a sheet. */}
          <Tooltip content="Edit settings">
            <button
              type="button"
              onClick={() => setMobilePanel("inspector")}
              aria-label="Edit settings"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-ink xl:hidden"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </Tooltip>

          <div className="mx-1 h-5 w-px bg-line" />

          <Button variant="secondary" size="sm" onClick={() => setProjectsOpen(true)}>
            <FolderOpen className="size-3.5" />
            <span className="hidden sm:inline">Projects</span>
          </Button>
          <Button
            variant="accent"
            size="sm"
            disabled={project.clips.length === 0}
            onClick={() => setExportOpen(true)}
          >
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </header>

      {/* --------------------------------------------------------- body */}
      <div className="flex min-h-0 flex-1">
        {libraryOpen && (
          <aside className="hidden w-64 shrink-0 flex-col border-r border-line lg:flex">
            <LibraryHeader count={project.clips.length} />
            {libraryPanel}
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <PreviewStage
            project={project}
            canvasRef={engine.canvasRef}
            time={time}
            duration={duration}
            playing={engine.playing}
            onToggle={engine.toggle}
            onSeek={seek}
            emptyHint={
              libraryOpen
                ? "Pick a video from your library to start your edit."
                : "Open the library to add a video."
            }
          />

          <Timeline
            project={project}
            layout={layout}
            time={time}
            loadState={engine.loadState}
            selection={selection}
            onSelect={(next) => {
              setSelection(next);
              if (next?.kind === "clip") setTab("clip");
              if (next?.kind === "overlay") setTab("text");
            }}
            onSeek={seek}
            onTrim={(clipId, patch) => commit(updateClip(project, clipId, patch), { transient: true })}
            onReorder={(from, to) => commit(reorderClips(project, from, to))}
            onSplit={() => commit(splitClipAt(project, time))}
            onDuplicate={(clipId) => commit(duplicateClip(project, clipId))}
            onDeleteClip={(clipId) => {
              commit(removeClip(project, clipId));
              setSelection(null);
            }}
            onMoveOverlay={(id, patch) =>
              commit(updateOverlay(project, id, patch), { transient: true })
            }
            onAddOverlay={() => {
              const overlay = defaultOverlay(time, Math.min(duration, time + 3));
              commit(addOverlay(project, overlay));
              setSelection({ kind: "overlay", id: overlay.id });
              setTab("text");
            }}
          />
        </div>

        <aside className="hidden w-72 shrink-0 border-l border-line xl:block">
          {inspectorPanel}
        </aside>
      </div>

      {/* Height is pinned so the panels' own internal scrollers work — both
          are `h-full min-h-0 flex-col` and would collapse in an auto-height
          sheet. */}
      <BottomSheet
        open={mobilePanel === "library"}
        onOpenChange={(open) => setMobilePanel(open ? "library" : null)}
        title="Your library"
      >
        <div className="-mx-5 h-[60dvh]">{libraryPanel}</div>
      </BottomSheet>

      <BottomSheet
        open={mobilePanel === "inspector"}
        onOpenChange={(open) => setMobilePanel(open ? "inspector" : null)}
        title="Settings"
      >
        <div className="-mx-5 h-[60dvh]">{inspectorPanel}</div>
      </BottomSheet>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        project={project}
        duration={duration}
        videoFor={engine.videoFor}
        objectUrlFor={engine.objectUrlFor}
        onBeforeRender={pause}
      />

      <ProjectsModal
        open={projectsOpen}
        onOpenChange={setProjectsOpen}
        currentId={project.id}
        onOpen={(stored) => void openProject(stored)}
        onNew={startNew}
        onDelete={async (stored) => {
          const ok = await confirm({
            title: `Delete "${stored.name}"?`,
            description:
              "Only the edit is removed — the videos it was built from stay in your gallery. This can't be undone.",
            confirmLabel: "Delete",
            tone: "danger",
          });
          if (ok) deleteProject(stored.id);
          return ok;
        }}
      />
    </div>
  );
}

/* ----------------------------------------------------------- projects UI */

function ProjectsModal({
  open,
  onOpenChange,
  currentId,
  onOpen,
  onNew,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentId: string;
  onOpen: (project: Project) => void;
  onNew: () => void;
  onDelete: (project: Project) => Promise<boolean>;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Your edits"
      description="Saved in this browser. The videos they use live in your gallery."
    >
      {/* Mounted only while open so the list is read fresh every time. The
          store is written by autosave from outside this component, so a copy
          held across closes would show yesterday's clip counts. */}
      {open && (
        <ProjectList
          currentId={currentId}
          onOpen={onOpen}
          onNew={onNew}
          onDelete={onDelete}
        />
      )}
    </Modal>
  );
}

function ProjectList({
  currentId,
  onOpen,
  onNew,
  onDelete,
}: {
  currentId: string;
  onOpen: (project: Project) => void;
  onNew: () => void;
  onDelete: (project: Project) => Promise<boolean>;
}) {
  const [projects, setProjects] = useState<Project[]>(() => listProjects());

  return (
    <div className="space-y-2">
        <Button variant="secondary" className="w-full" onClick={onNew}>
          <Plus className="size-4" /> New edit
        </Button>

        {projects.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-muted">Nothing saved yet.</p>
        ) : (
          projects.map((stored) => (
            <div
              key={stored.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                stored.id === currentId ? "border-brand/40 bg-brand/5" : "border-line",
              )}
            >
              <button
                type="button"
                onClick={() => onOpen(stored)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-body-sm text-ink-soft">{stored.name}</p>
                <p className="text-caption text-muted">
                  {stored.clips.length} clip{stored.clips.length === 1 ? "" : "s"} ·{" "}
                  {formatTimecode(
                    stored.clips.reduce((sum, c) => sum + (c.out - c.in) / c.speed, 0),
                  )}{" "}
                  · {formatRelativeTime(stored.updatedAt)}
                </p>
              </button>

              {stored.id === currentId ? (
                <span className="shrink-0 text-caption text-brand">Open</span>
              ) : (
                <>
                  <ChevronLeft className="size-4 shrink-0 rotate-180 text-text-tertiary" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={async () => {
                      if (await onDelete(stored)) setProjects(listProjects());
                    }}
                    aria-label={`Delete ${stored.name}`}
                    className="shrink-0 rounded-md p-1 text-text-tertiary transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          ))
        )}
    </div>
  );
}
