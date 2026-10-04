/**
 * Shared pickup-spot list + persistence for the hero search widget.
 *
 * The hero "Pickup Location" field writes here; BikeDetails forwards it to
 * Checkout, which stores it on the Booking document (`pickupLocation`).
 * localStorage is the bridge because Home → BikeDetails → Checkout are
 * separate navigations and the location must survive a login redirect.
 */

export const PICKUP_SPOTS: string[] = [
  'Laboni Beach',
  'Marine Drive',
  'Inani Beach',
  'Himchari',
  'Kolatoli',
  'Sea Beach',
];

/**
 * Real Cox's Bazar positions for each pickup spot, keyed by name.
 *
 * These are **not** display offsets. The teaser map used to nudge hand-written
 * coordinates apart so the pins would not overlap at zoom 10, and every one of
 * them ended up rendering in the Bay of Bengal. Each pair here was checked
 * against the OSM land polygons at zoom 16 and sits on the beach, the coastal
 * strip or the Himchari hills. Re-verify before changing them:
 *
 *   https://tile.openstreetmap.org/{z}/{x}/{y}.png  — water is #aad3df
 *
 * (x, y from the Web-Mercator formula; sample the pixel under the pin.)
 */
export const PICKUP_SPOT_COORDS: Record<string, [number, number]> = {
  'Laboni Beach': [21.4243, 91.9743],
  'Marine Drive': [21.32, 92.04],
  'Inani Beach': [21.18, 92.06],
  'Himchari': [21.3569, 92.0245],
  'Kolatoli': [21.41, 91.99],
  'Sea Beach': [21.4505, 91.9548],
};

const STORAGE_KEY = 'rbc_pickup_location';

export function getSavedPickupLocation(): string {
  try {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function savePickupLocation(spot: string): void {
  try {
    if (typeof window === 'undefined') return;
    if (spot) localStorage.setItem(STORAGE_KEY, spot);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode) — location just won't persist
  }
}

export function clearPickupLocation(): void {
  savePickupLocation('');
}
