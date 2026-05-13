import IORedis from 'ioredis'

let client: IORedis | null = null

export function getRedis(): IORedis {
  if (!client) {
    client = new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null, // Required by BullMQ
    })
  }
  return client
}
