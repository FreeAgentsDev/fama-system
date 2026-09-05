import { IracaController } from "@scifamek-open-source/iraca/web-api";
import { inferUsecaseDocs } from "./infer";
import {
  EndpointDoc,
  ExplorerOptions,
  UsecaseEnrichment,
} from "./types";

export function buildEndpointCatalog(
  controllers: IracaController[],
  options: ExplorerOptions = {},
): EndpointDoc[] {
  const rows: EndpointDoc[] = [];
  for (const controller of controllers) {
    for (const [slug, config] of controller.httpRoutesTable.entries()) {
      const usecase = config.dependencyId;
      const inferred = options.featureRoot
        ? inferUsecaseDocs(options.featureRoot, controller.prefix, usecase)
        : { events: [] as string[], sample: null as Record<string, unknown> | null };
      const extra: UsecaseEnrichment = options.enrichment?.[usecase] ?? {};
      rows.push({
        module: controller.prefix,
        usecase,
        method: config.method.toUpperCase(),
        path: `/${controller.prefix}/${slug}`,
        sample:
          extra.sample !== undefined ? extra.sample : inferred.sample,
        events: extra.events ?? inferred.events,
        note:
          extra.note ??
          "Descubierto por Iraca a partir del Usecase. El resultado es un DomainEvent.",
      });
    }
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}
