/** What a vendor should read, rather than the enum the API sends. */
const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_EXPIRED: "Payment expired",
  SCHEDULED: "Scheduled",
  PENDING_CONFIRMATION: "Awaiting your confirmation",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  RETURNED: "Returned",
};

export function orderStatusLabel(status: string | null | undefined) {
  if (!status) return "—";

  const key = status.toUpperCase();
  if (ORDER_STATUS_LABELS[key]) return ORDER_STATUS_LABELS[key];

  // Anything the API adds later reads as words rather than shouting.
  const words = key.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
