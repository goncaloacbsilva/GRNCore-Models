import { z } from 'zod'

import { ModelMetadataSchema } from './model-metadata.js'

export const GinsimModelMetadataSchema = ModelMetadataSchema.extend({
    filename: z.string(),
    sourcePath: z.string(),
    downloadUrl: z.string(),
    format: z.string(),
})

export const GinsimCatalogSchema = z.object({
    sourceCommit: z.string().nullable(),
    models: z.array(GinsimModelMetadataSchema),
    filteredOut: z.array(z.string()),
})

export type GinsimModelMetadata = z.infer<typeof GinsimModelMetadataSchema>
export type GinsimCatalog = z.infer<typeof GinsimCatalogSchema>
