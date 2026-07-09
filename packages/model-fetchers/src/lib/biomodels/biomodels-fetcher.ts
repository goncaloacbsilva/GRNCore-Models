import { BiomodelsModelApiClient } from './api.js'
import type { FetchedModel, ModelFetcher } from '../../types.js'

export class BiomodelsModelFetcher implements ModelFetcher {
    readonly source = 'biomodels'

    constructor(
        private readonly apiClient: BiomodelsModelApiClient = new BiomodelsModelApiClient()
    ) {}

    async fetchModel(modelId: string): Promise<FetchedModel> {
        const metadata = await this.apiClient.fetchModelMetadata(modelId)
        const filename = metadata.files?.main?.name

        if (!filename) {
            throw new Error(`BioModels model ${modelId} does not expose files.main.name`)
        }

        const downloadedFile = await this.apiClient.downloadModelFile(modelId, filename)
        if (downloadedFile.content.byteLength === 0) {
            throw new Error(`BioModels model ${modelId} returned empty content`)
        }

        return {
            modelId,
            filename: downloadedFile.filename,
            content: downloadedFile.content,
            contentType: downloadedFile.contentType,
        }
    }
}

