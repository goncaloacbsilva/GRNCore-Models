import axios, { type AxiosInstance } from 'axios'

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])
const BIOMODELS_REQUEST_TIMEOUT_MS = 45000
const DEFAULT_RETRY_DELAY_MS = 1000

export type BiomodelsIdentifiersResponse =
    | string[]
    | {
          identifiers?: string[]
          models?: string[]
      }

export type BiomodelsSearchItem = {
    id?: string
    identifier?: string
    name?: string
    title?: string
    description?: string
    submissionDate?: string | number
    authors?: string[]
    submitter?: string
    publication?: {
        authors?: string[]
        title?: string
    }
    curation?: {
        created?: string | number
        modified?: string | number
    }
    created?: string | number
    lastModified?: string | number
}

type BiomodelsSearchResponse = {
    models?: BiomodelsSearchItem[]
    hits?: BiomodelsSearchItem[]
    matches?: BiomodelsSearchItem[]
}

export type BiomodelsModelDetails = {
    description?: string
}

export type FetchSbmlModelsPageOptions = {
    offset?: number
    numResults?: number
    query?: string
    sort?: string
}

export class BiomodelsApiClient {
    constructor(
        private readonly client: AxiosInstance = axios.create({
            baseURL: 'https://www.biomodels.org',
            timeout: BIOMODELS_REQUEST_TIMEOUT_MS,
        })
    ) {}

    async fetchIdentifiers(): Promise<string[]> {
        const response = await this.withRetries(() =>
            this.client.get<BiomodelsIdentifiersResponse>('/model/identifiers', {
                params: {
                    format: 'json',
                },
            })
        )

        const data = response.data
        if (Array.isArray(data)) {
            return data
        }

        return data.models ?? data.identifiers ?? []
    }

    async fetchAllSbmlModels(): Promise<BiomodelsSearchItem[]> {
        const pageSize = 100
        const models: BiomodelsSearchItem[] = []
        let offset = 0

        while (true) {
            const page = await this.fetchSbmlModelsPage({
                offset,
                numResults: pageSize,
            })
            models.push(...page)

            if (page.length < pageSize) {
                return models
            }

            offset += pageSize
        }
    }

    async fetchModelDetails(modelId: string): Promise<BiomodelsModelDetails> {
        const response = await this.withRetries(() =>
            this.client.get<BiomodelsModelDetails>(`/${modelId}`, {
                params: {
                    format: 'json',
                },
            })
        )

        return response.data
    }

    async fetchSbmlModelsPage(
        options: FetchSbmlModelsPageOptions = {}
    ): Promise<BiomodelsSearchItem[]> {
        const response = await this.withRetries(() =>
            this.client.get<BiomodelsSearchResponse>('/search', {
                params: {
                    query: options.query ?? '*:*',
                    sort: options.sort ?? 'publication_date-desc',
                    modelFormats: 'SBML',
                    offset: options.offset ?? 0,
                    numResults: options.numResults ?? 100,
                },
            })
        )

        return this.extractItems(response.data)
    }

    private extractItems(payload: BiomodelsSearchResponse): BiomodelsSearchItem[] {
        if (Array.isArray(payload.models)) {
            return payload.models
        }

        if (Array.isArray(payload.hits)) {
            return payload.hits
        }

        return payload.matches ?? []
    }

    private async withRetries<T>(operation: () => Promise<T>, retries = 5): Promise<T> {
        let attempt = 0

        while (true) {
            try {
                return await operation()
            } catch (error) {
                attempt += 1

                if (attempt >= retries || !isRetryableAxiosError(error)) {
                    throw error
                }

                await delay(getRetryDelayMs(error, attempt))
            }
        }
    }
}

function isRetryableAxiosError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
        return false
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        return true
    }

    return error.status !== undefined && RETRYABLE_STATUS_CODES.has(error.status)
}

function getRetryDelayMs(error: unknown, attempt: number): number {
    if (!axios.isAxiosError(error)) {
        return DEFAULT_RETRY_DELAY_MS * attempt
    }

    const retryAfterHeader = error.response?.headers['retry-after']
    const retryAfterMs = parseRetryAfterMs(retryAfterHeader)
    if (retryAfterMs !== undefined) {
        return retryAfterMs
    }

    return DEFAULT_RETRY_DELAY_MS * attempt
}

function parseRetryAfterMs(value: string | string[] | undefined): number | undefined {
    if (Array.isArray(value)) {
        return parseRetryAfterMs(value[0])
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
        return undefined
    }

    const asSeconds = Number(value)
    if (Number.isFinite(asSeconds)) {
        return Math.max(0, asSeconds * 1000)
    }

    const retryAt = Date.parse(value)
    if (Number.isNaN(retryAt)) {
        return undefined
    }

    return Math.max(0, retryAt - Date.now())
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
