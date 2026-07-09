import { mkdtemp, readFile, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { AbstractCatalogScrapper } from '../src/lib/catalog/abstract-catalog-scrapper.js'

type TestCatalog = {
    models: string[]
}

class TestScrapper extends AbstractCatalogScrapper<TestCatalog> {
    constructor(
        catalogDirectory: string,
        private readonly unsyncedIds: string[],
        private readonly nextCatalog: TestCatalog,
        private readonly failSync = false
    ) {
        super(catalogDirectory, 'test-source')
    }

    protected createEmptyCatalog(): TestCatalog {
        return { models: [] }
    }

    protected async fetchUnsynced(): Promise<string[]> {
        return this.unsyncedIds
    }

    protected async sync(): Promise<TestCatalog> {
        if (this.failSync) {
            throw new Error('sync failed')
        }

        return this.nextCatalog
    }
}

describe('AbstractCatalogScrapper', () => {
    it('initializes a missing catalog file', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'catalog-'))
        const scrapper = new TestScrapper(directory, [], { models: [] })

        await scrapper.syncCatalog()

        const raw = await readFile(path.join(directory, 'test-source.json'), 'utf8')
        expect(JSON.parse(raw)).toEqual({ models: [] })
    })

    it('does not rewrite an existing catalog when there are no unsynced ids', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'catalog-'))
        const scrapper = new TestScrapper(directory, [], { models: ['new-model'] })

        await scrapper.syncCatalog()
        const catalogPath = path.join(directory, 'test-source.json')
        const firstStats = await stat(catalogPath)

        await scrapper.syncCatalog()
        const secondStats = await stat(catalogPath)

        expect(secondStats.mtimeMs).toBe(firstStats.mtimeMs)
    })

    it('persists the updated catalog returned by sync', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'catalog-'))
        const scrapper = new TestScrapper(directory, ['model-1'], { models: ['model-1'] })

        await scrapper.syncCatalog()

        const raw = await readFile(path.join(directory, 'test-source.json'), 'utf8')
        expect(JSON.parse(raw)).toEqual({ models: ['model-1'] })
    })

    it('propagates sync failures', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'catalog-'))
        const scrapper = new TestScrapper(directory, ['model-1'], { models: [] }, true)

        await expect(scrapper.syncCatalog()).rejects.toThrow('sync failed')
    })
})

