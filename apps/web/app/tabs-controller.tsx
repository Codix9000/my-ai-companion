"use client";
import {
  Book,
  Compass,
  Home,
  Image,
  MessageSquare,
  Package,
  Plus,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/src/components/tabs";
import Link from "next/link";
import { Discord } from "@repo/ui/src/components/social-icons";
import { useTranslation } from "react-i18next";
import useMediaQuery from "@repo/ui/src/hooks/use-media-query";
import { Crystal } from "@repo/ui/src/components/icons";
import { initializeTranslationStore } from "./lib/hooks/use-machine-translation";

function TabsController() {
  const { isMobile } = useMediaQuery();
  const pathname = usePathname();
  const getFirstDirectory = (urlString: string): string =>
    `/${new URL(urlString, "http://example.com").pathname.split("/")[1] || ""}`;
  const { t } = useTranslation();
  initializeTranslationStore();

  return (
    <Tabs value={getFirstDirectory(pathname)}>
      <TabsList
        className={`shadow-t-2xl fixed bottom-0 left-0 right-0 z-20 mx-auto flex h-20 w-full gap-2 rounded-none border-t py-4 ${
          isMobile
            ? "bg-background/90 backdrop-blur-md backdrop-saturate-150"
            : "bg-none"
        } lg:static lg:h-full lg:w-32 lg:flex-col lg:items-start lg:justify-start lg:rounded-none lg:border-none lg:shadow-none`}
      >
        {/* Position 1: Feed (Home) */}
        <Link href="/feed">
          <TabsTrigger
            className="flex w-16 flex-col items-center gap-0.5 rounded-full lg:w-full lg:flex-row lg:items-start"
            value="/feed"
          >
            <Home className="h-5 w-5 p-0.5 lg:p-1" />
            {t("Feed")}
          </TabsTrigger>
        </Link>
        {/* Position 2: Explore (old Discover) */}
        <Link href="/characters">
          <TabsTrigger
            className="flex w-16 flex-col items-center gap-0.5 rounded-full lg:w-full lg:flex-row lg:items-start"
            value="/characters"
          >
            <Compass className="h-5 w-5 p-0.5 lg:p-1" />
            {t("Explore")}
          </TabsTrigger>
        </Link>
        {/* Position 3: Chats */}
        <Link href="/chats">
          <TabsTrigger
            className="flex w-16 flex-col items-center gap-0.5 rounded-full lg:w-full lg:flex-row lg:items-start"
            value="/chats"
          >
            <MessageSquare className="h-5 w-5 p-0.5 lg:p-1" />
            {t("Chats")}
          </TabsTrigger>
        </Link>
        <Link href={"/my"}>
          <TabsTrigger
            className="flex w-full flex-col items-center gap-0.5 rounded-full border bg-black dark:bg-white sm:border-none sm:bg-transparent sm:dark:bg-transparent lg:flex-row lg:items-start"
            value={"/my"}
          >
            <Plus className="h-6 w-6 p-0.5 text-white dark:text-black sm:text-muted-foreground sm:dark:text-muted-foreground lg:h-5 lg:w-5 lg:p-1" />
            <span className="hidden lg:inline">{t("My")}</span>
          </TabsTrigger>
        </Link>
        <Link href="/models">
          <TabsTrigger
            className="hidden w-full flex-col items-center gap-0.5 rounded-full lg:flex lg:flex-row lg:items-start"
            value="/models"
          >
            <Package className="h-5 w-5 p-0.5 lg:p-1" />
            {t("Models")}
          </TabsTrigger>
        </Link>
        <Link href="/images">
          <TabsTrigger
            className="w-16 flex-col items-center gap-0.5 rounded-full lg:flex lg:w-full lg:flex-row lg:items-start"
            value="/images"
          >
            <Image className="h-5 w-5 p-0.5 lg:p-1" />
            {t("Images")}
          </TabsTrigger>
        </Link>
        <Link href="/crystals">
          <TabsTrigger
            className="w-16 flex-col items-center gap-0.5 rounded-full lg:flex lg:w-full lg:flex-row lg:items-start"
            value="/crystals"
          >
            <Crystal className="h-5 w-5 p-0.5 lg:p-1" />
            {t("Crystals")}
          </TabsTrigger>
        </Link>
        <Link href="/discord">
          <TabsTrigger
            className="hidden w-full flex-col items-center gap-0.5 rounded-full lg:flex lg:flex-row lg:items-start"
            value="/discord"
          >
            <Discord className="h-5 w-5 p-0.5 lg:p-1" />
            {t("Discord")}
          </TabsTrigger>
        </Link>
        <Link href="/docs">
          <TabsTrigger
            className="hidden w-full flex-col items-center gap-0.5 rounded-full lg:flex lg:flex-row lg:items-start"
            value="/docs"
          >
            <Book className="h-5 w-5 p-0.5 lg:p-1" />
            {t("Docs")}
          </TabsTrigger>
        </Link>
      </TabsList>
    </Tabs>
  );
}

export default TabsController;
