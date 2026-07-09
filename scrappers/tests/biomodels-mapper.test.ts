import { describe, expect, it, vi } from 'vitest'

import { mapBiomodelsEntryToMetadata } from '../src/lib/biomodels/mapper.js'

describe('mapBiomodelsEntryToMetadata', () => {
    it('maps a BioModels entry into ModelMetadata', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

        const metadata = mapBiomodelsEntryToMetadata({
            id: 'BIOMD0000000001',
            name: 'Cell Cycle',
            description: 'Model description',
            authors: ['Jane Doe'],
            created: '2024-01-01T00:00:00.000Z',
            lastModified: '2024-02-01T00:00:00.000Z',
        })

        expect(metadata).toEqual({
            id: 'BIOMD0000000001',
            title: 'Cell Cycle',
            description: 'Model description',
            author: 'Jane Doe',
            tags: ['SBML-qual'],
            createdAt: Date.parse('2024-01-01T00:00:00.000Z'),
            lastChangedAt: Date.parse('2024-02-01T00:00:00.000Z'),
        })

        vi.useRealTimers()
    })

    it('returns null when the remote item has no id', () => {
        expect(
            mapBiomodelsEntryToMetadata({
                title: 'Missing identifier',
            })
        ).toBeNull()
    })
})

