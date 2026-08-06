import { decodeGinsimModelId } from '../../../../../shared/ginsim-model-id.js'
import type { FetchedModel, ModelFetcher } from '../../types.js'
import { GinsimModelApiClient } from './api.js'

export class GinsimModelFetcher implements ModelFetcher {
    readonly source = 'ginsim'

    constructor(
        private readonly apiClient: GinsimModelApiClient = new GinsimModelApiClient()
    ) {}

    async fetchModel(modelId: string): Promise<FetchedModel> {
        const sourcePath = decodeGinsimModelId(modelId)
        const downloadedFile = await this.apiClient.downloadModelFile(sourcePath)

        if (downloadedFile.content.byteLength === 0) {
            throw new Error(`GINsim model ${modelId} returned empty content`)
        }

        return {
            modelId,
            filename: downloadedFile.filename,
            content: downloadedFile.content,
            contentType: downloadedFile.contentType,
        }
    }
}
