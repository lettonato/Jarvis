// Was JARVIS aus dem Postfach anzeigt. Gelesen wird nur der Posteingang der letzten 14 Tage.

export type MailItem = {
  uid: number;
  from: string;
  fromAddress: string;
  subject: string;
  date: string;
  unread: boolean;
  flagged: boolean;
  // Wichtig heißt: markiert, oder ungelesen und weder Newsletter noch automatische Nachricht.
  important: boolean;
  bulk: boolean;
  messageId?: string;
};

export type MailSnapshot = {
  configured: boolean;
  account?: string;
  fetchedAt: string;
  unread: number;
  importantUnread: number;
  bulkUnread: number;
  items: MailItem[];
  error?: string;
};

export type MailMessage = { uid: number; from: string; subject: string; date: string; text: string };

export const importantMails = (snap: MailSnapshot | null) => (snap?.items ?? []).filter((m) => m.important);
