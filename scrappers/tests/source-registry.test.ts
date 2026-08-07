import { describe, expect, it } from 'vitest'

import {
    resolveSupportedSources,
    listScraperSourceKeys,
} from '../../shared/source-registry.js'
import { SCRAPPER_FACTORIES } from '../src/index.js'

describe('source registry', () => {
    it('marks a source as supported only when both implementations exist', () => {
        expect(
            resolveSupportedSources([
                {
                    key: 'only-scraper',
                    hasScraper: true,
                    hasFetcher: false,
                },
                {
                    key: 'only-fetcher',
                    hasScraper: false,
                    hasFetcher: true,
                },
                {
                    key: 'full-source',
                    hasScraper: true,
                    hasFetcher: true,
                },
            ])
        ).toEqual(['full-source'])
    })

    it('keeps scrapper registrations aligned with scraper-enabled sources', () => {
        expect(Object.keys(SCRAPPER_FACTORIES).sort()).toEqual(
            listScraperSourceKeys().slice().sort()
        )
    })
})
