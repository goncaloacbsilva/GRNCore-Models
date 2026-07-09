# GRNCore Community Models Catalog

This repository hosts public model catalogs and model-fetching utilities for GRNCore community model sources.

## Supported Sources

- BioModels
  - Website: https://www.biomodels.org/
  - Documentation: https://www.biomodels.org/docs/

## Model Fetchers Library

Package name:

- `@grn-core/model-fetchers`

The library is published by this repository's GitHub Actions workflow as a Node package tarball artifact.

To include it in a project, install the package tarball published in the repository releases:

- https://github.com/goncaloacbsilva/GRNCore-Models/releases

Example:

```bash
npm install https://github.com/goncaloacbsilva/GRNCore-Models/releases/download/<tag>/grn-core-model-fetchers-<version>.tgz
```

The library provides:

- source-specific model fetchers
- catalog fetching for the supported public sources in this repository
