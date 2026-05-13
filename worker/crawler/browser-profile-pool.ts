import path from "path"
import fs from "fs/promises"

export class BrowserProfilePool {
  private rootDir: string
  private maxSlots: number
  private prefix: string
  private inUse = new Set<string>()
  private byJob = new Map<string, { dir: string; lockPath: string }>()

  constructor(options?: { rootDir?: string; maxSlots?: number }) {
    this.rootDir = options?.rootDir ?? path.resolve(process.cwd(), "worker/user_data")
    this.maxSlots = options?.maxSlots ?? parseInt(process.env.USER_PROFILE_SLOTS ?? "50", 10)
    this.prefix = "profile-"
  }

  private async ensureDir(dir: string) {
    try { await fs.mkdir(dir, { recursive: true }) } catch {}
  }

  private async lockExists(lockPath: string): Promise<boolean> {
    try { await fs.stat(lockPath); return true } catch (e: any) { return e?.code !== "ENOENT" }
  }

  async acquire(jobKey: string): Promise<{ jobKey: string; dir: string }> {
    if (!jobKey) jobKey = `job-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const existing = this.byJob.get(jobKey)
    if (existing) return { jobKey, dir: existing.dir }

    await this.ensureDir(this.rootDir)

    for (let i = 1; i <= this.maxSlots; i++) {
      const dir = path.join(this.rootDir, `${this.prefix}${i}`)
      const lockPath = path.join(dir, ".lock")
      await this.ensureDir(dir)

      try {
        const fh = await fs.open(lockPath, "wx")
        try { await fh.writeFile(JSON.stringify({ pid: process.pid, ts: Date.now(), jobKey })) } finally { await fh.close() }
        this.inUse.add(dir)
        this.byJob.set(jobKey, { dir, lockPath })
        return { jobKey, dir }
      } catch (e: any) {
        if (e?.code === "EEXIST") continue
        continue
      }
    }

    // Fallback when pool exhausted
    const unique = `${this.prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const dir = path.join(this.rootDir, unique)
    const lockPath = path.join(dir, ".lock")
    await this.ensureDir(dir)
    await fs.writeFile(lockPath, `${process.pid}:${Date.now()}:${jobKey}`, { flag: "wx" })
    this.inUse.add(dir)
    this.byJob.set(jobKey, { dir, lockPath })
    return { jobKey, dir }
  }

  async release(jobKey: string) {
    const v = this.byJob.get(jobKey)
    if (!v) return
    try { await fs.unlink(v.lockPath) } catch {}
    this.inUse.delete(v.dir)
    this.byJob.delete(jobKey)
  }
}

export const browserProfilePool = new BrowserProfilePool()
