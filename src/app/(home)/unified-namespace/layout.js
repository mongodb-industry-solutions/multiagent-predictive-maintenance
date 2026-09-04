import { Suspense } from "react";

// Suspense boundary so pages under /unified-namespace can read search params
// (e.g. `?view=analytics`) without blocking static rendering.
export default function UnifiedNamespaceLayout({ children }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
