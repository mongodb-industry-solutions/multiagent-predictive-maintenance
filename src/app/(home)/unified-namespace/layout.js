import { Suspense } from "react";
import UnifiedNamespaceDemoShell from "@/components/unifiedNamespaceNav/UnifiedNamespaceDemoShell";

export default function UnifiedNamespaceLayout({ children }) {
  return (
    <Suspense fallback={children}>
      <UnifiedNamespaceDemoShell>{children}</UnifiedNamespaceDemoShell>
    </Suspense>
  );
}
