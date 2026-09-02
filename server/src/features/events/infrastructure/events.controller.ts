import { IracaController } from "@scifamek-open-source/iraca/web-api";

export class EventsController extends IracaController {
  configureEndpoints(): void {
    this.configureEndpointsByPattern(/Usecase$/, {
      methodMapper: [
        {
          method: "post",
          patterns: [
            /Create/,
            /Reserve/,
            /CheckIn/,
            /Scan/,
            /Void/,
            /Confirm/,
            /Issue/,
            /Hide/,
            /Publish/,
          ],
        },
        { method: "get", patterns: [/Get/, /List/] },
      ],
    });
  }
}
