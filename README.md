# GRNCore Community Models Catalog

This repository stores source catalogs for GRNCore community model discovery and the scraper code that keeps those catalogs synchronized.

## Structure

- `catalog/`: source-specific JSON catalogs
- `scrappers/`: TypeScript CLI project that synchronizes catalogs
- `.github/workflows/`: scheduled and manual synchronization workflow

## BioModels catalog

The first supported source is BioModels. Its catalog file is:

- `catalog/biomodels.json`

The file stores:

- `models`: an array of `ModelMetadata`
- `filteredOut`: BioModels-specific IDs that should not be retried in future syncs

## Local usage

Install dependencies:

```bash
cd scrappers
npm install
```

Run the sync CLI:

```bash
npm run sync
```

Run tests:

```bash
npm test
```

## Notes

- The BioModels API integration is isolated behind a dedicated scraper and mapping helper so request parameters or payload mapping can be adjusted without changing the shared synchronization flow.
- The metadata shape mirrors the GRNCore `ModelMetadata` contract.

