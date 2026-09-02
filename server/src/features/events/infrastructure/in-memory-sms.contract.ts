import { SmsContract, SmsMessage } from "../domain/sms.contract";

export class InMemorySmsContract extends SmsContract {
  private readonly messages: SmsMessage[] = [];

  async send(
    message: Omit<SmsMessage, "id" | "sentAt">,
  ): Promise<SmsMessage> {
    const stored: SmsMessage = {
      ...message,
      id: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
    };
    this.messages.unshift(stored);
    console.log(
      `[SMS simulado] → ${stored.phone}: ${stored.body}`,
    );
    return stored;
  }

  async list(): Promise<SmsMessage[]> {
    return this.messages.map((item) => ({ ...item }));
  }
}
