import type { GalleryColumns } from "@/lib/videos/gallery-settings"

/** Tailwind grid classes for poster / admin card density (matches videos gallery). */
export function galleryColumnsGridClass(
  columns: GalleryColumns,
  gapClass = "gap-3",
): string {
  const base = `grid grid-cols-2 ${gapClass}`
  switch (columns) {
    case 6:
      return `${base} sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`
    case 5:
      return `${base} sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
    case 4:
      return `${base} md:grid-cols-3 lg:grid-cols-4`
    case 3:
      return `${base} md:grid-cols-3`
    case 2:
    default:
      return base
  }
}
