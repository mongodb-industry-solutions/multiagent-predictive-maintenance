"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import AgenticDemoStepper, {
  isAgenticDemoPath,
} from "@/components/agenticDemoStepper/AgenticDemoStepper";
import AgenticSourceProvider from "@/components/agenticSourceProvider/AgenticSourceProvider";

export default function AgenticAiLayout({ children }) {
  const pathname = usePathname();

  if (!isAgenticDemoPath(pathname)) {
    return children;
  }

  return (
    <AgenticSourceProvider>
      <div className="flex h-full flex-col">
        <AgenticDemoStepper />
        <div className="mt-2 min-h-0 flex-1 overflow-hidden [&>*]:h-full">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>
    </AgenticSourceProvider>
  );
}
