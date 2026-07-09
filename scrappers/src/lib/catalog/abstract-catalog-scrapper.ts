import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export abstract class AbstractCatalogScrapper<TCatalog> {
    constructor(
        private readonly catalogDirectory: string,
        private readonly sourceName: string
    ) {}

    async syncCatalog(): Promise<void> {
        this.log(`starting sync using ${this.catalogPath}`)
        const { catalog, existed } = await this.loadCatalog()

        if (!existed) {
            this.log('catalog file missing, creating an empty catalog')
            await this.saveCatalog(catalog)
        }

        const unsyncedIds = await this.fetchUnsynced(catalog)
        this.log(`found ${unsyncedIds.length} unsynced model(s)`)
        if (unsyncedIds.length === 0) {
            this.log('catalog is already up to date')
            return
        }

        const updatedCatalog = await this.sync(unsyncedIds, catalog)
        await this.saveCatalog(updatedCatalog)
        this.log('catalog sync completed')
    }

    protected abstract createEmptyCatalog(): TCatalog

    protected abstract fetchUnsynced(catalog: TCatalog): Promise<string[]>

    protected abstract sync(ids: string[], catalog: TCatalog): Promise<TCatalog>

    protected get catalogPath(): string {
        return path.join(this.catalogDirectory, `${this.sourceName}.json`)
    }

    protected get scrapperName(): string {
        return this.sourceName
    }

    protected async loadCatalog(): Promise<{ catalog: TCatalog; existed: boolean }> {
        try {
            const raw = await readFile(this.catalogPath, 'utf8')
            return {
                catalog: this.parseCatalog(raw),
                existed: true,
            }
        } catch (error) {
            if (this.isMissingFileError(error)) {
                return {
                    catalog: this.createEmptyCatalog(),
                    existed: false,
                }
            }

            throw error
        }
    }

    protected parseCatalog(raw: string): TCatalog {
        return JSON.parse(raw) as TCatalog
    }

    protected async saveCatalog(catalog: TCatalog): Promise<void> {
        await mkdir(this.catalogDirectory, { recursive: true })
        await writeFile(this.catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
    }

    protected log(message: string): void {
        console.info(`[${this.sourceName}] ${message}`)
    }

    private isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
        return (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ENOENT'
        )
    }
}
