import axios, { type AxiosInstance } from 'axios'

export type BiomodelsModelDetailsResponse = {
    files?: {
        main?: {
            name?: string
        }
    }
}

export type DownloadedBiomodelFile = {
    content: Uint8Array
    contentType?: string
    filename: string
}

export class BiomodelsModelApiClient {
    constructor(
        private readonly client: AxiosInstance = axios.create({
            baseURL: 'https://www.biomodels.org',
            timeout: 30000,
        })
    ) {}

    async fetchModelMetadata(modelId: string): Promise<BiomodelsModelDetailsResponse> {
        const response = await this.client.get<BiomodelsModelDetailsResponse>(
            `/${modelId}`,
            {
                params: {
                    format: 'json',
                },
            }
        )

        return response.data
    }

    async downloadModelFile(
        modelId: string,
        filename: string
    ): Promise<DownloadedBiomodelFile> {
        const response = await this.client.get<ArrayBuffer>(
            `/model/download/${modelId}`,
            {
                params: {
                    filename,
                },
                responseType: 'arraybuffer',
            }
        )

        return {
            filename,
            content: new Uint8Array(response.data),
            contentType:
                typeof response.headers['content-type'] === 'string'
                    ? response.headers['content-type']
                    : undefined,
        }
    }
}
