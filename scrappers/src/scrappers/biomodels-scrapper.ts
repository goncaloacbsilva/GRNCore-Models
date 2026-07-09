import { BiomodelsCatalogSchema, type BiomodelsCatalog } from '../lib/schema/biomodels-catalog.js'
import type { ModelMetadata } from '../lib/schema/model-metadata.js'
import { AbstractCatalogScrapper } from '../lib/catalog/abstract-catalog-scrapper.js'
import { BiomodelsApiClient, type BiomodelsSearchItem } from '../lib/biomodels/api.js'
import { mapBiomodelsEntryToMetadata } from '../lib/biomodels/mapper.js'

export class BiomodelsScrapper extends AbstractCatalogScrapper<BiomodelsCatalog> {
    private static readonly DETAILS_CONCURRENCY = 4
    private static readonly DETAILS_REQUEST_INTERVAL_MS = 150

    constructor(
        catalogDirectory: string,
        private readonly apiClient: BiomodelsApiClient = new BiomodelsApiClient()
    ) {
        super(catalogDirectory, 'biomodels')
    }

    protected createEmptyCatalog(): BiomodelsCatalog {
        return {
            models: [],
            filteredOut: [],
        }
    }

    protected parseCatalog(raw: string): BiomodelsCatalog {
        return BiomodelsCatalogSchema.parse(JSON.parse(raw))
    }

    protected async fetchUnsynced(catalog: BiomodelsCatalog): Promise<string[]> {
        this.log('fetching BioModels identifier list')
        const remoteIds = new Set(await this.apiClient.fetchIdentifiers())
        const catalogIds = new Set(catalog.models.map((model) => model.id))
        const filteredOutIds = new Set(catalog.filteredOut)
        const incompleteIds = catalog.models
            .filter((model) => model.description.trim().length === 0)
            .map((model) => model.id)

        const unsyncedIds = [...remoteIds].filter(
            (id) => !catalogIds.has(id) && !filteredOutIds.has(id)
        )
        const repairIds = incompleteIds.filter(
            (id) => remoteIds.has(id) && !filteredOutIds.has(id)
        )

        this.log(
            `fetched ${remoteIds.size} identifiers, ${catalogIds.size} already cataloged, ${filteredOutIds.size} filtered out, ${repairIds.length} incomplete`
        )

        return [...new Set([...unsyncedIds, ...repairIds])]
    }

    protected async sync(
        ids: string[],
        catalog: BiomodelsCatalog
    ): Promise<BiomodelsCatalog> {
        const requestedIds = new Set(ids)
        const filteredOutIds = new Set(catalog.filteredOut)
        this.log(`syncing ${requestedIds.size} BioModels model(s)`)
        const discoveredModels = await this.apiClient.fetchAllSbmlModels()
        this.log(`fetched ${discoveredModels.length} SBML model record(s) from search`)

        const syncedModels = new Map(catalog.models.map((model) => [model.id, model]))
        const seenRequestedIds = new Set<string>()
        const candidateModels = discoveredModels.filter((remoteModel) => {
            const remoteId = getRemoteId(remoteModel)
            if (!remoteId || !requestedIds.has(remoteId)) {
                return false
            }

            seenRequestedIds.add(remoteId)
            return true
        })

        let completed = 0
        const scheduleDetailRequest = createRateLimiter(
            BiomodelsScrapper.DETAILS_REQUEST_INTERVAL_MS
        )
        const mappedModels = await mapWithConcurrency(
            candidateModels,
            BiomodelsScrapper.DETAILS_CONCURRENCY,
            async (remoteModel) => {
                const remoteId = getRemoteId(remoteModel)
                if (!remoteId) {
                    return null
                }

                await scheduleDetailRequest()
                const details = await this.apiClient.fetchModelDetails(remoteId)
                completed += 1
                if (
                    completed === 1 ||
                    completed === candidateModels.length ||
                    completed % 100 === 0
                ) {
                    this.log(
                        `fetched details for ${completed}/${candidateModels.length} requested model(s)`
                    )
                }

                return {
                    remoteId,
                    mapped: mapBiomodelsEntryToMetadata(remoteModel, details),
                }
            }
        )

        for (const mappedModel of mappedModels) {
            if (!mappedModel) {
                continue
            }

            if (mappedModel.mapped === null) {
                filteredOutIds.add(mappedModel.remoteId)
                continue
            }

            syncedModels.set(mappedModel.mapped.id, mappedModel.mapped)
        }

        for (const requestedId of requestedIds) {
            if (!seenRequestedIds.has(requestedId)) {
                filteredOutIds.add(requestedId)
            }
        }

        this.log(
            `catalog now contains ${syncedModels.size} model(s) and ${filteredOutIds.size} filtered-out id(s)`
        )

        return {
            models: [...syncedModels.values()],
            filteredOut: [...filteredOutIds].sort(),
        }
    }
}

function getRemoteId(model: BiomodelsSearchItem): string | undefined {
    return model.id ?? model.identifier
}

async function mapWithConcurrency<TItem, TResult>(
    items: TItem[],
    concurrency: number,
    mapper: (item: TItem, index: number) => Promise<TResult>
): Promise<TResult[]> {
    const results = new Array<TResult>(items.length)
    let nextIndex = 0

    const worker = async (): Promise<void> => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex
            nextIndex += 1
            results[currentIndex] = await mapper(items[currentIndex] as TItem, currentIndex)
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, async () => worker())
    )

    return results
}

function createRateLimiter(intervalMs: number): () => Promise<void> {
    let nextAvailableAt = 0

    return async () => {
        const now = Date.now()
        const waitMs = Math.max(0, nextAvailableAt - now)
        nextAvailableAt = Math.max(nextAvailableAt, now) + intervalMs

        if (waitMs > 0) {
            await delay(waitMs)
        }
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
