import { IncomingMessage, ServerResponse } from "node:http";
import { DomainEvent } from "@scifamek-open-source/iraca/domain";
import { LiveFeedContract } from "../domain/live-feed.contract";

export class InMemoryLiveFeedContract extends LiveFeedContract {
  private readonly clients = new Set<ServerResponse>();

  async publish(event: DomainEvent): Promise<void> {
    const body = JSON.stringify({
      name: event.eventName,
      payload: event.payload,
    });
    const chunk = `event: domain\ndata: ${body}\n\n`;
    for (const client of this.clients) {
      client.write(chunk);
    }
  }

  subscribe(request: IncomingMessage, response: ServerResponse): void {
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders?.();
    response.write(": connected\n\n");

    this.clients.add(response);
    const beat = setInterval(() => {
      response.write(": ping\n\n");
    }, 15000);

    const leave = () => {
      clearInterval(beat);
      this.clients.delete(response);
    };
    request.on("close", leave);
    request.on("error", leave);
  }
}
