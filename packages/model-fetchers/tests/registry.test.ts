import { describe, expect, it } from 'vitest'

import {
    fetchCatalogs,
    getCatalogVersion,
    getModelFetcher,
    listSupportedSources,
    REGISTERED_MODEL_FETCHER_SOURCES,
} from '../src/index.js'
import * as catalogClientModule from '../src/lib/catalogs/github-catalog-client.js'
import { vi } from 'vitest'

describe('model fetcher registry', () => {
    it('exposes only supported sources', () => {
        expect(listSupportedSources()).toEqual(['biomodels'])
        expect(REGISTERED_MODEL_FETCHER_SOURCES).toEqual(['biomodels'])
    })

    it('returns a BioModels fetcher instance', () => {
        const fetcher = getModelFetcher('biomodels')
        expect(fetcher.source).toBe('biomodels')
    })

    it('fetchCatalogs requests exactly the supported source set', async () => {
        const fetchCatalogsSpy = vi
            .spyOn(catalogClientModule.GithubCatalogClient.prototype, 'fetchCatalogs')
            .mockResolvedValue({
                biomodels: {},
            })

        await expect(fetchCatalogs()).resolves.toEqual({
            biomodels: {},
        })
        expect(fetchCatalogsSpy).toHaveBeenCalledOnce()
    })

    it('getCatalogVersion delegates to the GitHub catalog client', async () => {
        const getCatalogVersionSpy = vi
            .spyOn(catalogClientModule.GithubCatalogClient.prototype, 'getCatalogVersion')
            .mockResolvedValue('abc123')

        await expect(getCatalogVersion()).resolves.toBe('abc123')
        expect(getCatalogVersionSpy).toHaveBeenCalledOnce()
    })
})
