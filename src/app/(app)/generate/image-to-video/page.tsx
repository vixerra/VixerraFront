import { redirect } from "next/navigation";

// Image to Video was merged into the main Video composer (start/end frame
// tiles handle the same use case) — keep this route alive as a redirect
// rather than a 404 for any old bookmarks/links.
export default function ImageToVideoPage() {
  redirect("/generate");
}
