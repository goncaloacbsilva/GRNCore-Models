import { describe, expect, it, vi } from 'vitest'

import { encodeGinsimModelId } from '../../../shared/ginsim-model-id.js'
import { GinsimModelFetcher } from '../src/lib/ginsim/ginsim-fetcher.js'

describe('GinsimModelFetcher', () => {
    it('returns the downloaded model payload for a route-safe id', async () => {
        const downloadModelFile = vi.fn(async () => ({
            filename: 'lambda.zginml',
            content: new Uint8Array([1, 2, 3]),
            contentType: 'application/xml',
        }))
        const fetcher = new GinsimModelFetcher({
            downloadModelFile,
        } as never)
        const modelId = encodeGinsimModelId('models/lambda/lambda.zginml')

        await expect(fetcher.fetchModel(modelId)).resolves.toEqual({
            modelId,
            filename: 'lambda.zginml',
            content: new Uint8Array([1, 2, 3]),
            contentType: 'application/xml',
        })
        expect(downloadModelFile).toHaveBeenCalledWith('models/lambda/lambda.zginml')
    })

    it('rejects invalid ids before downloading', async () => {
        const downloadModelFile = vi.fn()
        const fetcher = new GinsimModelFetcher({
            downloadModelFile,
        } as never)

        await expect(fetcher.fetchModel('not valid')).rejects.toThrow(
            'Invalid GINsim model id'
        )
        expect(downloadModelFile).not.toHaveBeenCalled()
    })

    it('rejects unsafe decoded paths before downloading', async () => {
        const downloadModelFile = vi.fn()
        const fetcher = new GinsimModelFetcher({
            downloadModelFile,
        } as never)

        await expect(
            fetcher.fetchModel(encodeGinsimModelId('other/lambda.zginml'))
        ).rejects.toThrow('Unsafe GINsim model source path')
        await expect(
            fetcher.fetchModel(encodeGinsimModelId('models/../lambda.zginml'))
        ).rejects.toThrow('Unsafe GINsim model source path')
        expect(downloadModelFile).not.toHaveBeenCalled()
    })

    it('fails when the downloaded file is empty', async () => {
        const fetcher = new GinsimModelFetcher({
            downloadModelFile: async () => ({
                filename: 'lambda.zginml',
                content: new Uint8Array(),
            }),
        } as never)

        await expect(
            fetcher.fetchModel(encodeGinsimModelId('models/lambda/lambda.zginml'))
        ).rejects.toThrow('returned empty content')
    })
})
