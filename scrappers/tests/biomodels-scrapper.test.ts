import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
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
            fetchModelDetails: async () => ({ description: '' }),
        } as never)

        const ids = await scrapper.fetchUnsyncedIds({
            models: [
                {
                    id: 'A',
                    title: 'A',
                    description: 'Existing description',
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

    it('requeues incomplete catalog entries in fetchUnsynced', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'biomodels-'))
        const scrapper = new TestableBiomodelsScrapper(directory, {
            fetchIdentifiers: async () => ['A', 'B'],
            fetchAllSbmlModels: async () => [],
            fetchModelDetails: async () => ({ description: '' }),
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
            filteredOut: [],
        })

        expect(ids).toEqual(['B', 'A'])
    })

    it('syncs models and persists filteredOut ids', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'biomodels-'))
        const scrapper = new BiomodelsScrapper(directory, {
            fetchIdentifiers: async () => ['BIO1', 'BIO2', 'BIO3'],
            fetchAllSbmlModels: async () => [
                {
                    id: 'BIO1',
                    title: 'Bio 1',
                    authors: ['Author 1'],
                    submissionDate: '2024-01-01T00:00:00.000Z',
                    lastModified: '2024-01-02T00:00:00.000Z',
                },
                {
                    id: 'BIO2',
                    title: 'Bio 2',
                    authors: ['Author 2'],
                    submissionDate: '2024-01-03T00:00:00.000Z',
                    lastModified: '2024-01-04T00:00:00.000Z',
                },
            ],
            fetchModelDetails: async (id: string) => ({
                description: `<notes><body><div class="dc:description"><p>Description ${id.slice(-1)}</p></div></body></notes>`,
            }),
        } as never)

        await scrapper.syncCatalog()

        const raw = await readFile(path.join(directory, 'biomodels.json'), 'utf8')
        const catalog = JSON.parse(raw) as {
            models: Array<{ id: string; description: string; createdAt: number }>
            filteredOut: string[]
        }

        expect(catalog.models.map((model) => model.id)).toEqual(['BIO1', 'BIO2'])
        expect(catalog.models.map((model) => model.description)).toEqual([
            'Description 1',
            'Description 2',
        ])
        expect(catalog.models.map((model) => model.createdAt)).toEqual([
            Date.parse('2024-01-01T00:00:00.000Z'),
            Date.parse('2024-01-03T00:00:00.000Z'),
        ])
        expect(catalog.filteredOut).toEqual(['BIO3'])
    })

    it('updates an existing incomplete model instead of appending a duplicate', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'biomodels-'))
        await writeFile(
            path.join(directory, 'biomodels.json'),
            `${JSON.stringify(
                {
                    models: [
                        {
                            id: 'BIO1',
                            title: 'Old title',
                            description: '',
                            author: 'Old author',
                            tags: ['SBML-qual'],
                            createdAt: 1,
                            lastChangedAt: 1,
                        },
                    ],
                    filteredOut: [],
                },
                null,
                2
            )}\n`
        )

        const scrapper = new BiomodelsScrapper(directory, {
            fetchIdentifiers: async () => ['BIO1'],
            fetchAllSbmlModels: async () => [
                {
                    id: 'BIO1',
                    title: 'Bio 1',
                    authors: ['Author 1'],
                    submissionDate: '2024-01-01T00:00:00.000Z',
                    lastModified: '2024-01-02T00:00:00.000Z',
                },
            ],
            fetchModelDetails: async () => ({
                description:
                    '<notes><body><div class="dc:description"><p>Description 1</p></div></body></notes>',
            }),
        } as never)

        await scrapper.syncCatalog()

        const raw = await readFile(path.join(directory, 'biomodels.json'), 'utf8')
        const catalog = JSON.parse(raw) as {
            models: Array<{ id: string; title: string; description: string; createdAt: number }>
            filteredOut: string[]
        }

        expect(catalog.models).toHaveLength(1)
        expect(catalog.models[0]).toMatchObject({
            id: 'BIO1',
            title: 'Bio 1',
            description: 'Description 1',
            createdAt: Date.parse('2024-01-01T00:00:00.000Z'),
        })
    })
})
