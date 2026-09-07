/**
 * Stand-in for an item, store or order that has no picture.
 *
 * The API returns `StorageService.getUrl(key)`, which is null whenever the key
 * is missing, so a null image URL is ordinary data rather than an error. A bare
 * `<img>` rendered nothing for it; `next/image` throws on an empty src, so every
 * remote image needs a real string to fall back on.
 *
 * Menu.tsx pointed at "/images/placeholder.png", which is not in public/ — a
 * 404 for every item without a photo. This is the file that actually ships.
 */
export const IMAGE_FALLBACK = "/images/store-placeholder.png";
