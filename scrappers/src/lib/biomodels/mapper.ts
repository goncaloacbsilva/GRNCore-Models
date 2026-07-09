import {
    ModelMetadataSchema,
    ModelMetadataSourceTags,
    type ModelMetadataSourceTag,
    type ModelMetadata,
} from '../schema/model-metadata.js'
import type { BiomodelsModelDetails, BiomodelsSearchItem } from './api.js'

export function mapBiomodelsEntryToMetadata(
    model: BiomodelsSearchItem,
    details?: BiomodelsModelDetails
): ModelMetadata | null {
    const id = model.id ?? model.identifier
    if (!id) {
        return null
    }

    const title =
        pickFirstNonEmpty(model.title, model.name, model.publication?.title) ?? id
    const author =
        pickFirstNonEmpty(
            model.submitter,
            model.authors?.[0],
            model.publication?.authors?.[0]
        ) ?? ''
    const description = extractDescription(details?.description)
    const createdAt = toEpochMs(
        model.submissionDate ?? model.curation?.created ?? model.created
    )
    const lastChangedAt = toEpochMs(
        model.curation?.modified ??
            model.lastModified ??
            model.submissionDate ??
            model.curation?.created ??
            model.created
    )

    return ModelMetadataSchema.parse({
        id,
        title,
        description,
        author,
        tags: mapSourceTags(model.format),
        createdAt,
        lastChangedAt,
    })
}

export function extractDescription(xmlDescription: string | undefined): string {
    if (!xmlDescription) {
        return ''
    }

    const descriptionMatch = xmlDescription.match(
        /<div\b[^>]*class=["'][^"']*\bdc:description\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    )
    const content = descriptionMatch?.[1] ?? xmlDescription

    return decodeXmlEntities(content.replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim()
}

function pickFirstNonEmpty(...values: Array<string | undefined>): string | undefined {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0)
}

function mapSourceTags(format: string | string[] | undefined): ModelMetadataSourceTag[] {
    const formats = normalizeFormats(format)
    const tags = new Set<ModelMetadataSourceTag>()

    for (const item of formats) {
        if (item === 'SBML') {
            tags.add(ModelMetadataSourceTags.SBMLqual)
        }

        if (item === 'GINML') {
            tags.add(ModelMetadataSourceTags.GINML)
        }

        if (item === 'BNET') {
            tags.add(ModelMetadataSourceTags.BNET)
        }
    }

    return [...tags]
}

function normalizeFormats(format: string | string[] | undefined): string[] {
    if (typeof format === 'string') {
        return [format.trim().toUpperCase()].filter((value) => value.length > 0)
    }

    if (Array.isArray(format)) {
        return format
            .map((value) => value.trim().toUpperCase())
            .filter((value) => value.length > 0)
    }

    return []
}

function decodeXmlEntities(value: string): string {
    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
}

function toEpochMs(value: string | number | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    if (typeof value === 'string') {
        const parsed = Date.parse(value)
        if (!Number.isNaN(parsed)) {
            return parsed
        }
    }

    return Date.now()
}
