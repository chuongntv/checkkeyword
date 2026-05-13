import { connect } from "puppeteer-real-browser"
import { buildGoogleUrl } from "./google-url-builder"
import { getProxiesForCountry, getRandomProxy } from "./proxy-reader"
import { browserProfilePool } from "./browser-profile-pool"
import { solveCaptchaIfPresent } from "./captcha-solver"
import { extractSerpResults, findDomainPosition } from "./extract-serp-results"
import { CrawlerConfig } from "../../models/crawler-config.model"

const DEFAULT_DOMAINS_TARGET = 100
const MAX_PAGES = 30
const MAX_RETRIES = 30
const RETRY_DELAY = 15000
const CHROME_PATH = process.env.CHROME_PATH || "/usr/bin/google-chrome-stable"

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

function getRandomUserAgent() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] }

async function getDomainsTarget(): Promise<number> {
  try {
    const config = await CrawlerConfig.findOne({ key: "maxDomainsTarget" }).lean()
    return config ? parseInt(config.value, 10) || DEFAULT_DOMAINS_TARGET : DEFAULT_DOMAINS_TARGET
  } catch {
    return DEFAULT_DOMAINS_TARGET
  }
}

export type CrawlResult = {
  position: number | null
  links: string[]
  domains: string[]
  googleUrl: string
}

export async function crawlKeyword(
  keyword: string,
  domain: string,
  country: string,
  crawlJobId: string
): Promise<CrawlResult> {
  const googleUrl = buildGoogleUrl(keyword, country)
  const jobKey = `crawl:${crawlJobId}:${keyword}`
  const domainsTarget = await getDomainsTarget()

  let lastError: any
  let browser: any = null
  const profile = await browserProfilePool.acquire(jobKey)

  try {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const proxies = await getProxiesForCountry(country)
      const proxy = getRandomProxy(proxies)
      console.log(`[Crawler] Proxy for "${keyword}": ${proxy ? proxy.host + ':' + proxy.port : 'none (direct)'}`)

      try {
        console.log(`[Crawler] Attempt ${attempt}/${MAX_RETRIES} - "${keyword}" (${country})`)

        const { browser: _browser, page } = await connect({
          headless: true,
          turnstile: true,
          disableXvfb: true,
          ignoreAllFlags: true,
          customConfig: {
            chromePath: CHROME_PATH,
          },
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--no-zygote", "--disable-gpu"],
          connectOption: { defaultViewport: null, protocolTimeout: 180000 },
          proxy: proxy ? { host: proxy.host, port: proxy.port, username: proxy.username, password: proxy.password } : undefined,
          plugins: [],
        } as any)

        browser = _browser

        await page.setViewport({ width: 1920, height: 1080 })
        await page.setDefaultNavigationTimeout(120000)
        await page.setDefaultTimeout(60000)

        try { await page.setUserAgent(getRandomUserAgent()) } catch {}

        await page.goto(googleUrl, { waitUntil: "networkidle2", timeout: 60000 })
        await sleep(5000)
        await solveCaptchaIfPresent(page)

        // Crawl pages
        let allLinks: string[] = []
        let allDomains: string[] = []
        let pageNum = 1

        while (allDomains.length < domainsTarget && pageNum <= MAX_PAGES) {
          await solveCaptchaIfPresent(page)
          const { links, domains } = await extractSerpResults(page)

          // Debug: dump page snippet if no results found
          if (links.length === 0 && pageNum === 1) {
            const title = await page.title().catch(() => "?")
            const url = page.url()
            const snippet = await page.evaluate(() => document.body?.innerText?.slice(0, 500) ?? "empty")
            console.log(`[Crawler] DEBUG "${keyword}" — title: ${title}, url: ${url}`)
            console.log(`[Crawler] DEBUG snippet: ${snippet.slice(0, 300)}`)
          }

          allLinks = [...new Set([...allLinks, ...links])]
          allDomains = [...new Set([...allDomains, ...domains])]

          if (allDomains.length >= domainsTarget) break

          try {
            const nextButton = await page.$("#pnnext")
            if (!nextButton) break
            const href = await page.evaluate((el: any) => el.getAttribute("href"), nextButton)
            if (!href) break

            await page.goto(new URL(href, page.url()).toString(), { waitUntil: "networkidle0", timeout: 120000 })
            await solveCaptchaIfPresent(page)
            await sleep(3000)
          } catch { break }

          pageNum++
        }

        const position = findDomainPosition(allLinks, domain)
        console.log(`[Crawler] "${keyword}" — found ${allLinks.length} links, ${allDomains.length} domains, target: ${domain}, position: ${position ?? "not found"}`)

        await browser.close()
        browser = null

        return { position, links: allLinks, domains: allDomains, googleUrl }
      } catch (error) {
        lastError = error
        console.log(`[Crawler] Attempt ${attempt} failed for "${keyword}":`, error)
        if (browser) { try { await browser.close() } catch {} browser = null }
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY)
      }
    }

    throw lastError
  } finally {
    if (browser) { try { await browser.close() } catch {} }
    await browserProfilePool.release(jobKey)
  }
}
