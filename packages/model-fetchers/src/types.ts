export type FetchedModel = {
  modelId: string;
  filename: string;
  content: Uint8Array;
  contentType?: string;
};

export type SupportedFetcherSource = "biomodels" | "ginsim";

export interface ModelFetcher {
  readonly source: SupportedFetcherSource;
  fetchModel(modelId: string): Promise<FetchedModel>;
  getModelSource(modelId: string): string | undefined;
}
