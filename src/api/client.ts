import axios from 'axios'

// Same origin: the API lives in this Next.js app under /api/v1, so the
// httpOnly session cookie is sent automatically.
export const axiosClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  body: T
}

export interface FieldIssue {
  path: string
  message: string
}

/** Thrown for any failed request. `status` and `details` let forms map errors to fields. */
export class ApiError extends Error {
  status?: number
  details?: FieldIssue[]
  constructor(message: string, status?: number, details?: FieldIssue[], cause?: unknown) {
    super(message, { cause })
    this.status = status
    this.details = details
  }
}

async function request<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  try {
    const response = await axiosClient.request<ApiResponse<T>>({ method, url: path, data: body, headers })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const { message, details } = (error.response.data ?? {}) as { message?: string; details?: FieldIssue[] }
      throw new ApiError(message || 'Request failed', error.response.status, details, error)
    }
    throw new ApiError("Can't reach the server. Check your connection and try again.", undefined, undefined, error)
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
  /** Sends a file as the raw request body (not JSON, not multipart). */
  upload: <T>(path: string, file: Blob) => request<T>('PUT', path, file, { 'Content-Type': file.type || 'application/octet-stream' }),
}
