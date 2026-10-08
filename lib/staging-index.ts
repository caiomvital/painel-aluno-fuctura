export function stagingIndexHeaders(
  environment = process.env.APP_ENV,
): Record<string, string> {
  return environment === "staging"
    ? {
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "X-Fuctura-Environment": "staging",
      }
    : {};
}
