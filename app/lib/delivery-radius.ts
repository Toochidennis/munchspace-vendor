// Kept in step with the API, which rejects anything outside this range.
export const MIN_DELIVERY_RADIUS_KM = 10;
export const MAX_DELIVERY_RADIUS_KM = 100;

export function deliveryRadiusError(km: number): string | null {
  if (!Number.isInteger(km)) return "Enter a whole number of kilometres.";
  if (km < MIN_DELIVERY_RADIUS_KM)
    return `Delivery range must be at least ${MIN_DELIVERY_RADIUS_KM}km.`;
  if (km > MAX_DELIVERY_RADIUS_KM)
    return `Delivery range cannot be more than ${MAX_DELIVERY_RADIUS_KM}km.`;
  return null;
}
