"use client";

import Link from "next/link";
import TextLogo from "@repo/ui/src/components/text-logo";
import useScroll from "@repo/ui/src/hooks/use-scroll";
import UserDropdown from "../components/user/user-dropdown";
import { Button } from "@repo/ui/src/components";
import { useConvexAuth } from "convex/react";
import { Gem, Menu } from "lucide-react";
import useCurrentUser from "./lib/hooks/use-current-user";
import useMediaQuery from "@repo/ui/src/hooks/use-media-query";
import { useSidebarStore } from "./lib/hooks/use-sidebar-store";

export default function NavBar({}: {}) {
  const scrolled = useScroll(50);
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useCurrentUser();
  const isPlus = currentUser?.subscriptionTier === "plus";
  const { isMobile } = useMediaQuery();
  const { toggleCollapsed } = useSidebarStore();

  return (
    <>
      <div
        className={`fixed top-0 flex w-full justify-center ${
          scrolled ? "bg-background/80 backdrop-blur-xl" : "bg-background/60 backdrop-blur-sm"
        } z-30 border-b-[3px] border-border/40 transition-opacity`}
      >
        <div className="mx-5 flex h-16 w-full items-center justify-between">
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
          </div>
          <div className="flex items-center gap-3">
            {/* Premium 70% OFF button */}
            {isAuthenticated && !isPlus && (
              <Link href="/subscriptions">
                <Button
                  variant="outline"
                  className="hidden gap-2 rounded-full border-amber-500/50 bg-amber-950/30 px-4 py-2 text-amber-400 hover:bg-amber-950/50 hover:text-amber-300 md:flex"
                >
                  <Gem className="h-4 w-4" />
                  <span className="text-sm font-semibold">Premium</span>
                  <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    70% OFF
                  </span>
                </Button>
              </Link>
            )}

            <UserDropdown />
          </div>
        </div>
      </div>
    </>
  );
}
