import {
    ModelMetadataSchema,
    ModelMetadataSourceTags,
} from '../schema/model-metadata.js'
import {
    GinsimModelMetadataSchema,
    type GinsimModelMetadata,
} from '../schema/ginsim-catalog.js'
import { buildGinsimRawDownloadUrl, type GinsimGithubContentItem } from './api.js'
import {
    assertSafeGinsimSourcePath,
    encodeGinsimModelId,
} from '../../../../shared/ginsim-model-id.js'

export type GinsimFolderMetadata = {
    title?: string
    description?: string
    author?: string
    createdAt?: number
    lastChangedAt?: number
    fileDescriptions: Map<string, string>
}

export function createEmptyGinsimFolderMetadata(): GinsimFolderMetadata {
    return {
        fileDescriptions: new Map(),
    }
}

export function mapGinsimFileToMetadata(
    folder: GinsimGithubContentItem,
    file: GinsimGithubContentItem,
    folderMetadata: GinsimFolderMetadata
): GinsimModelMetadata {
    assertSafeGinsimSourcePath(file.path)

    const title = pickFirstNonEmpty(
        folderMetadata.title,
        humanizeFilename(folder.name),
        humanizeFilename(file.name)
    )
    const description = pickFirstNonEmpty(
        folderMetadata.fileDescriptions.get(file.name),
        folderMetadata.description
    ) ?? ''
    const createdAt = folderMetadata.createdAt ?? 0
    const lastChangedAt = folderMetadata.lastChangedAt ?? createdAt

    return GinsimModelMetadataSchema.parse({
        ...ModelMetadataSchema.parse({
            id: encodeGinsimModelId(file.path),
            title,
            description,
            author: folderMetadata.author ?? '',
            tags: [ModelMetadataSourceTags.GINML],
            createdAt,
            lastChangedAt,
        }),
        filename: file.name,
        sourcePath: file.path,
        downloadUrl: file.download_url ?? buildGinsimRawDownloadUrl(file.path),
        format: getGinsimFormat(file.name),
    })
}

export function parseGinsimFolderMetadata(markdown: string): GinsimFolderMetadata {
    const normalized = markdown.replace(/\r\n/g, '\n')
    const title = extractTitle(normalized)
    const author = pickFirstNonEmpty(
        extractField(normalized, 'authors'),
        extractField(normalized, 'author')
    )
    const year = extractYear(normalized)
    const description = extractDescription(normalized)

    return {
        title,
        description,
        author,
        createdAt: year ? Date.UTC(year, 0, 1) : undefined,
        lastChangedAt: year ? Date.UTC(year, 0, 1) : undefined,
        fileDescriptions: extractFileDescriptions(normalized),
    }
}

export function isGinsimModelFile(file: GinsimGithubContentItem): boolean {
    return file.type === 'file' && /\.(?:z?ginml)$/i.test(file.name)
}

export function isMetadataFile(file: GinsimGithubContentItem): boolean {
    return file.type === 'file' && /\.(?:md|html)$/i.test(file.name)
}

function extractTitle(markdown: string): string | undefined {
    const heading = markdown.match(/^#\s+(.+)$/m)?.[1]
    const htmlTitle = markdown
        .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
        ?.replace(/\s+-\s+Gene Interaction Network simulation\s*$/i, '')
    const htmlHeading = markdown.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    return pickFirstNonEmpty(
        stripMarkdown(heading),
        stripMarkdown(htmlTitle),
        stripMarkdown(htmlHeading)
    )
}

function extractField(markdown: string, field: string): string | undefined {
    const markdownPattern = new RegExp(
        `^\\s*(?:[-*]\\s*)?\\*\\*${field}:?\\*\\*\\s*:?\\s*(.+)$`,
        'im'
    )
    const htmlPattern = new RegExp(
        `<(?:strong|b)>\\s*${field}(?:\\(s\\))?\\s*:?\\s*</(?:strong|b)>\\s*([^<]+)`,
        'i'
    )

    return pickFirstNonEmpty(
        stripMarkdown(markdownPattern.exec(markdown)?.[1]),
        stripMarkdown(htmlPattern.exec(markdown)?.[1])
    )
}

function extractYear(markdown: string): number | undefined {
    const fieldYear = pickFirstNonEmpty(
        extractField(markdown, 'year'),
        extractField(markdown, 'publication year')
    )
    const match = (fieldYear ?? markdown).match(/\b(19|20)\d{2}\b/)
    if (!match) {
        return undefined
    }

    return Number(match[0])
}

function extractDescription(markdown: string): string | undefined {
    const htmlSummary = markdown.match(
        /<strong>\s*Summary:\s*<\/strong>\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>/i
    )?.[1]
    if (htmlSummary) {
        return pickFirstNonEmpty(stripMarkdown(htmlSummary))
    }

    const lines = markdown.split('\n')
    const descriptionLines: string[] = []
    let hasSeenHeading = false

    for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('#')) {
            hasSeenHeading = true
            continue
        }

        if (!hasSeenHeading || trimmed.length === 0) {
            if (descriptionLines.length > 0) {
                break
            }
            continue
        }

        if (trimmed.startsWith('|') || /^[-*]\s+\*\*/.test(trimmed)) {
            continue
        }

        descriptionLines.push(stripMarkdown(trimmed))
    }

    return pickFirstNonEmpty(descriptionLines.join(' '))
}

function extractFileDescriptions(markdown: string): Map<string, string> {
    const descriptions = new Map<string, string>()
    const htmlRowPattern = /<tr>\s*<td>\s*(?:<a[^>]*>)?([^<]+\.(?:z?ginml))(?:<\/a>)?\s*<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi

    for (const match of markdown.matchAll(htmlRowPattern)) {
        const fileName = stripMarkdown(match[1])
        const description = stripMarkdown(match[2])
        if (fileName && description) {
            descriptions.set(fileName, description)
        }
    }

    for (const line of markdown.split('\n')) {
        if (!line.trim().startsWith('|')) {
            continue
        }

        const cells = line
            .split('|')
            .slice(1, -1)
            .map((cell) => stripMarkdown(cell.trim()))
        const fileName = cells.find((cell) => /\.(?:z?ginml)$/i.test(cell))
        if (!fileName) {
            continue
        }

        const description = cells.find(
            (cell) => cell !== fileName && cell.length > 0 && !/^-+$/.test(cell)
        )
        if (description) {
            descriptions.set(fileName, description)
        }
    }

    return descriptions
}

function getGinsimFormat(filename: string): string {
    return filename.toLowerCase().endsWith('.zginml') ? 'ZGINML' : 'GINML'
}

function humanizeFilename(value: string): string {
    return value
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function stripMarkdown(value: string | undefined): string | undefined {
    if (!value) {
        return undefined
    }

    return value
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_`]/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&emsp;|&nbsp;|&#160;/g, ' ')
        .replace(/&para;/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
}

function pickFirstNonEmpty(...values: Array<string | undefined>): string | undefined {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0)
}
