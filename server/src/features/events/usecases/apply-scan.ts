import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { EventContract } from "../domain/event.contract";
import {
  TicketAdmittedDomainEvent,
  TicketExitedDomainEvent,
  TicketNotFoundDomainEvent,
  TicketVoidedDomainEvent,
} from "../domain/event.events";
import { ScanTicketResult, toPublicEvent } from "../domain/event.entity";

export async function persistScan(
  eventContract: EventContract,
  result: ScanTicketResult,
  code?: string,
): Promise<DomainEvent> {
  if (!result.ok) {
    if (result.reason === "voided" && result.event && result.ticket) {
      const saved = await eventContract.save(result.event);
      const ticket = saved.tickets.find((item) => item.id === result.ticket!.id)!;
      return TicketVoidedDomainEvent({
        event: toPublicEvent(saved),
        ticket,
      });
    }
    return TicketNotFoundDomainEvent({ code });
  }

  const saved = await eventContract.save(result.event);
  const ticket = saved.tickets.find((item) => item.id === result.ticket.id)!;
  const payload = {
    event: toPublicEvent(saved),
    ticket,
    scan: result.scan,
  };
  if (result.outcome === "admitted") {
    return TicketAdmittedDomainEvent(payload);
  }
  return TicketExitedDomainEvent(payload);
}
