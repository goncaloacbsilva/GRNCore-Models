import { describe, expect, it, vi } from 'vitest'

import {
    extractDescription,
    mapBiomodelsEntryToMetadata,
} from '../src/lib/biomodels/mapper.js'

describe('mapBiomodelsEntryToMetadata', () => {
    it('maps a BioModels entry into ModelMetadata', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

        const metadata = mapBiomodelsEntryToMetadata({
            id: 'BIOMD0000000001',
            name: 'Cell Cycle',
            format: 'SBML',
            authors: ['Jane Doe'],
            submissionDate: '2024-01-01T00:00:00.000Z',
            created: '2024-01-01T00:00:00.000Z',
            lastModified: '2024-02-01T00:00:00.000Z',
        }, {
            description:
                '<notes><body><div class="dc:description"><p>Model description</p></div></body></notes>',
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

    it('does not add a source tag when the model format is not supported', () => {
        const metadata = mapBiomodelsEntryToMetadata(
            {
                id: 'BIOMD0000000002',
                name: 'Plain model',
                format: 'UNKNOWN',
            },
            {
                description:
                    '<notes><body><div class="dc:description"><p>Text</p></div></body></notes>',
            }
        )

        expect(metadata?.tags).toEqual([])
    })

    it('extracts a plain-text description from BioModels XML notes', () => {
        expect(
            extractDescription(
                '<notes><body><div class="dc:title">Title</div><div class="dc:description"><p>Alpha <b>Beta</b> &amp; Gamma</p></div></body></notes>'
            )
        ).toBe('Alpha Beta & Gamma')
    })
})
