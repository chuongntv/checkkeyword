const COUNTRY_PARAMS: Record<string, string> = {
  vn: "gl=vn&hl=vi",
  us: "gl=us&hl=en",
  uk: "gl=gb&hl=en",
  global: "",
}

export function buildGoogleUrl(keyword: string, country: string): string {
  const q = keyword.split(" ").join("+")
  const params = COUNTRY_PARAMS[country] ?? ""
  return `https://www.google.com/search?q=${q}&num=100${params ? "&" + params : ""}`
}
