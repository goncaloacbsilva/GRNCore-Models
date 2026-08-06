import { describe, expect, it, vi } from 'vitest'

import { BiomodelsApiClient } from '../src/lib/biomodels/api.js'

describe('BiomodelsApiClient', () => {
    it('fetches only public BioModels identifiers', async () => {
        const get = vi.fn(async () => ({
            data: ['BIO1'],
        }))
        const client = new BiomodelsApiClient({ get } as never)

        await expect(client.fetchIdentifiers()).resolves.toEqual(['BIO1'])

        expect(get).toHaveBeenCalledWith('/model/identifiers', {
            params: {
                isprivate: false,
                format: 'json',
            },
        })
    })
})
