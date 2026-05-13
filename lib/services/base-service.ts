export abstract class BaseService<TInput, TOutput> {
  abstract call(input: TInput): Promise<TOutput>

  protected handleError(error: unknown): never {
    if (error instanceof ServiceError) throw error
    if (error instanceof Error) throw new ServiceError(error.message, error)
    throw new ServiceError('Unknown error')
  }
}

export class ServiceError extends Error {
  code?: string

  constructor(message: string, public originalError?: Error, code?: string) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
  }
}
