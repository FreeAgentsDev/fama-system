import { IncomingMessage, ServerResponse } from "node:http";
import { IracaController, IracaServer } from "@scifamek-open-source/iraca/web-api";
import { buildEndpointCatalog } from "./build-catalog";
import { renderExplorerPage } from "./explorer-page";
import { ExplorerOptions } from "./types";

export function attachIracaExplorer(
  server: IracaServer,
  controllers: IracaController[],
  options: ExplorerOptions = {},
): void {
  const endpoints = buildEndpointCatalog(controllers, options);
  const title = options.title ?? "Explorador Iraca";
  const intro =
    options.intro ??
    "Las rutas salen de httpRoutesTable. El contrato es meta.code (un DomainEvent), no un status REST.";
  const html = renderExplorerPage({
    title,
    intro,
    endpoints,
    streamPath: options.streamPath ?? null,
  });

  server.request("get", "/docs", (_request: IncomingMessage, response: ServerResponse) => {
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(html);
  });

  server.request("get", "/docs.json", (_request: IncomingMessage, response: ServerResponse) => {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify(
        {
          idea: "No es OpenAPI. Cada fila es un Usecase que Iraca mapeó a HTTP.",
          stream: options.streamPath ?? null,
          endpoints,
        },
        null,
        2,
      ),
    );
  });
}
