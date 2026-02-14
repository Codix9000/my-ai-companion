"use client";

import Link from "next/link";
import TextLogo from "@repo/ui/src/components/text-logo";
import { Badge } from "@repo/ui/src/components/badge";
import useScroll from "@repo/ui/src/hooks/use-scroll";
import UserDropdown from "../components/user/user-dropdown";
import { Button, Tooltip } from "@repo/ui/src/components";
import { SignedOut } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { Menu, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import useCurrentUser from "./lib/hooks/use-current-user";
import { Search } from "@repo/ui/src/components/icons";
import useMediaQuery from "@repo/ui/src/hooks/use-media-query";
import { useSidebarStore } from "./lib/hooks/use-sidebar-store";

export default function NavBar({}: {}) {
  const scrolled = useScroll(50);
  const { isAuthenticated } = useConvexAuth();
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const isPlus = currentUser?.subscriptionTier === "plus";
  const { isMobile } = useMediaQuery();
  const { toggleCollapsed } = useSidebarStore();

  return (
    <>
      <div
        className={`fixed top-0 flex w-full justify-center ${
          scrolled ? "bg-background/80 backdrop-blur-xl" : "bg-background/60 backdrop-blur-sm"
        } z-30 border-b-2 border-border/50 transition-opacity`}
      >
        <div className={`mx-5 flex h-16 w-full items-center justify-between`}>
          <div className="flex items-center gap-3 font-display text-2xl">
            {/* Hamburger menu toggle - Desktop Only */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                className="hidden h-9 w-9 rounded-lg hover:bg-primary/10 lg:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <Link href="/">
              <TextLogo isPlus={isPlus} />
            </Link>
            {isAuthenticated ? (
              <>
                {!isPlus && (
                  <Link
                    href="/crystals"
                    className="flex items-center justify-center"
                  >
                    <Badge className="w-fit font-display">
                      {t("Get ORP+")}
                    </Badge>
                  </Link>
                )}
              </>
            ) : (
              <Tooltip content="Star openroleplay.ai on GitHub" desktopOnly>
                <Link
                  className="hidden items-center gap-2 text-base text-muted-foreground hover:opacity-50 lg:flex"
                  href="/github"
                >
                  <Badge className="font-default">
                    <span>{t("alpha")}</span>
                  </Badge>
                </Link>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content="Search characters" desktopOnly>
              <Link href="/search">
                <Button
                  className="rounded-full p-2"
                  variant="ghost"
                  size="icon"
                >
                  <Search className="h-5 w-5 p-px text-foreground" />
                </Button>
              </Link>
            </Tooltip>
            {isAuthenticated && (
              <Link href="/my-characters/create" className="hidden lg:block">
                <Button className="gap-0.5 rounded-full px-3" variant="cta">
                  <Sparkles className="h-4 w-4" />
                  {t("Create")}
                </Button>
              </Link>
            )}

            <UserDropdown />
            <SignedOut>
              <Link href="/sign-in">
                <Button
                  className="hidden rounded-full px-3 md:block"
                  variant="cta"
                >
                  {t("Log in")}
                </Button>
              </Link>
            </SignedOut>
          </div>
        </div>
      </div>
    </>
  );
}
