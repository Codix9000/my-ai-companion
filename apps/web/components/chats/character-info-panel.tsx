"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import Image from "next/image";
import Link from "next/link";
import {
  Image as ImageIcon,
  Video,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface CharacterInfoPanelProps {
  name: string;
  description?: string;
  cardImageUrl?: string;
  characterId: string;
  age?: number;
}

// ─── Highlights Carousel ─────────────────────────────────────────
function HighlightsCarousel({
  characterId,
  fallbackImageUrl,
  characterName,
}: {
  characterId: string;
  fallbackImageUrl?: string;
  characterName: string;
}) {
  const highlights = useQuery(api.feed.getHighlightsByCharacter, {
    characterId: characterId as Id<"characters">,
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right">("left");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const items = highlights && highlights.length > 0 ? highlights : null;
  const total = items ? items.length : 1;

  const slideTo = useCallback(
    (direction: "left" | "right") => {
      if (isTransitioning || total <= 1) return;
      setSlideDir(direction);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIdx((prev) =>
          direction === "left" ? (prev + 1) % total : (prev - 1 + total) % total,
        );
        setIsTransitioning(false);
      }, 350);
    },
    [isTransitioning, total],
  );

  // Auto-advance
  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(() => slideTo("left"), 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, slideTo]);

  const handlePrev = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    slideTo("right");
  };

  const handleNext = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    slideTo("left");
  };

  // Render content
  const currentItem = items ? items[currentIdx] : null;

  return (
    <div className="group relative w-full overflow-hidden" style={{ aspectRatio: "3/4" }}>
      {currentItem ? (
        <div className="relative h-full w-full">
          {/* Current slide */}
          <div
            className="absolute inset-0 transition-transform duration-350 ease-in-out"
            style={{
              transform: isTransitioning
                ? slideDir === "left"
                  ? "translateX(-100%)"
                  : "translateX(100%)"
                : "translateX(0)",
            }}
          >
            {currentItem.mediaType === "video" ? (
              <video
                src={currentItem.mediaUrl}
                className="h-full w-full object-cover"
                muted
                playsInline
                autoPlay
                loop
              />
            ) : (
              <Image
                src={currentItem.mediaUrl}
                alt={currentItem.caption || characterName}
                fill
                className="object-cover"
                sizes="320px"
              />
            )}
          </div>
        </div>
      ) : fallbackImageUrl ? (
        <Link href={`/character/${characterId}`}>
          <Image
            src={fallbackImageUrl}
            alt={characterName}
            fill
            className="object-cover"
            sizes="320px"
          />
        </Link>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <span className="text-4xl text-muted-foreground">{characterName?.[0] || "?"}</span>
        </div>
      )}

      {/* Navigation arrows — shown on hover when >1 slide */}
      {total > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {items!.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === currentIdx ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────
export default function CharacterInfoPanel({
  name,
  description,
  cardImageUrl,
  characterId,
  age,
}: CharacterInfoPanelProps) {
  return (
    <div className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-border/30">
      {/* Highlights Carousel */}
      <HighlightsCarousel
        characterId={characterId}
        fallbackImageUrl={cardImageUrl}
        characterName={name}
      />

      {/* Character Info */}
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {name}
            {age && (
              <span className="ml-1.5 font-normal text-muted-foreground">{age}</span>
            )}
          </h2>
        </div>

        {description && (
          <p className="text-sm leading-relaxed text-foreground/70">{description}</p>
        )}

        {/* Action Buttons — Video = gradient (prominent), Image = outlined */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button className="flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-pink-500/50 text-sm font-semibold text-pink-400 transition-all hover:bg-pink-500/10">
            <span className="relative">
              <ImageIcon className="h-5 w-5" />
              <Sparkles className="absolute -right-1.5 -top-1.5 h-3 w-3 text-yellow-400" />
            </span>
            Generate Image
          </button>
          <button className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-sm font-semibold text-white shadow transition-all hover:from-pink-600 hover:to-purple-700 hover:shadow-lg">
            <span className="relative">
              <Video className="h-5 w-5" />
              <Sparkles className="absolute -right-1.5 -top-1.5 h-3 w-3 text-yellow-300" />
            </span>
            Generate Video
          </button>
        </div>
      </div>
    </div>
  );
}
