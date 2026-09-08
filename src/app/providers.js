"use client";

import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider";

export default function Providers({ children }) {
  return <LeafyGreenProvider baseFontSize={16}>{children}</LeafyGreenProvider>;
}
