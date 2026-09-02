import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import { TicketNotFoundDomainEvent } from "../domain/event.events";
import { scanTicket } from "../domain/event.entity";
import { persistScan } from "./apply-scan";
import { ScanTicketParam, ScanTicketUsecase } from "./scan-ticket.usecase";
import { LiveFeedContract, announce } from "../domain/live-feed.contract";

export class ScanTicketUsecaseImpl extends ScanTicketUsecase {
  constructor(
    private eventContract: EventContract,
    private liveFeed: LiveFeedContract,
  ) {
    super();
  }

  async call(param: ScanTicketParam): Promise<DomainEvent> {
    const found = await this.eventContract.findByTicketCode(param?.code ?? "");
    if (!found) {
      return TicketNotFoundDomainEvent({ code: param?.code });
    }
    const result = scanTicket(found.event, param.code, param?.gate);
    return announce(
      this.liveFeed,
      await persistScan(this.eventContract, result, param?.code),
    );
  }
}
