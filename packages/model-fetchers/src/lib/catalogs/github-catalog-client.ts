import axios, { type AxiosInstance } from 'axios'

import { listSupportedSourceKeys, type SourceKey } from '../../../../../shared/source-registry.js'

const GITHUB_RAW_BASE_URL =
    'https://raw.githubusercontent.com/goncaloacbsilva/GRNCore-Models/main'

export type FetchedCatalogs = Record<SourceKey, unknown>

export class GithubCatalogClient {
    constructor(
        private readonly client: AxiosInstance = axios.create({
            baseURL: GITHUB_RAW_BASE_URL,
            timeout: 30000,
        })
    ) {}

    buildCatalogPath(source: SourceKey): string {
        return `/catalog/${source}.json`
    }

    async fetchCatalog(source: SourceKey): Promise<unknown> {
        const response = await this.client.get<unknown>(this.buildCatalogPath(source))
        return response.data
    }

    async fetchCatalogs(): Promise<FetchedCatalogs> {
        const supportedSources = listSupportedSourceKeys()
        const entries = await Promise.all(
            supportedSources.map(async (source) => {
                const catalog = await this.fetchCatalog(source)
                return [source, catalog] as const
            })
        )

        return Object.fromEntries(entries) as FetchedCatalogs
    }
}
