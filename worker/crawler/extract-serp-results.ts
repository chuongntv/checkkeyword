import { Page } from "puppeteer"

export function findDomainPosition(links: string[], targetDomain: string): number | null {
  const normalized = targetDomain.replace(/^www\./, "").toLowerCase()
  for (let i = 0; i < links.length; i++) {
    try {
      const hostname = new URL(links[i]).hostname.replace(/^www\./, "").toLowerCase()
      if (hostname === normalized) return i + 1
    } catch { continue }
  }
  return null
}

export async function extractSerpResults(page: Page): Promise<{ links: string[]; domains: string[] }> {
  const links: string[] = []
  const domains = new Set<string>()

  // Remove ads
  for (const sel of ["#tvcap", "#tadsb"]) {
    try { await page.evaluate((s: string) => document.querySelectorAll(s).forEach((el: Element) => el.remove()), sel) } catch {}
  }

  const results = await page.evaluate(() => {
    const items: { href: string; hostname: string }[] = []
    document.querySelectorAll('a[jsname="UWckNb"]').forEach((el) => {
      const a = el as HTMLAnchorElement
      try { items.push({ href: a.href, hostname: new URL(a.href).hostname }) } catch {}
    })
    return items
  })

  for (const r of results) {
    if (!r.hostname || r.hostname.toLowerCase().includes("youtube")) continue
    links.push(r.href)
    domains.add(r.hostname)
  }

  return { links, domains: Array.from(domains) }
}
