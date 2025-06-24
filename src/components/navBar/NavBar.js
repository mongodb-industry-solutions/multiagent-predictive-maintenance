"use client";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const pathname = usePathname();
  const navLinks = [
    { href: "/", label: "Demo Overview" },
    { href: "/failure-prediction", label: "Failure Prediction" },
    { href: "/workorder-generation", label: "Workorder Generation" },
    { href: "/workorder-scheduler", label: "Workorder Scheduler" },
    { href: "/agent-sandbox", label: "Agent Sandbox" },
  ];

  return (
    <nav className="w-full bg-white shadow-md fixed top-0 left-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16 relative">
        <div className="flex-shrink-0 flex items-center absolute left-0 h-full">
          <Link href="/" className="flex items-center">
            <Image
              src="/file.svg"
              alt="Logo"
              width={32}
              height={32}
              className="mr-2"
            />
          </Link>
        </div>
        <div className="w-full flex justify-center">
          <div className="flex space-x-6">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-gray-700 hover:text-blue-600 font-medium transition-colors px-2 py-1 rounded-md ${
                  (href === "/" ? pathname === "/" : pathname.startsWith(href))
                    ? "bg-blue-100 text-blue-700 shadow-sm"
                    : ""
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
