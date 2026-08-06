export function encodeGinsimModelId(sourcePath: string): string {
    return Buffer.from(sourcePath, 'utf8').toString('base64url')
}

export function decodeGinsimModelId(modelId: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(modelId)) {
        throw new Error(`Invalid GINsim model id: ${modelId}`)
    }

    const sourcePath = Buffer.from(modelId, 'base64url').toString('utf8')
    if (encodeGinsimModelId(sourcePath) !== modelId) {
        throw new Error(`Invalid GINsim model id: ${modelId}`)
    }

    assertSafeGinsimSourcePath(sourcePath)
    return sourcePath
}

export function assertSafeGinsimSourcePath(sourcePath: string): void {
    const parts = sourcePath.split('/')

    if (
        !sourcePath.startsWith('models/') ||
        sourcePath.includes('\\') ||
        parts.some((part) => part.length === 0 || part === '.' || part === '..')
    ) {
        throw new Error(`Unsafe GINsim model source path: ${sourcePath}`)
    }
}
