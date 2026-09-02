import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { GottenSmsOutboxDomainEvent } from "../domain/event.events";
import { SmsContract } from "../domain/sms.contract";
import { ListSmsOutboxUsecase } from "./list-sms-outbox.usecase";

export class ListSmsOutboxUsecaseImpl extends ListSmsOutboxUsecase {
  constructor(private smsContract: SmsContract) {
    super();
  }

  async call(): Promise<DomainEvent> {
    const messages = await this.smsContract.list();
    return GottenSmsOutboxDomainEvent(messages);
  }
}
