import { describe, expect, it } from 'vitest'

import {
    getModelFetcher,
    listSupportedSources,
    REGISTERED_MODEL_FETCHER_SOURCES,
} from '../src/index.js'

describe('model fetcher registry', () => {
    it('exposes only supported sources', () => {
        expect(listSupportedSources()).toEqual(['biomodels'])
        expect(REGISTERED_MODEL_FETCHER_SOURCES).toEqual(['biomodels'])
    })

    it('returns a BioModels fetcher instance', () => {
        const fetcher = getModelFetcher('biomodels')
        expect(fetcher.source).toBe('biomodels')
    })
})

