export const SOURCE_REGISTRATIONS = [
    {
        key: 'biomodels',
        // Temporarily disabled to avoid running the BioModels scrapper.
        // Restore to true when BioModels syncing should be re-enabled.
        hasScraper: false,
        hasFetcher: true,
    },
    {
        key: 'ginsim',
        hasScraper: true,
        hasFetcher: true,
    },
] as const

export type SourceRegistration = (typeof SOURCE_REGISTRATIONS)[number]
export type SourceKey = SourceRegistration['key']

export function resolveSupportedSources(
    registrations: ReadonlyArray<{
        key: string
        hasScraper: boolean
        hasFetcher: boolean
    }>
): string[] {
    return registrations
        .filter((registration) => registration.hasScraper && registration.hasFetcher)
        .map((registration) => registration.key)
}

export function listSupportedSourceKeys(): SourceKey[] {
    return resolveSupportedSources(SOURCE_REGISTRATIONS) as SourceKey[]
}

export function listScraperSourceKeys(): SourceKey[] {
    return SOURCE_REGISTRATIONS.filter((registration) => registration.hasScraper).map(
        (registration) => registration.key
    ) as SourceKey[]
}

export function listFetcherSourceKeys(): SourceKey[] {
    return SOURCE_REGISTRATIONS.filter((registration) => registration.hasFetcher).map(
        (registration) => registration.key
    ) as SourceKey[]
}

export function isSourceSupported(key: string): key is SourceKey {
    return listSupportedSourceKeys().includes(key as SourceKey)
}
