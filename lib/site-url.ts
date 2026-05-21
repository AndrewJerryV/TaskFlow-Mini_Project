export function getSiteUrl(path = '/') {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL;

  const baseUrl =
    envUrl && envUrl.length > 0
      ? envUrl.startsWith('http')
        ? envUrl
        : `https://${envUrl}`
      : typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:3000';

  const normalizedBaseUrl = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}
