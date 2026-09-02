import { runIraca } from "@scifamek-open-source/iraca/web-api";
import path from "node:path";
import { LiveFeedContract } from "./features/events/domain/live-feed.contract";
import { InMemoryLiveFeedContract } from "./features/events/infrastructure/in-memory-live-feed.contract";
import { attachIracaExplorer } from "./iraca-explorer";
import { tiqueteraExplorerEnrichment } from "./docs/tiquetera.enrichment";

async function main() {
  const { server, container, controllers, totalEndpoints } = await runIraca({
    dirname: path.resolve(__dirname, ".."),
    featureFolder: "src/features",
    iracaConfigPath: "iraca.config.json",
    showOutput: false,
    callback: (port) => {
      console.log(`Tiquetera escuchando en http://localhost:${port}`);
      console.log(`Explorador Iraca: http://localhost:${port}/docs`);
    },
  });
  console.log(`Endpoints: ${totalEndpoints}`);

  server.cors({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });

  const liveFeed = (await container.getInstance(
    LiveFeedContract,
  )) as InMemoryLiveFeedContract;
  server.request("get", "/stream", (request, response) => {
    liveFeed.subscribe(request, response);
  });
  attachIracaExplorer(server, controllers, {
    title: "Tiquetera · explorador Iraca",
    intro:
      "Las rutas salen de httpRoutesTable. El contrato es meta.code (DomainEvent). El catálogo de ejemplos es de Tiquetera; el motor es genérico.",
    featureRoot: path.join(path.resolve(__dirname, ".."), "src/features"),
    enrichment: tiqueteraExplorerEnrichment,
    streamPath: "/stream",
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
