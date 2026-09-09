import { Video, Image as ImageIcon, type LucideIcon } from "lucide-react";
import type { GenerationType } from "@/lib/constants";

// Each modality is its own route (/generate, /generate/image) rather than
// client-side tabs — mirrors ArtCraft's
// separate /create-video, /create-image pages, and makes each mode
// independently linkable/bookmarkable. Rendered by generate-workspace.tsx as
// the studio panel's underlined header tabs.
export const MODALITIES: {
  type: GenerationType;
  href: string;
  label: string;
  icon: LucideIcon;
  heroTitle: string;
  heroSubtitle: string;
}[] = [
  {
    type: "text-to-video",
    href: "/generate",
    label: "Video",
    icon: Video,
    heroTitle: "Create Video",
    heroSubtitle: "Describe a scene. See it in motion.",
  },
  {
    type: "text-to-image",
    href: "/generate/image",
    label: "Image",
    icon: ImageIcon,
    heroTitle: "Create Image",
    heroSubtitle: "Describe a scene. See it rendered.",
  },
];
