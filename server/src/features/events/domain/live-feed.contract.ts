import { DomainEvent } from "@scifamek-open-source/iraca/domain";

export abstract class LiveFeedContract {
  abstract publish(event: DomainEvent): Promise<void>;
}

export async function announce(
  feed: LiveFeedContract,
  event: DomainEvent,
): Promise<DomainEvent> {
  await feed.publish(event);
  return event;
}
