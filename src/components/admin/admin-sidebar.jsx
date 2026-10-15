"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Image from "next/image";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  Landmark,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { href: "/manage", label: "Dashboard", icon: LayoutDashboard },
  { href: "/manage/reservations", label: "Reservations", icon: CalendarCheck },
  { href: "/manage/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/manage/courts", label: "Courts", icon: Landmark },
  { href: "/manage/customers", label: "Customers", icon: Users },
  { href: "/manage/payments", label: "Payments", icon: CreditCard },
  { href: "/manage/reports", label: "Reports", icon: BarChart3 },
  { href: "/manage/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;
  const initial = (user?.user_metadata?.full_name || user?.email || "A")[0].toUpperCase();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Logged out");
    router.push("/");
    router.refresh();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <Link href="/manage" className="flex items-center gap-2">
          <Image
            src="/wardologo.png"
            alt="Court ni Wardo Logo"
            width={36}
            height={36}
            className="object-contain"
            style={{ mixBlendMode: "screen" }}
          />
          <span className="text-xl font-bold text-white">Court ni Wardo</span>
        </Link>
        <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/manage"
              ? pathname === "/manage"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-green-600/20 text-green-400"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 bg-green-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-green-500/30">
            {avatarUrl && !avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={user?.user_metadata?.full_name || "Admin"}
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.user_metadata?.full_name || "Admin"}
            </p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 h-14 flex items-center px-4 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="inline-flex items-center justify-center h-10 w-10 text-white hover:bg-white/10 rounded-md">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-gray-900 border-gray-800">
            {sidebarContent}
          </SheetContent>
        </Sheet>
        <Link href="/manage" className="flex items-center gap-2 ml-2">
          <Image
            src="/wardologo.png"
            alt="Court ni Wardo Logo"
            width={30}
            height={30}
            className="object-contain"
            style={{ mixBlendMode: "screen" }}
          />
          <span className="font-bold text-white">Court ni Wardo Admin</span>
        </Link>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-gray-900 flex-col z-40">
        {sidebarContent}
      </aside>

      {/* Spacer for mobile header */}
      <div className="h-14 md:hidden" />
    </>
  );
}
