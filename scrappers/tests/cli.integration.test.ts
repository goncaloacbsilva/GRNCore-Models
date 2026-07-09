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
        authors: ['Author 1'],
        submissionDate: '2024-01-01T00:00:00.000Z',
        lastModified: '2024-01-02T00:00:00.000Z',
    },
])
const fetchModelDetails = vi.fn(async () => ({
    description:
        '<notes><body><div class="dc:description"><p>Description 1</p></div></body></notes>',
}))

vi.mock('../src/lib/biomodels/api.js', async () => {
    const actual = await vi.importActual('../src/lib/biomodels/api.js')

    class MockBiomodelsApiClient {
        async fetchIdentifiers(): Promise<string[]> {
            return fetchIdentifiers()
        }

        async fetchAllSbmlModels(): Promise<unknown[]> {
            return fetchAllSbmlModels()
        }

        async fetchModelDetails(): Promise<unknown> {
            return fetchModelDetails()
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
            models: Array<{ id: string; description: string; createdAt: number }>
            filteredOut: string[]
        }

        expect(catalog.models.map((model) => model.id)).toEqual(['BIO1'])
        expect(catalog.models[0]?.description).toBe('Description 1')
        expect(catalog.models[0]?.createdAt).toBe(
            Date.parse('2024-01-01T00:00:00.000Z')
        )
        expect(catalog.filteredOut).toEqual([])
    })
})
