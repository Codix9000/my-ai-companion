"use client";
import {
  Compass,
  Gem,
  Home,
  MessageSquare,
  Sparkles,
  Users,
  Mail,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Discord } from "@repo/ui/src/components/social-icons";
import { useTranslation } from "react-i18next";
import useMediaQuery from "@repo/ui/src/hooks/use-media-query";
import { initializeTranslationStore } from "./lib/hooks/use-machine-translation";
import { useSidebarStore } from "./lib/hooks/use-sidebar-store";
import { Tooltip } from "@repo/ui/src/components";
import { toast } from "sonner";

function TabsController() {
  const { isMobile } = useMediaQuery();
  const pathname = usePathname();
  const { isCollapsed } = useSidebarStore();
  const { t } = useTranslation();
  initializeTranslationStore();

  // Match current path to nav value
  const firstDir = `/${pathname.split("/")[1] || ""}`;
  const currentSection =
    firstDir === "/feed" ? "/" :
    firstDir === "/my" ? "/create" :
    firstDir === "/crystals" ? "/subscriptions" :
    firstDir;

  // Nav item component
  const NavItem = ({
    href,
    value,
    icon: Icon,
    label,
    hideOnMobile = false,
    isCreate = false,
    isPremium = false,
    isComingSoon = false,
    badge,
  }: {
    href: string;
    value: string;
    icon: React.ElementType;
    label: string;
    hideOnMobile?: boolean;
    isCreate?: boolean;
    isPremium?: boolean;
    isComingSoon?: boolean;
    badge?: string;
  }) => {
    const isActive = currentSection === value;

    const handleClick = (e: React.MouseEvent) => {
      if (isComingSoon) {
        e.preventDefault();
        toast.info("Coming soon!");
      }
    };

    // Desktop content
    const desktopContent = (
      <Link
        href={isComingSoon ? "#" : href}
        onClick={handleClick}
        className={`flex items-center overflow-hidden rounded-xl px-3 py-3 transition-all duration-500 ease-in-out ${
          hideOnMobile ? "hidden lg:flex" : "flex"
        } ${isMobile ? "w-16 flex-col gap-0.5 py-2 justify-center" : ""} ${
          isActive
            ? "bg-primary/15 text-foreground"
            : "text-foreground/70 hover:bg-primary/10 hover:text-foreground"
        } ${
          isCreate && isMobile
            ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
            : ""
        }`}
      >
        <Icon
          className={`shrink-0 ${isMobile ? "h-5 w-5" : "h-6 w-6"} ${
            isPremium ? "text-amber-400" : ""
          } ${isCreate && isMobile ? "text-white" : ""} ${
            isActive && !isPremium ? "text-foreground" : ""
          }`}
        />
        {isMobile ? (
          <span
            className={`text-xs ${isCreate ? "hidden" : ""} ${
              isPremium ? "text-amber-400" : ""
            }`}
          >
            {label}
          </span>
        ) : (
          <>
            {/* Text — always in DOM, clipped by overflow-hidden on parent */}
            <span
              className={`ml-3 whitespace-nowrap text-sm font-medium transition-all duration-500 ease-in-out ${
                isCollapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100"
              } ${isPremium ? "text-amber-400" : ""}`}
            >
              {label}
            </span>
            {/* Badge — always in DOM */}
            {badge && (
              <span
                className={`whitespace-nowrap rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transition-all duration-500 ease-in-out ${
                  isCollapsed ? "w-0 overflow-hidden opacity-0 px-0 ml-0" : "ml-auto opacity-100"
                }`}
              >
                {badge}
              </span>
            )}
          </>
        )}
      </Link>
    );

    // Show tooltip when collapsed on desktop
    if (isCollapsed && !isMobile) {
      return (
        <Tooltip content={label} side="right">
          {desktopContent}
        </Tooltip>
      );
    }

    return desktopContent;
  };

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-20 flex h-20 items-center justify-around border-t bg-background/95 backdrop-blur-md
        lg:sticky lg:top-16 lg:bottom-auto lg:right-auto lg:z-10 lg:h-[calc(100vh-4rem)] lg:flex-col lg:items-stretch lg:justify-start lg:gap-1 lg:border-t-0 lg:border-r-[3px] lg:border-border/40 lg:bg-background/40 lg:p-3 lg:overflow-hidden
        ${isCollapsed ? "lg:w-[4.5rem]" : "lg:w-52"}
        transition-all duration-500 ease-in-out
      `}
    >
      {/* Main Navigation Items */}
      <NavItem href="/" value="/" icon={Home} label={t("Home")} />
      <NavItem
        href="/characters"
        value="/characters"
        icon={Compass}
        label={t("Discover")}
      />
      <NavItem
        href="/create"
        value="/create"
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
        href="/subscriptions"
        value="/subscriptions"
        icon={Gem}
        label={t("Premium")}
        isPremium
        badge="70% OFF"
      />

      {/* Spacer to push bottom section down - Desktop Only */}
      {!isMobile && <div className="flex-1" />}

      {/* Bottom Section Separator - Desktop Only */}
      {!isMobile && (
        <div className="hidden lg:block">
          <div className="mx-1 mb-2 border-t-[3px] border-border/40" />
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
    </nav>
  );
}

export default TabsController;
