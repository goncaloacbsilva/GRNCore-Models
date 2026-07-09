import axios, { type AxiosInstance } from 'axios'

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
            timeout: 30000,
        })
    ) {}

    async fetchIdentifiers(): Promise<string[]> {
        const response = await this.client.get<BiomodelsIdentifiersResponse>(
            '/model/identifiers',
            {
                params: {
                    format: 'json',
                },
            }
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

    async fetchSbmlModelsPage(
        options: FetchSbmlModelsPageOptions = {}
    ): Promise<BiomodelsSearchItem[]> {
        const response = await this.client.get<BiomodelsSearchResponse>('/search', {
            params: {
                query: options.query ?? '*:*',
                sort: options.sort ?? 'publication_date-desc',
                modelFormats: 'SBML',
                offset: options.offset ?? 0,
                numResults: options.numResults ?? 100,
            },
        })

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
}
