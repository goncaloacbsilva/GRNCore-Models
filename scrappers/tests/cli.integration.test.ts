import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { runRegisteredScrappers } from '../src/index.js'

const fetchIdentifiers = vi.fn(async () => ['BIO1'])
const fetchAllSbmlModels = vi.fn(async () => [
    {
        id: 'BIO1',
        title: 'Bio 1',
        description: 'Description 1',
        authors: ['Author 1'],
        created: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-02T00:00:00.000Z',
    },
])

vi.mock('../src/lib/biomodels/api.js', async () => {
    const actual = await vi.importActual('../src/lib/biomodels/api.js')

    class MockBiomodelsApiClient {
        async fetchIdentifiers(): Promise<string[]> {
            return fetchIdentifiers()
        }

        async fetchAllSbmlModels(): Promise<unknown[]> {
            return fetchAllSbmlModels()
        }
    }

    return {
        ...actual,
        BiomodelsApiClient: MockBiomodelsApiClient,
    }
})

describe('runRegisteredScrappers', () => {
    it('updates the BioModels catalog through the registry entrypoint', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'cli-'))
        const catalogDirectory = path.join(directory, 'catalog')

        await mkdir(catalogDirectory, { recursive: true })
        await writeFile(
            path.join(catalogDirectory, 'biomodels.json'),
            `${JSON.stringify({ models: [], filteredOut: [] }, null, 2)}\n`
        )

        await runRegisteredScrappers(catalogDirectory)

        const raw = await readFile(path.join(catalogDirectory, 'biomodels.json'), 'utf8')
        const catalog = JSON.parse(raw) as {
            models: Array<{ id: string }>
            filteredOut: string[]
        }

        expect(catalog.models.map((model) => model.id)).toEqual(['BIO1'])
        expect(catalog.filteredOut).toEqual([])
    })
})
