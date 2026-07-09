export const SOURCE_REGISTRATIONS = [
    {
        key: 'biomodels',
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

export function isSourceSupported(key: string): key is SourceKey {
    return listSupportedSourceKeys().includes(key as SourceKey)
}
