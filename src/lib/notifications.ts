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

const CASE_STATUS_LABELS: Record<string, string> = {
  pending: "Väntar",
  in_progress: "Pågår",
  completed: "Klar",
  cancelled: "Avbruten",
};

export const getNotificationDescription = (notification: NotificationLike): string => {
  if (!notification?.type) return "Ny notis.";

  switch (notification.type) {
    case "case_message":
      return "Nytt meddelande i ett ärende.";
    case "cancellation_message":
      return "Nytt meddelande i en uppsägning.";
    case "case_status": {
      const status = notification.payload?.status;
      const label = status ? CASE_STATUS_LABELS[String(status)] : null;
      return label ? `Ärendestatus uppdaterad till ${label}.` : "Ärendestatus uppdaterad.";
    }
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
