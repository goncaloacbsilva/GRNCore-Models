import {
    ModelMetadataSchema,
    ModelMetadataSourceTags,
    type ModelMetadata,
} from '../schema/model-metadata.js'
import type { BiomodelsModelDetails, BiomodelsSearchItem } from './api.js'

const DEFAULT_SOURCE_TAG = ModelMetadataSourceTags.SBMLqual

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
        tags: [DEFAULT_SOURCE_TAG],
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
