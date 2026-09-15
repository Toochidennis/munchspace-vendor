export type PromotionType = "PERCENTAGE" | "FLAT_AMOUNT" | "FREE_DELIVERY";
export type PromotionStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED";

export type Promotion = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  type: PromotionType;
  target: "ORDER" | "ITEM";
  /** Naira for FLAT_AMOUNT, a plain percentage for PERCENTAGE. */
  value: number;
  status: PromotionStatus;
  startsAt: string;
  endsAt: string;
  maxRedemptions: number | null;
  maxRedemptionsPerUser: number | null;
  isAutoApply: boolean;
  condition: {
    minOrderAmount: number | null;
    maxOrderAmount: number | null;
    minItemQuantity: number | null;
    customerFirstOrder: boolean;
  } | null;
  menuItems: { menuItemId: string; name: string }[];
};
