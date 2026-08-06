import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { encodeGinsimModelId } from '../../shared/ginsim-model-id.js'
import { GinsimScrapper } from '../src/scrappers/ginsim-scrapper.js'

describe('GinsimScrapper', () => {
    it('skips folder traversal when the upstream models commit is unchanged', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'ginsim-'))
        const catalogPath = path.join(directory, 'ginsim.json')
        await writeFile(
            catalogPath,
            `${JSON.stringify(
                {
                    sourceCommit: 'abc123',
                    models: [],
                    filteredOut: [],
                },
                null,
                2
            )}\n`
        )
        const firstStats = await stat(catalogPath)
        const fetchModelsTree = vi.fn(async () => {
            throw new Error('fetchModelsTree should not be called')
        })
        const scrapper = new GinsimScrapper(directory, {
            fetchModelsCommit: async () => 'abc123',
            fetchModelsTree,
            fetchTextFile: async () => '',
        } as never)

        await scrapper.syncCatalog()

        const secondStats = await stat(catalogPath)
        expect(secondStats.mtimeMs).toBe(firstStats.mtimeMs)
        expect(fetchModelsTree).not.toHaveBeenCalled()
    })

    it('rebuilds the catalog when the upstream models commit changed', async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), 'ginsim-'))
        const fetchModelsTree = vi.fn(async () => [
            {
                path: 'models/1995-lambda-lysis-lysogeny',
                type: 'tree',
            },
            {
                path: 'models/1995-lambda-lysis-lysogeny/index.md',
                type: 'blob',
            },
            {
                path: 'models/1995-lambda-lysis-lysogeny/lambda.ginml',
                type: 'blob',
            },
            {
                path: 'models/1995-lambda-lysis-lysogeny/lambda-reduced.zginml',
                type: 'blob',
            },
            {
                path: 'models/1995-lambda-lysis-lysogeny/notes.txt',
                type: 'blob',
            },
        ])
        const scrapper = new GinsimScrapper(directory, {
            fetchModelsCommit: async () => 'def456',
            fetchModelsTree,
            fetchTextFile: async () => [
                '# Lambda Lysis Lysogeny',
                '',
                '**Authors:** Thieffry',
                '',
                'A small logical model from 1995.',
                '',
                '| File | Description |',
                '| --- | --- |',
                '| lambda.ginml | Full model |',
                '| lambda-reduced.zginml | Reduced model |',
            ].join('\n'),
        } as never)

        await scrapper.syncCatalog()

        const raw = await readFile(path.join(directory, 'ginsim.json'), 'utf8')
        const catalog = JSON.parse(raw) as {
            sourceCommit: string
            models: Array<{
                id: string
                title: string
                description: string
                author: string
                tags: string[]
                createdAt: number
                filename: string
                sourcePath: string
                format: string
            }>
            filteredOut: string[]
        }

        expect(catalog.sourceCommit).toBe('def456')
        expect(catalog.models.map((model) => model.filename)).toEqual([
            'lambda-reduced.zginml',
            'lambda.ginml',
        ])
        expect(catalog.models.map((model) => model.description).sort()).toEqual([
            'Full model',
            'Reduced model',
        ])
        expect(catalog.models[0]).toMatchObject({
            title: 'Lambda Lysis Lysogeny',
            author: 'Thieffry',
            tags: ['GINML'],
            createdAt: Date.UTC(1995, 0, 1),
        })
        expect(catalog.models.map((model) => model.id).sort()).toEqual(
            [
                'models/1995-lambda-lysis-lysogeny/lambda-reduced.zginml',
                'models/1995-lambda-lysis-lysogeny/lambda.ginml',
            ]
                .map(encodeGinsimModelId)
                .sort()
        )
        expect(catalog.filteredOut).toEqual([])
    })
})
