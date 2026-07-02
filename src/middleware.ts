import { defineMiddleware } from "astro:middleware";

const adminApiPaths = new Set([
  "/api/worldcup/gaps",
  "/api/worldcup/manual-features",
]);

const parseCookie = (cookieHeader: string | null) => {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) cookies.set(key, decodeURIComponent(rest.join("=") || ""));
  }
  return cookies;
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, searchParams } = context.url;
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminApi = adminApiPaths.has(pathname);

  if (!isAdminRoute && !isAdminApi) {
    return next();
  }

  const adminToken = import.meta.env.ADMIN_ACCESS_TOKEN;
  if (!adminToken) {
    if (import.meta.env.DEV) {
      return next();
    }

    return new Response("Not found", { status: 404 });
  }

  const cookies = parseCookie(context.request.headers.get("cookie"));
  const queryToken = searchParams.get("admin_token") || "";
  const headerToken = context.request.headers.get("x-admin-token") || "";
  const cookieToken = cookies.get("admin_token") || "";
  const isAllowed = [queryToken, headerToken, cookieToken].some((token) => token === adminToken);

  if (!isAllowed) {
    return new Response("Not found", { status: 404 });
  }

  const response = await next();
  response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  response.headers.set("cache-control", "no-store");

  if (queryToken === adminToken) {
    response.headers.append(
      "set-cookie",
      `admin_token=${encodeURIComponent(adminToken)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`,
    );
  }

  return response;
});
