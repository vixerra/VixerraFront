"use client";

import { useState } from "react";
import { useToggleLike } from "@/hooks/use-generation-likes";
import { GenerationCard, type GalleryItem } from "./generation-card";
import { PreviewModal, type PreviewAuthor } from "./preview-modal";

export function GalleryGrid({
  items,
  author,
  viewerIsOwner = false,
  showAuthor = false,
  onDelete,
  onDuplicate,
  onAddToCollection,
  onRemoveFromCollection,
  onTogglePublic,
}: {
  items: GalleryItem[];
  /** Who made these. The public gallery has no author data, and guessing
   *  "you" there would credit the wrong person, so it passes nothing. */
  author?: PreviewAuthor;
  /** True on the owner's own surfaces (my gallery, dashboard, own
   *  collections). Switches the preview's header from a byline to the
   *  creator's own view — see PreviewBody. */
  viewerIsOwner?: boolean;
  /** Credits each generation's creator on the tile — the public feed and
   *  shared collections. */
  showAuthor?: boolean;
  /** May resolve false to say the user cancelled, which keeps the preview
   *  panel open instead of closing it over a delete that never happened. */
  onDelete?: (id: string) => void | Promise<boolean | void>;
  onDuplicate?: (id: string) => void;
  onAddToCollection?: (id: string) => void;
  onRemoveFromCollection?: (id: string) => void;
  onTogglePublic?: (id: string) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openItem = openIndex === null ? null : items[openIndex];
  // Deliberately not gated on a "who am I" query: that query is still in
  // flight on first paint, so a click landing before it resolved was
  // treated as signed-out and dropped — the like never fired and nothing
  // on screen changed. The server already answers this question, and its
  // 401 drives the sign-in prompt (see useToggleLike).
  const toggleLike = useToggleLike();

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item, i) => (
          <GenerationCard
            key={item.id}
            item={item}
            onOpen={() => setOpenIndex(i)}
            showAuthor={showAuthor}
            onToggleLike={() => toggleLike.mutate({ item })}
          />
        ))}
      </div>
      <PreviewModal
        items={items}
        index={openIndex}
        author={author}
        viewerIsOwner={viewerIsOwner}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
        onDelete={onDelete && openItem ? () => onDelete(openItem.id) : undefined}
        onDuplicate={onDuplicate && openItem ? () => onDuplicate(openItem.id) : undefined}
        onAddToCollection={
          onAddToCollection && openItem ? () => onAddToCollection(openItem.id) : undefined
        }
        onRemoveFromCollection={
          onRemoveFromCollection && openItem
            ? () => onRemoveFromCollection(openItem.id)
            : undefined
        }
        onTogglePublic={onTogglePublic && openItem ? () => onTogglePublic(openItem.id) : undefined}
      />
    </>
  );
}
