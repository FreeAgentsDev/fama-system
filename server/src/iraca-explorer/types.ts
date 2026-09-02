export interface EndpointDoc {
  module: string;
  usecase: string;
  method: string;
  path: string;
  sample: Record<string, unknown> | null;
  events: string[];
  note: string;
}

export interface UsecaseEnrichment {
  sample?: Record<string, unknown> | null;
  events?: string[];
  note?: string;
}

export interface ExplorerOptions {
  title?: string;
  intro?: string;
  featureRoot?: string;
  enrichment?: Record<string, UsecaseEnrichment>;
  streamPath?: string | null;
}
