"use client";

import { useState } from "react";
import {
  ChevronDown,
  Crown,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTranslation } from "react-i18next";
import { usePostHog } from "posthog-js/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";
import { useResponsivePopover } from "@repo/ui/src/hooks/use-responsive-popover";

export default function UserDropdown() {
  const { t } = useTranslation();
  const { user } = useUser();
  const posthog = usePostHog();
  if (user?.id) posthog.identify(user.id);

  const [openPopover, setOpenPopover] = useState(false);
  const { signOut } = useClerk();
  const { Popover, PopoverContent, PopoverTrigger, isMobile } =
    useResponsivePopover();

  if (!user) return null;

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user.username
        ? user.username[0]!.toUpperCase()
        : "U";

  return (
    <div className="relative inline-block text-left">
      <Popover
        open={openPopover}
        onOpenChange={isMobile ? undefined : () => setOpenPopover(!openPopover)}
        onClose={isMobile ? () => setOpenPopover(false) : undefined}
      >
        <PopoverContent className="w-56 overflow-hidden rounded-xl border border-border/60 bg-card/95 p-0 shadow-xl shadow-black/30 backdrop-blur-xl sm:w-56 lg:p-0">
          {/* Profile header */}
          <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
            <Avatar className="h-9 w-9 ring-2 ring-primary/40">
              <AvatarImage src={user.imageUrl} alt={user.username ?? ""} />
              <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user.fullName || user.username || t("My Profile")}
              </p>
              {user.username && (
                <p className="truncate text-xs text-muted-foreground">
                  @{user.username}
                </p>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            <Link
              href="/subscriptions"
              onClick={() => setOpenPopover(false)}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-primary/10"
            >
              <Crown className="h-4 w-4 text-amber-400 transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium text-foreground/90">{t("Subscription")}</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setOpenPopover(false)}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-primary/10"
            >
              <Settings className="h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-45" />
              <span className="text-sm font-medium text-foreground/90">{t("Settings")}</span>
            </Link>

            <div className="mx-2 my-1 border-t border-border/30" />

            <button
              onClick={() => {
                setOpenPopover(false);
                signOut();
              }}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-red-400" />
              <span className="text-sm font-medium text-foreground/90 transition-colors group-hover:text-red-400">
                {t("Log out")}
              </span>
            </button>
          </div>
        </PopoverContent>

        <PopoverTrigger
          onClick={() => setOpenPopover(!openPopover)}
          className="flex items-center justify-center overflow-hidden rounded-full border-none outline-none transition-all duration-150 active:scale-95"
        >
          <button
            onClick={() => setOpenPopover(!openPopover)}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-card/60 py-1.5 pl-1.5 pr-3 backdrop-blur-sm transition-all duration-150 hover:border-primary/40 hover:bg-card/80 focus:outline-none active:scale-95"
          >
            <Avatar className="h-7 w-7 ring-1 ring-primary/30">
              <AvatarImage src={user.imageUrl} alt={user.username ?? ""} />
              <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-foreground/80 sm:inline">
              {user.firstName || user.username || t("Account")}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
      </Popover>
    </div>
  );
}
