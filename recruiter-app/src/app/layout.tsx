import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Link from "next/link";
import {
  Search,
  Heart,
  BarChart3,
  Activity,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Creator Recruiter",
  description: "OnlyFans creator discovery and recruitment CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <div className="min-h-screen flex">
            {/* Sidebar */}
            <nav className="w-16 lg:w-56 bg-card border-r flex flex-col items-center lg:items-stretch py-4 px-2 lg:px-4 flex-shrink-0">
              <div className="font-bold text-lg mb-8 hidden lg:block text-primary">
                Recruiter
              </div>
              <div className="font-bold text-lg mb-8 lg:hidden text-primary">
                R
              </div>
              <div className="space-y-1 flex-1">
                {[
                  { href: "/", icon: Search, label: "Discover" },
                  { href: "/pipeline", icon: Heart, label: "Pipeline" },
                  { href: "/analytics", icon: BarChart3, label: "Analytics" },
                  { href: "/favorites", icon: Activity, label: "Activity" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
