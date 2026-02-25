export type GeoData = {
  city: null | string
  countryCode: null | string
  region: null | string
}

// GeoIP lookup using MaxMind GeoLite2
// For production: download GeoLite2-City.mmdb from MaxMind and place in project root.
// For now, returns a lightweight IP-to-country based on request headers.
export const lookupGeo = (ip: string, headers: Headers): GeoData => {
  const country =
    headers.get('cf-ipcountry') ??
    headers.get('x-vercel-ip-country') ??
    headers.get('x-country-code') ??
    null

  const region =
    headers.get('x-vercel-ip-country-region') ??
    headers.get('x-region-code') ??
    null

  const city = headers.get('x-vercel-ip-city') ?? headers.get('x-city') ?? null

  if (country !== null) {
    return { city, countryCode: country, region }
  }

  // Fallback: will be replaced with mmdb lookup when MaxMind DB is available
  void ip
  return { city: null, countryCode: null, region: null }
}
