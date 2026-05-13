const requiredEnvVars = [
  'MONGODB_URI',
  'REDIS_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'ADMIN_EMAILS',
] as const

const optionalEnvVars = [
  'TWO_CAPTCHA_API_KEY',
  'TWO_CAPTCHA_ENABLED',
  'CHROME_PATH',
  'USER_PROFILE_SLOTS',
] as const

export type RequiredEnvVars = (typeof requiredEnvVars)[number]
export type OptionalEnvVars = (typeof optionalEnvVars)[number]

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Run validation on import
validateEnv()

export function getEnv(key: RequiredEnvVars): string
export function getEnv(key: OptionalEnvVars): string | undefined
export function getEnv(key: string): string | undefined
export function getEnv(key: string): string | undefined {
  return process.env[key]
}

export const env = {
  get MONGODB_URI() { return process.env.MONGODB_URI! },
  get REDIS_URL() { return process.env.REDIS_URL! },
  get NEXTAUTH_SECRET() { return process.env.NEXTAUTH_SECRET! },
  get NEXTAUTH_URL() { return process.env.NEXTAUTH_URL! },
  get ADMIN_EMAILS() { return process.env.ADMIN_EMAILS!.split(',').map((e) => e.trim().toLowerCase()) },
  get TWO_CAPTCHA_API_KEY() { return process.env.TWO_CAPTCHA_API_KEY },
  get TWO_CAPTCHA_ENABLED() { return process.env.TWO_CAPTCHA_ENABLED === 'true' },
  get CHROME_PATH() { return process.env.CHROME_PATH },
  get USER_PROFILE_SLOTS() { return parseInt(process.env.USER_PROFILE_SLOTS ?? '50', 10) },
} as const
