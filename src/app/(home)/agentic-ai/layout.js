"use client";

import { usePathname } from "next/navigation";
import AgenticDemoStepper, {
  isAgenticDemoPath,
} from "@/components/agenticDemoStepper/AgenticDemoStepper";

export default function AgenticAiLayout({ children }) {
  const pathname = usePathname();

  if (!isAgenticDemoPath(pathname)) {
    return children;
  }

  return (
    <div className="flex h-full flex-col">
      <AgenticDemoStepper />
      <div className="mt-2 min-h-0 flex-1 overflow-hidden [&>*]:h-full">
        {children}
      </div>
    </div>
  );
}
