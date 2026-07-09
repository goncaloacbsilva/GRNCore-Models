# GRNCore Community Models Catalog

This repository hosts public model catalogs and model-fetching utilities for GRNCore community model sources.

## Supported Sources

- BioModels
  - Website: https://www.biomodels.org/
  - Documentation: https://www.biomodels.org/docs/

## Model Fetchers Setup

Install workspace dependencies from the repository root:

```bash
npm install
```

Build the `model-fetchers` library:

```bash
npm --workspace packages/model-fetchers run build
```

Run the `model-fetchers` tests:

```bash
npm --workspace packages/model-fetchers test
```

Package name:

- `@grn-core/model-fetchers`
