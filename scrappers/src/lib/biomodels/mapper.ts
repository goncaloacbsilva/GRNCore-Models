import {
    ModelMetadataSchema,
    ModelMetadataSourceTags,
    type ModelMetadata,
} from '../schema/model-metadata.js'
import type { BiomodelsSearchItem } from './api.js'

const DEFAULT_SOURCE_TAG = ModelMetadataSourceTags.SBMLqual

export function mapBiomodelsEntryToMetadata(
    model: BiomodelsSearchItem
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
    const description = model.description?.trim() ?? ''
    const createdAt = toEpochMs(model.curation?.created ?? model.created)
    const lastChangedAt = toEpochMs(
        model.curation?.modified ?? model.lastModified ?? model.created
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

function pickFirstNonEmpty(...values: Array<string | undefined>): string | undefined {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0)
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

