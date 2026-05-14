import { Page } from "puppeteer"

const IN_URL = "https://2captcha.com/in.php"
const RES_URL = "https://2captcha.com/res.php"

function wait(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

function getApiKey() { return process.env.TWO_CAPTCHA_API_KEY || "" }
function isEnabled() { return process.env.TWO_CAPTCHA_ENABLED === "true" }

async function request2Captcha(params: Record<string, string>): Promise<string> {
  const url = `${IN_URL}?${new URLSearchParams(params).toString()}`
  const res = await fetch(url)
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch {
    if (text.startsWith("OK|")) data = { status: 1, request: text.split("|")[1] }
    else throw new Error(`2Captcha in.php invalid response: ${text}`)
  }
  if (data.status !== 1) throw new Error(`2Captcha in.php error: ${data.request || text}`)
  return data.request
}

async function poll2Captcha(requestId: string, timeoutMs = 120000, intervalMs = 5000): Promise<string> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    await wait(intervalMs)
    const url = `${RES_URL}?${new URLSearchParams({ key: getApiKey(), action: "get", id: requestId, json: "1" }).toString()}`
    const res = await fetch(url)
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch {
      if (text.startsWith("OK|")) data = { status: 1, request: text.split("|")[1] }
      else continue
    }
    if (data.status === 1) return data.request
    if (data.request !== "CAPCHA_NOT_READY") throw new Error(`2Captcha res.php error: ${data.request}`)
  }
  throw new Error("2Captcha timeout while waiting for solution")
}

async function getRecaptchaInfo(page: Page) {
  try {
    for (const f of page.frames()) {
      const url = f.url()
      if (url && /recaptcha\/api2\/(?:anchor|enterprise)/.test(url)) {
        const u = new URL(url)
        const k = u.searchParams.get("k")
        if (k) return {
          sitekey: k,
          isEnterprise: /enterprise/.test(url),
          stoken: u.searchParams.get("s"),
          isInvisible: u.searchParams.get("size") === "invisible",
        }
      }
    }
    const info = await page.evaluate(() => {
      const el = document.querySelector("[data-sitekey]")
      if (!el) return null
      return {
        sitekey: el.getAttribute("data-sitekey"),
        isEnterprise: !!document.querySelector('script[src*="recaptcha/enterprise"], iframe[src*="recaptcha/enterprise"]'),
        stoken: el.getAttribute("data-s"),
        isInvisible: (el.getAttribute("data-size") || "").toLowerCase() === "invisible",
      }
    })
    if (info?.sitekey) return info
  } catch {}
  return null
}

async function injectRecaptchaToken(page: Page, token: string) {
  await page.evaluate((tkn: string) => {
    const setVal = (sel: string) => { document.querySelectorAll(sel).forEach((el: any) => { el.value = tkn; el.innerHTML = tkn }) }
    setVal('textarea#g-recaptcha-response')
    setVal('textarea[name="g-recaptcha-response"]')
    setVal('textarea[name="g-recaptcha-response-100000"]')
    // Google sorry page uses submitCallback via data-callback
    try {
      if (typeof (window as any).submitCallback === 'function') {
        (window as any).submitCallback(tkn)
        return
      }
    } catch {}

    const submit = document.querySelector('button[type="submit"], input[type="submit"], #submit, #recaptcha-verify-button')
    if (submit) (submit as HTMLElement).click()
    const form = document.querySelector("form")
    if (form && typeof form.submit === "function") form.submit()
  }, token)
}

async function solveRecaptchaV2(page: Page): Promise<boolean> {
  const info = await getRecaptchaInfo(page)
  if (!info?.sitekey) return false
  if (!isEnabled() || !getApiKey()) return false

  const ua = await page.evaluate(() => navigator.userAgent)
  const params: Record<string, string> = {
    key: getApiKey(), method: "userrecaptcha", googlekey: info.sitekey,
    pageurl: page.url(), json: "1", userAgent: ua,
  }
  if (info.isEnterprise) params.enterprise = "1"
  if (info.stoken) params["data-s"] = info.stoken
  if (info.isInvisible) params.invisible = "1"

  const requestId = await request2Captcha(params)
  const solution = await poll2Captcha(requestId)
  await injectRecaptchaToken(page, solution)
  await wait(2000)
  return true
}

async function solveImageCaptcha(page: Page): Promise<boolean> {
  if (!isEnabled() || !getApiKey()) return false

  // Google sorry page uses specific selectors
  const handle = await page.$(
    'img[src*="captcha"], img[src*="/sorry/"], img[src*="Captcha"], img[alt*="captcha" i], ' +
    '#captcha_image img, .captcha_image img, form img[src*="data:image"]'
  )
  const inputHandle = await page.$(
    'input[name="captcha"], input#captcha, input[name="g-recaptcha-response"], ' +
    'input[name="answer"], input#captchainput, input[type="text"]'
  )
  if (!handle || !inputHandle) {
    console.log(`[Captcha] Image captcha elements not found (img=${!!handle}, input=${!!inputHandle})`)
    return false
  }

  console.log(`[Captcha] Found image captcha, sending to 2Captcha...`)
  const buffer = await handle.screenshot({ encoding: "binary" })
  const base64 = Buffer.from(buffer as any).toString("base64")
  const requestId = await request2Captcha({ key: getApiKey(), method: "base64", body: base64, json: "1" })
  console.log(`[Captcha] 2Captcha request ID: ${requestId}, waiting for solution...`)
  const solution = await poll2Captcha(requestId)
  console.log(`[Captcha] Solution received, submitting...`)

  await inputHandle.focus()
  await page.keyboard.type(solution)

  // Try clicking submit button first, then fallback to form submit
  const submitBtn = await page.$('input[type="submit"], button[type="submit"], #captcha_submit')
  if (submitBtn) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0", timeout: 120000 }).catch(() => {}),
      submitBtn.click(),
    ])
  } else {
    const formHandle = await page.$("form")
    if (formHandle) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0", timeout: 120000 }).catch(() => {}),
        page.evaluate(() => { const f = document.querySelector("form"); if (f && typeof f.submit === "function") f.submit() }),
      ])
    }
  }
  return true
}

export async function solveCaptchaIfPresent(page: Page): Promise<boolean> {
  try {
    const html = await page.content()
    const hasCaptcha = /recaptcha|g-recaptcha|our systems have detected unusual traffic|sorry|id\=recaptcha/i.test(html)
    if (!hasCaptcha) return false

    console.log(`[Captcha] Captcha detected on ${page.url().slice(0, 80)}...`)
    if (await solveRecaptchaV2(page)) return true
    if (await solveImageCaptcha(page)) return true
    console.log(`[Captcha] Could not solve captcha (no matching elements or not enabled)`)
    return false
  } catch (e) {
    console.log(`[Captcha] Error solving captcha:`, (e as Error).message)
    return false
  }
}
