import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
    listScraperSourceKeys,
    type SourceKey,
} from '../../shared/source-registry.js'
// import { BiomodelsScrapper } from './scrappers/biomodels-scrapper.js'
import { GinsimScrapper } from './scrappers/ginsim-scrapper.js'
import type { AbstractCatalogScrapper } from './lib/catalog/abstract-catalog-scrapper.js'

export const SCRAPPER_FACTORIES: Partial<Record<
    SourceKey,
    (catalogDirectory: string) => AbstractCatalogScrapper<unknown>
>> = {
    // BioModels syncing is temporarily disabled.
    // biomodels: (catalogDirectory: string) => new BiomodelsScrapper(catalogDirectory),
    ginsim: (catalogDirectory: string) => new GinsimScrapper(catalogDirectory),
}

export async function runRegisteredScrappers(
    catalogDirectory: string
): Promise<void> {
    const scrappers = listScraperSourceKeys().map((sourceKey) => {
        const factory = SCRAPPER_FACTORIES[sourceKey]
        if (!factory) {
            throw new Error(`No scrapper registered for source: ${sourceKey}`)
        }

        return factory(catalogDirectory)
    })

    console.info(`Running ${scrappers.length} scrapper(s)`)

    for (const scrapper of scrappers) {
        console.info(`Executing scrapper: ${scrapper.constructor.name}`)
        await scrapper.syncCatalog()
    }

    console.info('All scrappers completed')
}

async function main(): Promise<void> {
    const rootDirectory = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '..',
        '..'
    )
    const catalogDirectory = path.join(rootDirectory, 'catalog')

    await runRegisteredScrappers(catalogDirectory)
}

const currentFilePath = fileURLToPath(import.meta.url)
const executedFilePath = process.argv[1]
    ? path.resolve(process.argv[1])
    : undefined

if (executedFilePath === currentFilePath) {
    main().catch((error: unknown) => {
        console.error(error)
        process.exitCode = 1
    })
}
