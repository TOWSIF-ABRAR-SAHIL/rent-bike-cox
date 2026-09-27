/**
 * Shared pickup-spot list + persistence for the hero search widget.
 *
 * The hero "Pickup Location" field writes here; BikeDetails forwards it to
 * Checkout, which stores it on the Booking document (`pickupLocation`).
 * localStorage is the bridge because Home → BikeDetails → Checkout are
 * separate navigations and the location must survive a login redirect.
 */

export const PICKUP_SPOTS = [
  'Laboni Beach',
  'Marine Drive',
  'Inani Beach',
  'Himchari',
  'Kolatoli',
  'Sea Beach',
];

const STORAGE_KEY = 'rbc_pickup_location';

export function getSavedPickupLocation() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function savePickupLocation(spot) {
  try {
    if (spot) localStorage.setItem(STORAGE_KEY, spot);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode) — location just won't persist
  }
}

export function clearPickupLocation() {
  savePickupLocation('');
}
