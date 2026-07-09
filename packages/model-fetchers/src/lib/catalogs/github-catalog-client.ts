import axios, { type AxiosInstance } from 'axios'

import { listSupportedSourceKeys, type SourceKey } from '../../../../../shared/source-registry.js'

const GITHUB_RAW_BASE_URL =
    'https://raw.githubusercontent.com/goncaloacbsilva/GRNCore-Models/main'
const GITHUB_API_BASE_URL =
    'https://api.github.com/repos/goncaloacbsilva/GRNCore-Models'

export type FetchedCatalogs = Record<SourceKey, unknown>
type GithubCommitResponse = Array<{
    sha?: string
}>

export class GithubCatalogClient {
    constructor(
        private readonly rawClient: AxiosInstance = axios.create({
            baseURL: GITHUB_RAW_BASE_URL,
            timeout: 30000,
        }),
        private readonly apiClient: AxiosInstance = axios.create({
            baseURL: GITHUB_API_BASE_URL,
            timeout: 30000,
        })
    ) {}

    buildCatalogPath(source: SourceKey): string {
        return `/catalog/${source}.json`
    }

    buildCatalogVersionPath(): string {
        return '/commits'
    }

    async fetchCatalog(source: SourceKey): Promise<unknown> {
        const response = await this.rawClient.get<unknown>(this.buildCatalogPath(source))
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

    async getCatalogVersion(): Promise<string> {
        const response = await this.apiClient.get<GithubCommitResponse>(
            this.buildCatalogVersionPath(),
            {
                params: {
                    path: 'catalog',
                    per_page: 1,
                },
            }
        )

        const sha = response.data[0]?.sha
        if (!sha) {
            throw new Error('Could not resolve catalog version from GitHub commits API')
        }

        return sha
    }
}
