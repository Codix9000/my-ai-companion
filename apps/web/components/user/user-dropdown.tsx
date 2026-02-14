"use client";

import { ReactElement, useState } from "react";
import {
  CircleUser,
  Crown,
  LogOut,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { SignedOut, useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@repo/ui/src/components";
import { useTranslation } from "react-i18next";
import { usePostHog } from "posthog-js/react";
import { useResponsivePopover } from "@repo/ui/src/hooks/use-responsive-popover";

type StyledLinkProps = {
  href: string;
  text: string;
  Icon: ReactElement;
  onClick?: any;
};

type StyledButtonProps = {
  text: string;
  Icon: ReactElement;
  onClick?: any;
};

const StyledLink: React.FC<StyledLinkProps> = ({
  href,
  text,
  Icon,
  onClick,
}) => {
  return (
    <Link
      href={href}
      className="relative flex w-full items-center justify-start space-x-2 rounded-md p-2 text-left text-base transition-all duration-75 hover:bg-secondary sm:p-1.5"
      onClick={onClick}
    >
      {Icon}
      <p className="text-sm">{text}</p>
    </Link>
  );
};

export const StyledButton: React.FC<StyledButtonProps> = ({
  text,
  Icon,
  onClick,
}) => {
  return (
    <button
      className="relative flex w-full items-center justify-start space-x-2 rounded-md p-2 text-left text-base transition-all duration-75 hover:bg-secondary sm:p-1.5"
      onClick={onClick}
    >
      {Icon}
      <p className="text-sm">{text}</p>
    </button>
  );
};

export default function UserDropdown() {
  const { t } = useTranslation();
  const { user } = useUser();
  const posthog = usePostHog();
  if (user?.id) posthog.identify(user.id);

  const [openPopover, setOpenPopover] = useState(false);
  const { signOut } = useClerk();
  const { Popover, PopoverContent, PopoverTrigger, isMobile } =
    useResponsivePopover();

  return (
    <div className="relative inline-block text-left">
      <Popover
        open={openPopover}
        onOpenChange={isMobile ? undefined : () => setOpenPopover(!openPopover)}
        onClose={isMobile ? () => setOpenPopover(false) : undefined}
      >
        <PopoverContent className="p-2 pb-3 sm:w-44 lg:p-2">
          {user ? (
            <>
              {user?.username && (
                <div className="border-b border-border/40 px-2 pb-2 mb-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {`@${user.username}`}
                  </p>
                </div>
              )}
              <StyledLink
                text={t("Subscription")}
                Icon={<Crown className="h-4 w-4 text-amber-400" />}
                href="/subscriptions"
                onClick={() => setOpenPopover(false)}
              />
              <StyledLink
                text={t("Settings")}
                Icon={<Settings className="h-4 w-4 text-muted-foreground" />}
                href="/settings"
                onClick={() => setOpenPopover(false)}
              />
              <div className="my-1 border-t border-border/40" />
              <StyledButton
                text={t("Log out")}
                Icon={<LogOut className="h-4 w-4 text-muted-foreground" />}
                onClick={() => {
                  setOpenPopover(false);
                  signOut();
                }}
              />
            </>
          ) : (
            <div className="flex flex-col gap-2 p-1">
              <Link href="/sign-up" onClick={() => setOpenPopover(false)}>
                <Button className="w-full rounded-full bg-pink-500 text-white hover:bg-pink-600">
                  {t("Create Free Account")}
                </Button>
              </Link>
              <Link href="/sign-in" onClick={() => setOpenPopover(false)}>
                <Button variant="outline" className="w-full rounded-full border-pink-500/50 text-pink-400 hover:bg-pink-500/10">
                  {t("Login")}
                </Button>
              </Link>
            </div>
          )}
        </PopoverContent>
        <PopoverTrigger
          onClick={() => setOpenPopover(!openPopover)}
          className="flex items-center justify-center overflow-hidden rounded-full border-none outline-none transition-all duration-75 active:scale-95"
        >
          <button
            onClick={() => setOpenPopover(!openPopover)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 transition-all duration-75 hover:bg-primary/10 focus:outline-none active:scale-95"
          >
            <CircleUser className="h-5 w-5 text-foreground/80" />
          </button>
        </PopoverTrigger>
      </Popover>
    </div>
  );
}
