import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { BiomodelsApiClient, type BiomodelsSearchItem } from '../src/lib/biomodels/api.js'
import type { BiomodelsCatalog } from '../src/lib/schema/biomodels-catalog.js'
import { BiomodelsScrapper } from '../src/scrappers/biomodels-scrapper.js'

const runIntegration = process.env.RUN_BIOMODELS_INTEGRATION === '1'
const describeIntegration = runIntegration ? describe : describe.skip

class LiveBiomodelsScrapper extends BiomodelsScrapper {
    async fetchUnsyncedIds(catalog: BiomodelsCatalog): Promise<string[]> {
        return this.fetchUnsynced(catalog)
    }

    async syncIds(ids: string[], catalog: BiomodelsCatalog): Promise<BiomodelsCatalog> {
        return this.sync(ids, catalog)
    }
}

class LimitedBiomodelsApiClient extends BiomodelsApiClient {
    async fetchLimitedLivePage(): Promise<BiomodelsSearchItem[]> {
        return this.fetchSbmlModelsPage({
            numResults: 5,
        })
    }

    async fetchAllSbmlModels() {
        return this.fetchLimitedLivePage()
    }
}

describeIntegration('BiomodelsScrapper integration', () => {
    it(
        'fetches live identifiers and maps a limited live SBML page without downloading the full catalog',
        async () => {
            const directory = await mkdtemp(path.join(os.tmpdir(), 'biomodels-live-'))
            const apiClient = new LimitedBiomodelsApiClient()
            const scrapper = new LiveBiomodelsScrapper(
                directory,
                apiClient
            )
            const limitedPage = await apiClient.fetchLimitedLivePage()
            const limitedPageIds = limitedPage
                .map((model) => model.id ?? model.identifier)
                .filter((id): id is string => typeof id === 'string' && id.length > 0)
            const requestedIds = [...new Set(limitedPageIds)]

            expect(requestedIds.length).toBeGreaterThan(0)

            const unsyncedIds = await scrapper.fetchUnsyncedIds({
                models: [],
                filteredOut: [],
            })

            expect(unsyncedIds.length).toBeGreaterThan(0)
            expect(
                requestedIds.some((id) => unsyncedIds.includes(id))
            ).toBe(true)

            const syncedCatalog = await scrapper.syncIds(requestedIds, {
                models: [],
                filteredOut: [],
            })

            expect(syncedCatalog.models.length).toBeGreaterThan(0)
            expect(syncedCatalog.models.length).toBeLessThanOrEqual(
                requestedIds.length
            )

            for (const model of syncedCatalog.models) {
                expect(requestedIds).toContain(model.id)
                expect(model.title.length).toBeGreaterThan(0)
                expect(Array.isArray(model.tags)).toBe(true)
            }
        },
        60000
    )
})
