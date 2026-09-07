/**
 * The cards on the menu item create and edit screens.
 *
 * These are presentation only. The API asks for none of this ordering: on
 * `POST .../menu/items/compose` only `menuItem` is required, and `variants`,
 * `addons` and `discount` are all optional — on the update endpoint every one of
 * them is. The screens used to walk the vendor through the four in order and
 * only offer Save on the last, which meant editing one price cost three clicks
 * through cards that had nothing to say.
 */
export const MENU_SECTIONS = ["details", "sizes", "extras", "discounts"] as const;

export type MenuSection = (typeof MENU_SECTIONS)[number];

/** Which form fields live in which card, so an error can be traced to one. */
export const MENU_SECTION_FIELDS: Record<MenuSection, readonly string[]> = {
  details: [
    "name",
    "description",
    "image",
    "categoryTypeId",
    "sellingPrice",
    "quantityInStock",
    "isAvailable",
  ],
  sizes: ["variants"],
  extras: ["addons"],
  discounts: ["discount"],
};

/** Cards holding at least one error, in the order they appear on screen. */
export function sectionsWithErrors(
  errors: Record<string, unknown>,
): MenuSection[] {
  return MENU_SECTIONS.filter((section) =>
    MENU_SECTION_FIELDS[section].some((field) => field in errors),
  );
}

/** The first erroring field of a card, for moving focus to it. */
export function firstErrorField(
  section: MenuSection,
  errors: Record<string, unknown>,
): string | undefined {
  return MENU_SECTION_FIELDS[section].find((field) => field in errors);
}

export const MENU_SECTION_LABELS: Record<MenuSection, string> = {
  details: "Item Details",
  sizes: "Sizes",
  extras: "Extras",
  discounts: "Discounts",
};
