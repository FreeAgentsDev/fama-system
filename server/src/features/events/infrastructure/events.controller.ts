import { IracaController } from "@scifamek-open-source/iraca/web-api";

export class EventsController extends IracaController {
  configureEndpoints(): void {
    this.configureEndpointsByPattern(/Usecase$/, {
      methodMapper: [
        {
          method: "post",
          // Anclados al inicio (^) a propósito: sin el ancla, /Publish/ también hace match con
          // ListPublishedEventsUsecase ("Published" contiene "Publish") y ese endpoint quedaría
          // registrado como POST, devolviendo 404 al GET que hace el front.
          patterns: [
            /^Create/,
            /^Reserve/,
            /^CheckIn/,
            /^Scan/,
            /^Void/,
            /^Confirm/,
            /^Issue/,
            /^Hide/,
            /^Publish/,
            /^Update/,
          ],
        },
        { method: "get", patterns: [/^Get/, /^List/] },
      ],
    });
  }
}
