import { NextResponse } from "next/server";

const ALLOWED_ROUTES = {
  GET: [
    /^api\/status$/,
    /^api\/orders$/,
    /^api\/orders\/[^/]+$/,
    /^api\/machines\/events$/,
    /^api\/production-units$/,
    /^api\/alerts$/,
    /^api\/metrics\/overview$/,
    /^api\/machines\/laser-welding\/thresholds$/,
    /^scada\/[^/]+\/api\/state$/,
  ],
  POST: [
    /^api\/orders\/create$/,
    /^api\/orders\/stop$/,
    /^api\/machines\/laser-welding\/thresholds$/,
    /^api\/machines\/laser-welding\/metrics$/,
    /^scada\/[^/]+\/api\/start$/,
    /^scada\/[^/]+\/api\/stop$/,
  ],
};

function isAllowed(method, path) {
  return (ALLOWED_ROUTES[method] || []).some((pattern) => pattern.test(path));
}

function errorMessage(payload, fallback) {
  const detail = payload?.detail || payload?.error;
  if (typeof detail === "string") return detail.replace(/^['"]|['"]$/g, "");
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => entry?.msg)
      .filter(Boolean)
      .join(", ");
  }
  return fallback;
}

async function proxyFactoryRequest(request, context) {
  const { path: segments = [] } = await context.params;
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");
  const method = request.method.toUpperCase();

  if (!isAllowed(method, path)) {
    return NextResponse.json(
      { error: "Factory simulator route is not allowed" },
      { status: 404 }
    );
  }

  const configuredBaseUrl = process.env.FACTORY_SIMULATOR_API_URL;
  if (!configuredBaseUrl) {
    return NextResponse.json(
      {
        error:
          "Leafy Factory is not configured. Set FACTORY_SIMULATOR_API_URL.",
      },
      { status: 503 }
    );
  }

  let upstreamUrl;
  try {
    const baseUrl = new URL(configuredBaseUrl);
    const query = new URL(request.url).search;
    upstreamUrl = new URL(`${path}${query}`, `${baseUrl.toString().replace(/\/?$/, "/")}`);
  } catch {
    return NextResponse.json(
      { error: "FACTORY_SIMULATOR_API_URL is invalid" },
      { status: 500 }
    );
  }

  const isOrderCreation = path === "api/orders/create";
  const timeoutMs = isOrderCreation ? 75000 : 12000;
  const options = {
    method,
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await request.text();
    options.body = body;
    options.headers["Content-Type"] =
      request.headers.get("content-type") || "application/json";
  }

  try {
    const response = await fetch(upstreamUrl, options);
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: errorMessage(
            payload,
            `Factory simulator returned ${response.status}`
          ),
        },
        { status: response.status }
      );
    }

    return NextResponse.json(
      payload && typeof payload === "object" ? payload : {},
      { status: response.status }
    );
  } catch (error) {
    const timedOut = error?.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timedOut
          ? "Factory simulator request timed out"
          : "Factory simulator is unavailable",
      },
      { status: timedOut ? 504 : 502 }
    );
  }
}

export function GET(request, context) {
  return proxyFactoryRequest(request, context);
}

export function POST(request, context) {
  return proxyFactoryRequest(request, context);
}
