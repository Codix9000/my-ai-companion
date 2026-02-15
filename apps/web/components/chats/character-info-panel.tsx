"use client";

import Image from "next/image";
import Link from "next/link";
import { Image as ImageIcon, Video, Sparkles } from "lucide-react";

interface CharacterInfoPanelProps {
  name: string;
  description?: string;
  cardImageUrl?: string;
  characterId: string;
  age?: number;
}

export default function CharacterInfoPanel({
  name,
  description,
  cardImageUrl,
  characterId,
  age,
}: CharacterInfoPanelProps) {
  return (
    <div className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-border/40 bg-background/50">
      {/* Character Image */}
      <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
        {cardImageUrl ? (
          <Link href={`/character/${characterId}`}>
            <Image
              src={cardImageUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="320px"
            />
          </Link>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-4xl text-muted-foreground">
              {name?.[0] || "?"}
            </span>
          </div>
        )}
      </div>

      {/* Character Info */}
      <div className="flex flex-col gap-4 p-4">
        {/* Name + Age */}
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {name}
            {age && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                {age}
              </span>
            )}
          </h2>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm leading-relaxed text-foreground/70">
            {description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-sm font-semibold text-white shadow transition-all hover:from-pink-600 hover:to-purple-700 hover:shadow-lg">
            <span className="relative">
              <ImageIcon className="h-5 w-5" />
              <Sparkles className="absolute -right-1.5 -top-1.5 h-3 w-3 text-yellow-300" />
            </span>
            Generate Image
          </button>
          <button className="flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-pink-500/50 text-sm font-semibold text-pink-500 transition-all hover:bg-pink-500/10">
            <span className="relative">
              <Video className="h-5 w-5" />
              <Sparkles className="absolute -right-1.5 -top-1.5 h-3 w-3 text-yellow-400" />
            </span>
            Generate Video
          </button>
        </div>
      </div>
    </div>
  );
}
