"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@leafygreen-ui/icon";
import { SideNav, SideNavGroup, SideNavItem } from "@leafygreen-ui/side-nav";

const UNS_VIEWS = new Set(["operations", "condition", "analytics"]);

export default function UnifiedNamespaceNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(true);
  const isUnsAction = pathname === "/unified-namespace/uns-in-action";
  const requestedView = searchParams.get("view");
  const activeView = UNS_VIEWS.has(requestedView)
    ? requestedView
    : "operations";

  return (
    <SideNav
      aria-label="Unified Namespace demo navigation"
      baseFontSize={16}
      widthOverride={225}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      className="sticky top-0 z-[70] h-[calc(100vh-4rem)] shrink-0"
    >
      <SideNavGroup
        header="UNS in action"
        glyph={<Icon glyph="Database" size={20} />}
        hasActiveItem={isUnsAction}
      >
        <SideNavItem
          as={Link}
          href="/unified-namespace/uns-in-action?view=operations"
          active={isUnsAction && activeView === "operations"}
        >
          Operations
        </SideNavItem>
        <SideNavItem
          as={Link}
          href="/unified-namespace/uns-in-action?view=condition"
          active={isUnsAction && activeView === "condition"}
        >
          Condition Monitoring
        </SideNavItem>
        <SideNavItem
          as={Link}
          href="/unified-namespace/uns-in-action?view=analytics"
          active={isUnsAction && activeView === "analytics"}
        >
          Analytics
        </SideNavItem>
      </SideNavGroup>
    </SideNav>
  );
}
