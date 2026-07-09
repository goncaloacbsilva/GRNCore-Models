import { z } from 'zod'

export const ModelMetadataSourceTags = {
    SBMLqual: 'SBML-qual',
    GINML: 'GINML',
    BNET: 'BNET',
    GRNCore: 'GRNCore',
} as const

export const MODEL_METADATA_SOURCE_TAG_VALUES = Object.values(
    ModelMetadataSourceTags
) as [string, ...string[]]

export type ModelMetadataSourceTag =
    (typeof ModelMetadataSourceTags)[keyof typeof ModelMetadataSourceTags]

export const ModelMetadataAdditionalTags = {
    Annotated: 'Annotated',
} as const

export const MODEL_METADATA_ADDITIONAL_TAG_VALUES = Object.values(
    ModelMetadataAdditionalTags
) as [string, ...string[]]

export type ModelMetadataAdditionalTag =
    (typeof ModelMetadataAdditionalTags)[keyof typeof ModelMetadataAdditionalTags]

export type ModelMetadataTag =
    | ModelMetadataSourceTag
    | ModelMetadataAdditionalTag

export const MODEL_METADATA_TAG_VALUES = [
    ...MODEL_METADATA_SOURCE_TAG_VALUES,
    ...MODEL_METADATA_ADDITIONAL_TAG_VALUES,
] as [string, ...string[]]

export const ModelMetadataTagSchema = z.enum(MODEL_METADATA_TAG_VALUES)

export const ModelMetadataSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    author: z.string(),
    tags: z.array(ModelMetadataTagSchema),
    createdAt: z.number(),
    lastChangedAt: z.number(),
})

export type ModelMetadata = z.infer<typeof ModelMetadataSchema>

