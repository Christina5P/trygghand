export type NotificationLike = {
  type?: string | null;
  payload?: any;
};

const CANCELLATION_STATUS_LABELS: Record<string, string> = {
  pending: "Ny",
  processing: "P\u00e5g\u00e5ende",
  waiting_customer: "Avvaktar kund",
  completed: "Klar",
  cancelled: "Avslutad",
};

export const getNotificationDescription = (notification: NotificationLike): string => {
  if (!notification?.type) return "Ny notis.";

  switch (notification.type) {
    case "cancellation_status": {
      const status = notification.payload?.status;
      const label = status ? CANCELLATION_STATUS_LABELS[String(status)] : null;
      return label ? `Upps\u00e4gning uppdaterad till ${label}.` : "Upps\u00e4gning uppdaterad.";
    }
    case "key_receipt":
      return "Nyckelkvittens \u00e4r redo att signeras.";
    default:
      return "Ny notis.";
  }
};
