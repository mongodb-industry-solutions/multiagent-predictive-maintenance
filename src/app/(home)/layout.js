"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/navBar/NavBar";

export default function HomeLayout({ children }) {
  const pathname = usePathname();
  const isUnifiedNamespaceDemo =
    pathname === "/unified-namespace/uns-in-action";

  return (
    <>
      <Navbar />
      <div className="pt-16">
        <div className="h-[calc(100vh-4rem)] w-full overflow-y-auto">
          <div
            className={
              isUnifiedNamespaceDemo
                ? "flex h-full w-full flex-col"
                : "mx-auto flex h-full w-full max-w-[1800px] flex-col px-2 py-3 sm:px-4 md:px-6 lg:px-8"
            }
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
