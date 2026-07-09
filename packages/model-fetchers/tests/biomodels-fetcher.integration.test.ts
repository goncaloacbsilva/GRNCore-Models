import { describe, expect, it } from 'vitest'

import { BiomodelsModelFetcher } from '../src/lib/biomodels/biomodels-fetcher.js'

const runIntegration = process.env.RUN_BIOMODELS_FETCHER_INTEGRATION === '1'
const describeIntegration = runIntegration ? describe : describe.skip

describeIntegration('BiomodelsModelFetcher integration', () => {
    it(
        'fetches one live model without downloading the full catalog',
        async () => {
            const fetcher = new BiomodelsModelFetcher()
            const model = await fetcher.fetchModel('BIOMD0000000001')

            expect(model.modelId).toBe('BIOMD0000000001')
            expect(model.filename.length).toBeGreaterThan(0)
            expect(model.content.byteLength).toBeGreaterThan(0)
        },
        60000
    )
})
