import { describe, expect, it } from 'vitest'

import { BiomodelsModelFetcher } from '../src/lib/biomodels/biomodels-fetcher.js'

describe('BiomodelsModelFetcher', () => {
    it('returns the downloaded model payload', async () => {
        const fetcher = new BiomodelsModelFetcher({
            fetchModelMetadata: async () => ({
                files: {
                    main: {
                        name: 'model.xml',
                    },
                },
            }),
            downloadModelFile: async () => ({
                filename: 'model.xml',
                content: new Uint8Array([1, 2, 3]),
                contentType: 'application/xml',
            }),
        } as never)

        await expect(fetcher.fetchModel('BIOMD0000000001')).resolves.toEqual({
            modelId: 'BIOMD0000000001',
            filename: 'model.xml',
            content: new Uint8Array([1, 2, 3]),
            contentType: 'application/xml',
        })
    })

    it('fails when the main filename is missing', async () => {
        const fetcher = new BiomodelsModelFetcher({
            fetchModelMetadata: async () => ({
                files: {},
            }),
            downloadModelFile: async () => ({
                filename: 'model.xml',
                content: new Uint8Array([1]),
            }),
        } as never)

        await expect(fetcher.fetchModel('BIOMD0000000001')).rejects.toThrow(
            'does not expose files.main.name'
        )
    })

    it('fails when the downloaded file is empty', async () => {
        const fetcher = new BiomodelsModelFetcher({
            fetchModelMetadata: async () => ({
                files: {
                    main: {
                        name: 'model.xml',
                    },
                },
            }),
            downloadModelFile: async () => ({
                filename: 'model.xml',
                content: new Uint8Array(),
            }),
        } as never)

        await expect(fetcher.fetchModel('BIOMD0000000001')).rejects.toThrow(
            'returned empty content'
        )
    })
})

