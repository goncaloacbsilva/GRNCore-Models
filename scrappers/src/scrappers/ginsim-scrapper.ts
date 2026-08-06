import { AbstractCatalogScrapper } from '../lib/catalog/abstract-catalog-scrapper.js'
import {
    buildGinsimRawDownloadUrl,
    GinsimApiClient,
    type GinsimGithubContentItem,
} from '../lib/ginsim/api.js'
import {
    createEmptyGinsimFolderMetadata,
    isGinsimModelFile,
    isMetadataFile,
    mapGinsimFileToMetadata,
    parseGinsimFolderMetadata,
} from '../lib/ginsim/mapper.js'
import { GinsimCatalogSchema, type GinsimCatalog } from '../lib/schema/ginsim-catalog.js'

const GINSIM_MODELS_PATH = 'models'

export class GinsimScrapper extends AbstractCatalogScrapper<GinsimCatalog> {
    private remoteCommit?: string
    private discoveredModelsPromise?: Promise<DiscoveredGinsimModel[]>

    constructor(
        catalogDirectory: string,
        private readonly apiClient: GinsimApiClient = new GinsimApiClient()
    ) {
        super(catalogDirectory, 'ginsim')
    }

    async syncCatalog(): Promise<void> {
        this.log(`starting sync using ${this.catalogPath}`)
        const { catalog, existed } = await this.loadCatalog()

        if (!existed) {
            this.log('catalog file missing, creating an empty catalog')
            await this.saveCatalog(catalog)
        }

        this.remoteCommit = await this.apiClient.fetchModelsCommit()
        if (catalog.sourceCommit === this.remoteCommit) {
            this.log(`upstream models commit ${this.remoteCommit} unchanged`)
            this.log('catalog is already up to date')
            return
        }

        this.log(
            `upstream models commit changed from ${catalog.sourceCommit ?? 'none'} to ${this.remoteCommit}`
        )
        const updatedCatalog = await this.rebuildCatalog(catalog, this.remoteCommit)
        await this.saveCatalog(updatedCatalog)
        this.log('catalog sync completed')
    }

    protected createEmptyCatalog(): GinsimCatalog {
        return {
            sourceCommit: null,
            models: [],
            filteredOut: [],
        }
    }

    protected parseCatalog(raw: string): GinsimCatalog {
        return GinsimCatalogSchema.parse(JSON.parse(raw))
    }

    protected async fetchUnsynced(catalog: GinsimCatalog): Promise<string[]> {
        this.remoteCommit = await this.apiClient.fetchModelsCommit()

        if (catalog.sourceCommit === this.remoteCommit) {
            this.log(`upstream models commit ${this.remoteCommit} unchanged`)
            return []
        }

        this.log(
            `upstream models commit changed from ${catalog.sourceCommit ?? 'none'} to ${this.remoteCommit}`
        )
        const discoveredModels = await this.fetchDiscoveredModels()

        return discoveredModels.map((model) => model.metadata.id)
    }

    protected async sync(_ids: string[], catalog: GinsimCatalog): Promise<GinsimCatalog> {
        const sourceCommit = this.remoteCommit ?? (await this.apiClient.fetchModelsCommit())
        return this.rebuildCatalog(catalog, sourceCommit)
    }

    private async rebuildCatalog(
        catalog: GinsimCatalog,
        sourceCommit: string
    ): Promise<GinsimCatalog> {
        const discoveredModels = await this.fetchDiscoveredModels()
        const filteredOutIds = new Set(catalog.filteredOut)

        this.log(`catalog rebuilt with ${discoveredModels.length} GINsim model file(s)`)

        return {
            sourceCommit,
            models: discoveredModels
                .map((model) => model.metadata)
                .filter((model) => !filteredOutIds.has(model.id)),
            filteredOut: [...filteredOutIds].sort(),
        }
    }

    private fetchDiscoveredModels(): Promise<DiscoveredGinsimModel[]> {
        this.discoveredModelsPromise ??= this.discoverModels()
        return this.discoveredModelsPromise
    }

    private async discoverModels(): Promise<DiscoveredGinsimModel[]> {
        this.log('fetching GINsim model folders')
        const tree = await this.apiClient.fetchModelsTree()
        const folders = tree
            .filter((item) => item.type === 'tree' && isDirectChildOfModels(item.path))
            .map((item) => toContentItem(item.path, 'dir'))
        const discoveredModels: DiscoveredGinsimModel[] = []

        for (const folder of folders) {
            const files = tree
                .filter((item) => item.type === 'blob' && isDirectChildOfFolder(item.path, folder.path))
                .map((item) => toContentItem(item.path, 'file'))
            const folderMetadata = await this.fetchFolderMetadata(files)

            for (const file of files.filter(isGinsimModelFile)) {
                discoveredModels.push({
                    sourcePath: file.path,
                    metadata: mapGinsimFileToMetadata(folder, file, folderMetadata),
                })
            }
        }

        return discoveredModels.sort((left, right) =>
            left.metadata.id.localeCompare(right.metadata.id)
        )
    }

    private async fetchFolderMetadata(files: GinsimGithubContentItem[]) {
        const markdownFile =
            files.find((file) => file.name.toLowerCase() === 'index.md') ??
            files.find((file) => file.name.toLowerCase() === 'index.html') ??
            files.find(isMetadataFile)

        if (!markdownFile) {
            return createEmptyGinsimFolderMetadata()
        }

        try {
            return parseGinsimFolderMetadata(
                await this.apiClient.fetchTextFile(markdownFile.path)
            )
        } catch (error) {
            this.log(`failed to parse metadata from ${markdownFile.path}: ${String(error)}`)
            return createEmptyGinsimFolderMetadata()
        }
    }
}

function isDirectChildOfModels(sourcePath: string): boolean {
    const parts = sourcePath.split('/')
    return parts.length === 2 && parts[0] === GINSIM_MODELS_PATH
}

function isDirectChildOfFolder(sourcePath: string, folderPath: string): boolean {
    return (
        sourcePath.startsWith(`${folderPath}/`) &&
        sourcePath.slice(folderPath.length + 1).split('/').length === 1
    )
}

function toContentItem(
    sourcePath: string,
    type: GinsimGithubContentItem['type']
): GinsimGithubContentItem {
    const name = sourcePath.split('/').at(-1) ?? sourcePath

    return {
        name,
        path: sourcePath,
        type,
        download_url: type === 'file' ? buildGinsimRawDownloadUrl(sourcePath) : null,
    }
}

type DiscoveredGinsimModel = {
    sourcePath: string
    metadata: GinsimCatalog['models'][number]
}
