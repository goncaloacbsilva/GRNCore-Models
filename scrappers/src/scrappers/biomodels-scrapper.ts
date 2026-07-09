import { BiomodelsCatalogSchema, type BiomodelsCatalog } from '../lib/schema/biomodels-catalog.js'
import type { ModelMetadata } from '../lib/schema/model-metadata.js'
import { AbstractCatalogScrapper } from '../lib/catalog/abstract-catalog-scrapper.js'
import { BiomodelsApiClient, type BiomodelsSearchItem } from '../lib/biomodels/api.js'
import { mapBiomodelsEntryToMetadata } from '../lib/biomodels/mapper.js'

export class BiomodelsScrapper extends AbstractCatalogScrapper<BiomodelsCatalog> {
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

        const unsyncedIds = [...remoteIds].filter(
            (id) => !catalogIds.has(id) && !filteredOutIds.has(id)
        )

        this.log(
            `fetched ${remoteIds.size} identifiers, ${catalogIds.size} already cataloged, ${filteredOutIds.size} filtered out`
        )

        return unsyncedIds
    }

    protected async sync(
        ids: string[],
        catalog: BiomodelsCatalog
    ): Promise<BiomodelsCatalog> {
        const requestedIds = new Set(ids)
        const existingIds = new Set(catalog.models.map((model) => model.id))
        const filteredOutIds = new Set(catalog.filteredOut)
        this.log(`syncing ${requestedIds.size} BioModels model(s)`)
        const discoveredModels = await this.apiClient.fetchAllSbmlModels()
        this.log(`fetched ${discoveredModels.length} SBML model record(s) from search`)

        const syncedModels: ModelMetadata[] = []
        const seenRequestedIds = new Set<string>()

        for (const remoteModel of discoveredModels) {
            const remoteId = getRemoteId(remoteModel)
            if (!remoteId || !requestedIds.has(remoteId)) {
                continue
            }

            seenRequestedIds.add(remoteId)

            const mapped = mapBiomodelsEntryToMetadata(remoteModel)
            if (mapped === null) {
                filteredOutIds.add(remoteId)
                continue
            }

            if (!existingIds.has(mapped.id)) {
                syncedModels.push(mapped)
                existingIds.add(mapped.id)
            }
        }

        for (const requestedId of requestedIds) {
            if (!seenRequestedIds.has(requestedId)) {
                filteredOutIds.add(requestedId)
            }
        }

        this.log(
            `adding ${syncedModels.length} model(s) and tracking ${filteredOutIds.size} filtered-out id(s)`
        )

        return {
            models: [...catalog.models, ...syncedModels],
            filteredOut: [...filteredOutIds].sort(),
        }
    }
}

function getRemoteId(model: BiomodelsSearchItem): string | undefined {
    return model.id ?? model.identifier
}
