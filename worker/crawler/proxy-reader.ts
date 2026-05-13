import { ProxyModel } from "@/models/proxy.model"
import { connectDB } from "@/lib/db/mongoose"

type ProxyInfo = { host: string; port: number; username: string; password: string }

export async function getProxiesForCountry(country: string): Promise<ProxyInfo[]> {
  await connectDB()
  const proxies = await ProxyModel.find({ countries: country, isActive: true }).lean()
  return proxies.sort(() => Math.random() - 0.5).map((p) => ({
    host: p.host,
    port: p.port,
    username: p.username,
    password: p.password,
  }))
}

export function getRandomProxy(proxies: ProxyInfo[]): ProxyInfo | null {
  if (!proxies || proxies.length === 0) return null
  return proxies[Math.floor(Math.random() * proxies.length)]
}
