import { decodeGinsimModelId } from "../../../../../shared/ginsim-model-id.js";
import type { FetchedModel, ModelFetcher } from "../../types.js";
import { GinsimModelApiClient } from "./api.js";

export class GinsimModelFetcher implements ModelFetcher {
  readonly source = "ginsim";

  constructor(
    private readonly apiClient: GinsimModelApiClient = new GinsimModelApiClient(),
  ) {}

  async fetchModel(modelId: string): Promise<FetchedModel> {
    const sourcePath = decodeGinsimModelId(modelId);
    const downloadedFile = await this.apiClient.downloadModelFile(sourcePath);

    if (downloadedFile.content.byteLength === 0) {
      throw new Error(`GINsim model ${modelId} returned empty content`);
    }

    return {
      modelId,
      filename: downloadedFile.filename,
      content: downloadedFile.content,
      contentType: downloadedFile.contentType,
    };
  }

  getModelSource(modelId: string): string | undefined {
    try {
      let sourcePath = this.decodeBase64Url(modelId);
      return `https://ginsim.github.io/${sourcePath
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/")}`;
    } catch {
      return undefined;
    }
  }

  private decodeBase64Url(value: string): string {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const binary = atob(paddedBase64);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );

    return new TextDecoder().decode(bytes);
  }
}
