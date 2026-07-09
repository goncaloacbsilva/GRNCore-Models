import { z } from 'zod'

import { ModelMetadataSchema } from './model-metadata.js'

export const BiomodelsCatalogSchema = z.object({
    models: z.array(ModelMetadataSchema),
    filteredOut: z.array(z.string()),
})

export type BiomodelsCatalog = z.infer<typeof BiomodelsCatalogSchema>

