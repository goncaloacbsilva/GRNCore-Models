import axios, { type AxiosInstance } from 'axios'

const GINSIM_GITHUB_API_BASE_URL =
    'https://api.github.com/repos/GINsim/GINsim.github.io'
const GINSIM_RAW_BASE_URL =
    'https://raw.githubusercontent.com/GINsim/GINsim.github.io/master'
const GINSIM_BRANCH = 'master'
const GINSIM_MODELS_PATH = 'models'

type GithubCommitResponse = Array<{
    sha?: string
}>

export type GinsimGithubContentItem = {
    name: string
    path: string
    type: 'file' | 'dir' | string
    download_url?: string | null
}

type GithubTreeResponse = {
    tree?: GinsimGithubTreeItem[]
}

export type GinsimGithubTreeItem = {
    path: string
    type: 'blob' | 'tree' | string
}

export class GinsimApiClient {
    constructor(
        private readonly apiClient: AxiosInstance = axios.create({
            baseURL: GINSIM_GITHUB_API_BASE_URL,
            timeout: 30000,
        }),
        private readonly rawClient: AxiosInstance = axios.create({
            baseURL: GINSIM_RAW_BASE_URL,
            timeout: 30000,
        })
    ) {}

    async fetchModelsCommit(): Promise<string> {
        const response = await this.apiClient.get<GithubCommitResponse>('/commits', {
            params: {
                path: GINSIM_MODELS_PATH,
                sha: GINSIM_BRANCH,
                per_page: 1,
            },
        })

        const sha = response.data[0]?.sha
        if (!sha) {
            throw new Error('Could not resolve GINsim models commit from GitHub API')
        }

        return sha
    }

    async listDirectory(path: string): Promise<GinsimGithubContentItem[]> {
        const response = await this.apiClient.get<GinsimGithubContentItem[]>(
            `/contents/${path}`,
            {
                params: {
                    ref: GINSIM_BRANCH,
                },
            }
        )

        if (!Array.isArray(response.data)) {
            throw new Error(`GINsim GitHub path ${path} did not return a directory`)
        }

        return response.data
    }

    async fetchModelsTree(): Promise<GinsimGithubTreeItem[]> {
        const response = await this.apiClient.get<GithubTreeResponse>(
            `/git/trees/${GINSIM_BRANCH}`,
            {
                params: {
                    recursive: 1,
                },
            }
        )

        return response.data.tree?.filter((item) => item.path.startsWith('models/')) ?? []
    }

    async fetchTextFile(path: string): Promise<string> {
        const response = await this.rawClient.get<string>(`/${path}`, {
            responseType: 'text',
        })

        return response.data
    }
}

export function buildGinsimRawDownloadUrl(sourcePath: string): string {
    return `${GINSIM_RAW_BASE_URL}/${sourcePath}`
}
