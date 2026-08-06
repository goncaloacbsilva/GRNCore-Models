import axios, { type AxiosInstance } from 'axios'

const GINSIM_RAW_BASE_URL =
    'https://raw.githubusercontent.com/GINsim/GINsim.github.io/master'

export type DownloadedGinsimFile = {
    content: Uint8Array
    contentType?: string
    filename: string
}

export class GinsimModelApiClient {
    constructor(
        private readonly client: AxiosInstance = axios.create({
            baseURL: GINSIM_RAW_BASE_URL,
            timeout: 30000,
        })
    ) {}

    async downloadModelFile(sourcePath: string): Promise<DownloadedGinsimFile> {
        const response = await this.client.get<ArrayBuffer>(`/${sourcePath}`, {
            responseType: 'arraybuffer',
        })

        return {
            filename: sourcePath.split('/').at(-1) ?? sourcePath,
            content: new Uint8Array(response.data),
            contentType:
                typeof response.headers['content-type'] === 'string'
                    ? response.headers['content-type']
                    : undefined,
        }
    }
}
