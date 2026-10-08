import { appOrigin } from "./production-config";
export function permittedMutation(
  request: Request,
  configuredOrigin?: string,
  production = process.env.NODE_ENV === "production",
) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || origin === "null") return false;
  if (!origin) return !production;
  try {
    const configured = configuredOrigin ?? appOrigin(undefined, production);
    // Next dev can normalize request.url to localhost; Host retains the actual browser origin.
    const url = new URL(request.url);
    const host = request.headers.get("host");
    const developmentOrigin = host
      ? new URL(`${url.protocol}//${host}`).origin
      : url.origin;
    return origin === (configured ?? developmentOrigin);
  } catch {
    return false;
  }
}
