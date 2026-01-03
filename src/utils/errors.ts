export class WtError extends Error {
  constructor(
    message: string,
    public guidance?: string
  ) {
    super(message)
    this.name = 'WtError'
  }
}

export class WtWarning extends Error {
  constructor(
    message: string,
    public guidance?: string
  ) {
    super(message)
    this.name = 'WtWarning'
  }
}

export function formatError(message: string, guidance?: string): string {
  const output = [`✗ ${message}`]
  if (guidance) {
    output.push(`→ ${guidance}`)
  }
  return output.join('\n')
}

export function formatWarning(message: string, guidance?: string): string {
  const output = [`⚠ ${message}`]
  if (guidance) {
    output.push(`→ ${guidance}`)
  }
  return output.join('\n')
}

export function formatSuccess(message: string, extra?: string): string {
  const output = [`✓ ${message}`]
  if (extra) {
    output.push(`→ ${extra}`)
  }
  return output.join('\n')
}

export function handleError(error: unknown): void {
  if (error instanceof WtError) {
    console.log(formatError(error.message, error.guidance))
  } else if (error instanceof WtWarning) {
    console.log(formatWarning(error.message, error.guidance))
  } else if (error instanceof Error) {
    console.log(formatError(error.message))
  } else {
    console.log(formatError('Unknown error'))
  }
}
