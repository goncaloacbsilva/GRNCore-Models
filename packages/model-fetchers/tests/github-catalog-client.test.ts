import { describe, expect, it } from 'vitest'

import { GithubCatalogClient } from '../src/lib/catalogs/github-catalog-client.js'

describe('GithubCatalogClient', () => {
    it('builds the raw GitHub catalog path for a source', () => {
        const client = new GithubCatalogClient({} as never)

        expect(client.buildCatalogPath('biomodels')).toBe('/catalog/biomodels.json')
    })

    it('fetches all supported catalogs', async () => {
        const requests: string[] = []
        const client = new GithubCatalogClient({
            get: async (path: string) => {
                requests.push(path)

                return {
                    data: {
                        source: 'biomodels',
                    },
                }
            },
        } as never)

        await expect(client.fetchCatalogs()).resolves.toEqual({
            biomodels: {
                source: 'biomodels',
            },
        })
        expect(requests).toEqual(['/catalog/biomodels.json'])
    })

    it('fails when one catalog request errors', async () => {
        const client = new GithubCatalogClient({
            get: async () => {
                throw new Error('catalog fetch failed')
            },
        } as never)

        await expect(client.fetchCatalogs()).rejects.toThrow('catalog fetch failed')
    })

    it('returns malformed JSON payloads as-is from the HTTP client contract', async () => {
        const client = new GithubCatalogClient({
            get: async () => ({
                data: 'not-a-json-object',
            }),
        } as never)

        await expect(client.fetchCatalogs()).resolves.toEqual({
            biomodels: 'not-a-json-object',
        })
    })
})
