"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/brand/logo";
import { AnimatedIcon } from "@/components/ui/motion";
import {
  LayoutDashboard,
  FlaskConical,
  BookOpen,
  GraduationCap,
  Calendar,
  CalendarDays,
  FileQuestion,
  Bell,
  Users,
  Menu,
  X,
  ClipboardList,
  LogOut,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlobalSearch } from "@/components/layout/global-search";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planning", label: "Month Planning", icon: CalendarDays },
  { href: "/research", label: "Research Projects", icon: FlaskConical },
  { href: "/publications", label: "Publications", icon: BookOpen },
  { href: "/teaching", label: "Teaching Planner", icon: GraduationCap },
  { href: "/timetable", label: "Class Timetable", icon: Calendar },
  { href: "/exams", label: "Exams & Marks", icon: ClipboardList },
  { href: "/question-papers", label: "Question Papers", icon: FileQuestion },
  { href: "/calendar", label: "Google Calendar", icon: Calendar },
  { href: "/people", label: "People", icon: Users },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  const NavContent = () => (
    <>
      <div className="border-b border-teal-800/30 px-6 py-6">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <p className="text-sm font-semibold text-white">ScholarDesk</p>
            <p className="text-xs text-teal-200/70">Dr. Hari Prakash</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <GlobalSearch />
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-teal-100/70 hover:bg-white/5 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-white/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <AnimatedIcon className="relative inline-flex">
                <Icon className="relative h-4 w-4 shrink-0" />
              </AnimatedIcon>
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-teal-800/30 p-4 space-y-2">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-teal-200/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
        <p className="text-xs text-teal-200/50">
          Public Health · Research & Teaching
        </p>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-teal-800 p-2 text-white shadow-lg lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-teal-900 via-teal-900 to-teal-950 lg:flex">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-gradient-to-b from-teal-900 to-teal-950 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-teal-200 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
