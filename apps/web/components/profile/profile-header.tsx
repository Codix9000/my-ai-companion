"use client";

import { useQuery } from "convex/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { nFormatter } from "../../app/lib/utils";

interface ProfileHeaderProps {
  character: {
    _id?: Id<"characters">;
    name?: string;
    description?: string;
    cardImageUrl?: string;
    isNSFW?: boolean;
  };
  characterId: Id<"characters">;
}

export default function ProfileHeader({ character, characterId }: ProfileHeaderProps) {
  const stats = useQuery(api.characters.getProfileStats, { characterId });

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
      {/* Horizontal layout: Avatar left, info right */}
      <div className="flex items-start gap-6 sm:gap-10">
        {/* Avatar — pinned left */}
        <div className="shrink-0">
          <Avatar className="h-28 w-28 border-4 border-background shadow-2xl ring-4 ring-pink-500/30 sm:h-40 sm:w-40">
            <AvatarImage
              src={character.cardImageUrl || ""}
              alt={character.name || ""}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-4xl text-white sm:text-6xl">
              {character.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info — right of avatar */}
        <div className="flex min-w-0 flex-1 flex-col justify-center pt-1">
          {/* Name */}
          <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {character.name}
            {character.isNSFW && (
              <span className="ml-2 inline-block rounded-full bg-red-500/10 px-2 py-0.5 align-middle text-xs font-medium text-red-500">
                18+
              </span>
            )}
          </h1>

          {/* Description */}
          {character.description && (
            <p className="mt-1.5 text-sm text-foreground/60 sm:text-base">
              {character.description}
            </p>
          )}

          {/* Stats row */}
          <div className="mt-3 flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold sm:text-lg">
                {nFormatter(stats?.totalMessages ?? 0)}
              </span>
              <span className="text-sm text-muted-foreground sm:text-base">
                messages
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold sm:text-lg">
                {nFormatter(stats?.totalChats ?? 0)}
              </span>
              <span className="text-sm text-muted-foreground sm:text-base">
                chats
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
