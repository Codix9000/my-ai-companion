"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";

interface ProfileHeaderProps {
  character: {
    name?: string;
    description?: string;
    cardImageUrl?: string;
    isNSFW?: boolean;
  };
}

export default function ProfileHeader({ character }: ProfileHeaderProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      {/* Instagram-style: Avatar centered, name, description */}
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-36 w-36 border-4 border-background shadow-2xl ring-4 ring-pink-500/30 sm:h-44 sm:w-44">
          <AvatarImage
            src={character.cardImageUrl || ""}
            alt={character.name || ""}
            className="object-cover"
          />
          <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-5xl text-white sm:text-6xl">
            {character.name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {character.name}
          {character.isNSFW && (
            <span className="ml-2 inline-block rounded-full bg-red-500/10 px-2 py-0.5 align-middle text-xs font-medium text-red-500">
              18+
            </span>
          )}
        </h1>

        {/* Description */}
        {character.description && (
          <p className="mt-2 max-w-md text-sm text-foreground/70">
            {character.description}
          </p>
        )}
      </div>
    </div>
  );
}
