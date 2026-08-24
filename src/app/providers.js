"use client";

import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider";
import FactoryDataProvider from "@/components/factoryDataProvider/FactoryDataProvider";

export default function Providers({ children }) {
  return (
    <LeafyGreenProvider baseFontSize={16}>
      <FactoryDataProvider>{children}</FactoryDataProvider>
    </LeafyGreenProvider>
  );
}
