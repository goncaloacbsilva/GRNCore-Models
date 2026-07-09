import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BiomodelsScrapper } from './scrappers/biomodels-scrapper.js'

export async function runRegisteredScrappers(
    catalogDirectory: string
): Promise<void> {
    const scrappers = [new BiomodelsScrapper(catalogDirectory)]

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

main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
})
