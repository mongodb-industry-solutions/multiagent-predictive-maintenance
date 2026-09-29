"use client";

import { ViaProvider } from "@via-ds/components";

export default function Providers({ children }) {
  return <ViaProvider colorScheme="light">{children}</ViaProvider>;
}
