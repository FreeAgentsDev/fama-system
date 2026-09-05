import { loadEnv } from "./load-env";
loadEnv();

import { runIraca } from "@scifamek-open-source/iraca/web-api";
import path from "node:path";
import { LiveFeedContract } from "./features/events/domain/live-feed.contract";
import { InMemoryLiveFeedContract } from "./features/events/infrastructure/in-memory-live-feed.contract";
import { attachIracaExplorer } from "./iraca-explorer";

async function main() {
  const { server, container, controllers, totalEndpoints } = await runIraca({
    dirname: path.resolve(__dirname, ".."),
    featureFolder: "src/features",
    iracaConfigPath: "iraca.config.json",
    showOutput: false,
    callback: (port) => {
      console.log(`Fama Boletería escuchando en http://localhost:${port}`);
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
    title: "Fama Boletería · explorador Iraca",
    intro:
      "Las rutas salen de httpRoutesTable. El contrato es meta.code (DomainEvent), no un status REST. " +
      "Útil para verificar con qué método HTTP quedó registrado cada usecase.",
    featureRoot: path.join(path.resolve(__dirname, ".."), "src/features"),
    streamPath: "/stream",
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
