export interface SmsMessage {
  id: string;
  eventId: string;
  ticketId: string;
  phone: string;
  body: string;
  sentAt: string;
}

export abstract class SmsContract {
  abstract send(message: Omit<SmsMessage, "id" | "sentAt">): Promise<SmsMessage>;
  abstract list(): Promise<SmsMessage[]>;
}
