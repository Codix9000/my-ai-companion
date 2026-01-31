"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";
import { nFormatter } from "../../app/lib/utils";

interface ProfileHeaderProps {
  character: {
    name?: string;
    description?: string;
    cardImageUrl?: string;
    bannerImageUrl?: string;
    numSubscribers?: number;
    isNSFW?: boolean;
  };
  creatorName?: string;
}

export default function ProfileHeader({
  character,
  creatorName,
}: ProfileHeaderProps) {
  const { t } = useTranslation();

  // Use banner if available, otherwise use a gradient placeholder
  const bannerUrl = character.bannerImageUrl || character.cardImageUrl;

  return (
    <div className="relative">
      {/* Banner */}
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 sm:h-48">
        {bannerUrl && (
          <Image
            src={bannerUrl}
            alt={`${character.name}'s banner`}
            fill
            className="object-cover opacity-80"
            priority
          />
        )}
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      {/* Profile Info Section */}
      <div className="relative mx-auto max-w-2xl px-4">
        {/* Avatar - Positioned to overlap banner */}
        <div className="relative -mt-16 sm:-mt-20">
          <Avatar className="h-28 w-28 border-4 border-background shadow-xl sm:h-36 sm:w-36">
            <AvatarImage
              src={character.cardImageUrl || ""}
              alt={character.name || ""}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-3xl text-white">
              {character.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name and NSFW Badge */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{character.name}</h1>
          {character.isNSFW && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
              18+
            </span>
          )}
        </div>

        {/* Handle/Creator */}
        <p className="mt-1 text-sm text-muted-foreground">
          @{character.name?.toLowerCase().replace(/\s+/g, "_") || "unknown"}
          {creatorName && (
            <span className="ml-2">
              · {t("Created by")} {creatorName}
            </span>
          )}
        </p>

        {/* Description */}
        {character.description && (
          <p className="mt-3 text-sm text-foreground/80">
            {character.description}
          </p>
        )}

        {/* Stats */}
        <div className="mt-4 flex gap-6">
          <div className="flex flex-col">
            <span className="text-lg font-bold">
              {nFormatter(character.numSubscribers || 0)}
            </span>
            <span className="text-xs text-muted-foreground">{t("Subscribers")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
