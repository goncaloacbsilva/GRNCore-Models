import { describe, expect, it } from 'vitest'

import { GithubCatalogClient } from '../src/lib/catalogs/github-catalog-client.js'

describe('GithubCatalogClient', () => {
    it('builds the raw GitHub catalog path for a source', () => {
        const client = new GithubCatalogClient({} as never, {} as never)

        expect(client.buildCatalogPath('biomodels')).toBe('/catalog/biomodels.json')
    })

    it('builds the GitHub commits API path for the catalog version', () => {
        const client = new GithubCatalogClient({} as never, {} as never)

        expect(client.buildCatalogVersionPath()).toBe('/commits')
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
        } as never, {} as never)

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
        } as never, {} as never)

        await expect(client.fetchCatalogs()).rejects.toThrow('catalog fetch failed')
    })

    it('returns malformed JSON payloads as-is from the HTTP client contract', async () => {
        const client = new GithubCatalogClient({
            get: async () => ({
                data: 'not-a-json-object',
            }),
        } as never, {} as never)

        await expect(client.fetchCatalogs()).resolves.toEqual({
            biomodels: 'not-a-json-object',
        })
    })

    it('returns the latest commit hash for the catalog folder', async () => {
        const requests: Array<{ path: string; params?: Record<string, unknown> }> = []
        const client = new GithubCatalogClient(
            {} as never,
            {
                get: async (path: string, options?: { params?: Record<string, unknown> }) => {
                    requests.push({ path, params: options?.params })

                    return {
                        data: [{ sha: 'abc123' }],
                    }
                },
            } as never
        )

        await expect(client.getCatalogVersion()).resolves.toBe('abc123')
        expect(requests).toEqual([
            {
                path: '/commits',
                params: {
                    path: 'catalog',
                    per_page: 1,
                },
            },
        ])
    })

    it('fails when the commits API does not return a sha', async () => {
        const client = new GithubCatalogClient(
            {} as never,
            {
                get: async () => ({
                    data: [{}],
                }),
            } as never
        )

        await expect(client.getCatalogVersion()).rejects.toThrow(
            'Could not resolve catalog version from GitHub commits API'
        )
    })
})
