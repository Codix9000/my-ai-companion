"use client";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Diamond,
  Heart,
  Home,
  MessageSquare,
  Sparkles,
  Users,
  Mail,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/src/components/tabs";
import Link from "next/link";
import { Discord } from "@repo/ui/src/components/social-icons";
import { useTranslation } from "react-i18next";
import useMediaQuery from "@repo/ui/src/hooks/use-media-query";
import { initializeTranslationStore } from "./lib/hooks/use-machine-translation";
import { useSidebarStore } from "./lib/hooks/use-sidebar-store";
import { Button } from "@repo/ui/src/components/button";
import { Tooltip } from "@repo/ui/src/components";
import { useState } from "react";
import { toast } from "sonner";

function TabsController() {
  const { isMobile } = useMediaQuery();
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed } = useSidebarStore();
  const getFirstDirectory = (urlString: string): string =>
    `/${new URL(urlString, "http://example.com").pathname.split("/")[1] || ""}`;
  const { t } = useTranslation();
  initializeTranslationStore();

  // Nav item component for cleaner code
  const NavItem = ({
    href,
    value,
    icon: Icon,
    label,
    hideOnMobile = false,
    isCreate = false,
    isPremium = false,
    isComingSoon = false,
  }: {
    href: string;
    value: string;
    icon: React.ElementType;
    label: string;
    hideOnMobile?: boolean;
    isCreate?: boolean;
    isPremium?: boolean;
    isComingSoon?: boolean;
  }) => {
    const handleComingSoon = (e: React.MouseEvent) => {
      if (isComingSoon) {
        e.preventDefault();
        toast.info("Coming soon!");
      }
    };

    const content = (
      <Link href={isComingSoon ? "#" : href} onClick={handleComingSoon}>
        <TabsTrigger
          className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 hover:bg-primary/10 ${
            hideOnMobile ? "hidden lg:flex" : ""
          } ${
            isCreate
              ? "border bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 lg:border-none lg:bg-none lg:text-foreground lg:hover:bg-primary/10"
              : ""
          } ${
            isCollapsed && !isMobile
              ? "w-12 justify-center"
              : "w-full justify-start"
          } ${isMobile ? "w-16 flex-col gap-0.5 py-2" : ""}`}
          value={value}
        >
          <Icon
            className={`shrink-0 ${
              isMobile ? "h-5 w-5" : "h-6 w-6"
            } ${isCreate && isMobile ? "text-white" : ""} ${
              isPremium ? "text-amber-400" : ""
            }`}
          />
          {(!isCollapsed || isMobile) && (
            <span
              className={`${isMobile ? "text-xs" : "text-sm font-medium"} ${
                isCreate && isMobile ? "hidden" : ""
              } ${isPremium ? "text-amber-400" : ""}`}
            >
              {label}
            </span>
          )}
        </TabsTrigger>
      </Link>
    );

    // Show tooltip when collapsed on desktop
    if (isCollapsed && !isMobile) {
      return (
        <Tooltip content={label} side="right">
          {content}
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <Tabs value={getFirstDirectory(pathname)}>
      <TabsList
        className={`shadow-t-2xl fixed bottom-0 left-0 right-0 z-20 mx-auto flex h-20 w-full items-center justify-around gap-1 rounded-none border-t bg-background/95 py-2 backdrop-blur-md ${
          isMobile ? "" : "bg-none"
        } lg:static lg:h-full lg:flex-col lg:items-stretch lg:justify-start lg:gap-1 lg:rounded-none lg:border-t-0 lg:border-r lg:border-border/60 lg:bg-background/40 lg:p-3 lg:shadow-none ${
          isCollapsed ? "lg:w-20" : "lg:w-52"
        } transition-all duration-300`}
      >
        {/* Collapse Toggle Button - Desktop Only */}
        {!isMobile && (
          <div className="mb-4 hidden lg:flex lg:justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="h-8 w-8 rounded-lg hover:bg-primary/10"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Main Navigation Items */}
        <NavItem href="/feed" value="/feed" icon={Home} label={t("Home")} />
        <NavItem
          href="/characters"
          value="/characters"
          icon={Compass}
          label={t("Discover")}
        />
        <NavItem
          href="/my"
          value="/my"
          icon={Sparkles}
          label={t("Create")}
          isCreate
        />
        <NavItem
          href="/chats"
          value="/chats"
          icon={MessageSquare}
          label={t("Chats")}
        />
        <NavItem
          href="/crystals"
          value="/crystals"
          icon={Diamond}
          label={t("Premium")}
          isPremium
        />

        {/* Spacer to push bottom section down - Desktop Only */}
        {!isMobile && <div className="flex-1" />}

        {/* Bottom Section Separator - Desktop Only */}
        {!isMobile && (
          <div className="hidden lg:block">
            <div className="mx-2 mb-2 border-t border-border/60" />
          </div>
        )}

        {/* Bottom Navigation Items - Desktop Only */}
        <NavItem
          href="/discord"
          value="/discord"
          icon={Discord}
          label={t("Discord")}
          hideOnMobile
          isComingSoon
        />
        <NavItem
          href="/contact"
          value="/contact"
          icon={Mail}
          label={t("Contact Us")}
          hideOnMobile
          isComingSoon
        />
        <NavItem
          href="/affiliate"
          value="/affiliate"
          icon={Users}
          label={t("Affiliate")}
          hideOnMobile
          isComingSoon
        />
      </TabsList>
    </Tabs>
  );
}

export default TabsController;
