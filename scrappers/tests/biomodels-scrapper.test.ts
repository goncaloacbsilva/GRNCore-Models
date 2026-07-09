import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { BiomodelsScrapper } from '../src/scrappers/biomodels-scrapper.js'

class TestableBiomodelsScrapper extends BiomodelsScrapper {
    async fetchUnsyncedIds(
        catalog: Parameters<BiomodelsScrapper['fetchUnsynced']>[0]
    ): Promise<string[]> {
        return this.fetchUnsynced(catalog)
    }
}

describe('BiomodelsScrapper', () => {
    it('filters already synced and filtered out ids in fetchUnsynced', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'biomodels-'))
        const scrapper = new TestableBiomodelsScrapper(directory, {
            fetchIdentifiers: async () => ['A', 'B', 'C'],
            fetchAllSbmlModels: async () => [],
        } as never)

        const ids = await scrapper.fetchUnsyncedIds({
            models: [
                {
                    id: 'A',
                    title: 'A',
                    description: '',
                    author: '',
                    tags: ['SBML-qual'],
                    createdAt: 0,
                    lastChangedAt: 0,
                },
            ],
            filteredOut: ['C'],
        })

        expect(ids).toEqual(['B'])
    })

    it('syncs models and persists filteredOut ids', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'biomodels-'))
        const scrapper = new BiomodelsScrapper(directory, {
            fetchIdentifiers: async () => ['BIO1', 'BIO2', 'BIO3'],
            fetchAllSbmlModels: async () => [
                {
                    id: 'BIO1',
                    title: 'Bio 1',
                    description: 'Description 1',
                    authors: ['Author 1'],
                    created: '2024-01-01T00:00:00.000Z',
                    lastModified: '2024-01-02T00:00:00.000Z',
                },
                {
                    id: 'BIO2',
                    title: 'Bio 2',
                    description: 'Description 2',
                    authors: ['Author 2'],
                    created: '2024-01-03T00:00:00.000Z',
                    lastModified: '2024-01-04T00:00:00.000Z',
                },
            ],
        } as never)

        await scrapper.syncCatalog()

        const raw = await readFile(path.join(directory, 'biomodels.json'), 'utf8')
        const catalog = JSON.parse(raw) as {
            models: Array<{ id: string }>
            filteredOut: string[]
        }

        expect(catalog.models.map((model) => model.id)).toEqual(['BIO1', 'BIO2'])
        expect(catalog.filteredOut).toEqual(['BIO3'])
    })
})
