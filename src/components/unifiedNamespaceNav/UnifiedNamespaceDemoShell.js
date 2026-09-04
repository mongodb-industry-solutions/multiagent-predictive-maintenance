"use client";

import { usePathname } from "next/navigation";
import UnifiedNamespaceNav from "./UnifiedNamespaceNav";

export default function UnifiedNamespaceDemoShell({ children }) {
  const pathname = usePathname();
  const isDemoRoute = pathname === "/unified-namespace/uns-in-action";

  if (!isDemoRoute) return children;

  return (
    <div className="flex min-h-0 w-full flex-1 items-start">
      <UnifiedNamespaceNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
