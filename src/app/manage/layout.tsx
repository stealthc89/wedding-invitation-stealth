"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

const NAV_ITEMS = [
  { href: "/manage/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/manage/guests", label: "Guests", icon: "👥" },
  { href: "/manage/challenges", label: "Challenges", icon: "🎯" },
  { href: "/manage/photos", label: "Photos", icon: "📷" },
  { href: "/manage/templates", label: "Templates", icon: "✉️" },
  { href: "/manage/media", label: "Media", icon: "🖼️" },
  { href: "/manage/settings", label: "Settings", icon: "⚙️" },
  { href: "/manage/help", label: "Help", icon: "❓" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const device = useDeviceDetection();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => setAuthenticated(true))
      .catch(() => {
        if (pathname !== "/manage/login") {
          router.push("/manage/login");
        }
        setAuthenticated(false);
      });
  }, [pathname, router]);

  if (pathname === "/manage/login") {
    return <>{children}</>;
  }

  if (authenticated === null) {
    return (
      <div className="admin-layout min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!authenticated) return null;

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/manage/login");
  }

  return (
    <div className="admin-layout min-h-screen bg-gray-50">
      {/* Desktop & Tablet Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo and Desktop Nav */}
          <div className="flex items-center gap-4 lg:gap-6 flex-1">
            <span className="font-bold text-gray-800 text-base lg:text-lg whitespace-nowrap">
              Wedding Admin
            </span>

            {/* Desktop Navigation (hidden on mobile) */}
            {!device.isMobile && (
              <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm whitespace-nowrap ${
                      pathname === item.href
                        ? "text-gray-900 font-medium"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span className="hidden lg:inline">{item.icon} </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 whitespace-nowrap"
            >
              {device.isMobile ? "🚪" : "Logout"}
            </button>

            {/* Mobile Menu Button */}
            {device.isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>

      </nav>

      {/* Mobile Menu Dropdown - Fixed positioning outside nav to prevent sticky positioning issues */}
      {device.isMobile && mobileMenuOpen && (
        <div className="fixed top-[57px] left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40">
          <div className="py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-base ${
                  pathname === item.href
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">{children}</main>
    </div>
  );
}
