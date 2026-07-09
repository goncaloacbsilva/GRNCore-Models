import {
    listSupportedSourceKeys,
    type SourceKey,
} from '../../../shared/source-registry.js'
import { BiomodelsModelFetcher } from './lib/biomodels/biomodels-fetcher.js'
import {
    GithubCatalogClient,
    type FetchedCatalogs,
} from './lib/catalogs/github-catalog-client.js'
import type { FetchedModel, ModelFetcher } from './types.js'

const MODEL_FETCHERS: Record<SourceKey, () => ModelFetcher> = {
    biomodels: () => new BiomodelsModelFetcher(),
}

export { BiomodelsModelFetcher }
export type { FetchedCatalogs, FetchedModel, ModelFetcher }

export function listSupportedSources(): SourceKey[] {
    return listSupportedSourceKeys()
}

export function getModelFetcher(source: SourceKey): ModelFetcher {
    const factory = MODEL_FETCHERS[source]
    if (!factory) {
        throw new Error(`No model fetcher registered for source: ${source}`)
    }

    return factory()
}

export async function fetchCatalogs(): Promise<FetchedCatalogs> {
    const client = new GithubCatalogClient()
    return client.fetchCatalogs()
}

export const REGISTERED_MODEL_FETCHER_SOURCES = Object.keys(
    MODEL_FETCHERS
) as SourceKey[]
