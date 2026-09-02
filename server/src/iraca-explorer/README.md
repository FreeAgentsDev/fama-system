/**
 * Explorador de casos de uso de Iraca (no Swagger/OpenAPI).
 *
 * En otro proyecto:
 *
 *   import { attachIracaExplorer } from "./iraca-explorer";
 *   const { server, controllers } = await runIraca({ ... });
 *   attachIracaExplorer(server, controllers, {
 *     featureRoot: path.join(dirname, "src/features"),
 *   });
 *
 * - Las rutas salen de controller.httpRoutesTable
 * - Los DomainEvent se infieren de *.usecase-impl.ts (llamadas FooDomainEvent())
 * - El JSON de ejemplo se infiere de export interface *Param
 * - `enrichment` es opcional y es del bounded context, no del framework
 *
 * Candidato a @scifamek-open-source/iraca/web-api (junto al SwaggerApiDoc incompleto).
 */
export { attachIracaExplorer } from "./attach";
