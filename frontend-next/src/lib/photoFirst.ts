/**
 * Storefront ordering helpers.
 *
 * A vehicle with no uploaded photo is still a valid listing, but it must never
 * be the first thing a visitor sees: the hero slideshow leads with a real photo
 * and the grid sorts photo-less listings to the end (they keep their "Photo
 * coming soon" tile, they are just not the headline).
 */

interface HasImages {
  images?: string[];
}

export function hasPhoto(bike: HasImages): boolean {
  return (bike.images?.length ?? 0) > 0;
}

/** Bikes the hero carousel may show — every one of them can render a photo. */
export function pickHeroBikes<T extends HasImages>(bikes: T[]): T[] {
  const withPhoto = bikes.filter(hasPhoto);
  // Catalogue with no photos at all: keep the carousel alive and let the tile
  // explain the gap rather than showing an empty hero.
  return withPhoto.length > 0 ? withPhoto : bikes;
}

/** Grid order: photo'd vehicles first, photo-less ones still listed, last. */
export function orderPhotoFirst<T extends HasImages>(bikes: T[]): T[] {
  const withPhoto = bikes.filter(hasPhoto);
  if (withPhoto.length === 0) return bikes;
  return [...withPhoto, ...bikes.filter(bike => !hasPhoto(bike))];
}
