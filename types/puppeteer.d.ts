declare module "puppeteer" {
  // Minimal stubs — actual types come from puppeteer-real-browser at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Page = any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Element = any
}
