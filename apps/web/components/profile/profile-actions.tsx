"use client";

import Link from "next/link";
import { MessageCircle, Sparkles } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface ProfileActionsProps {
  characterId: Id<"characters">;
}

export default function ProfileActions({
  characterId,
}: ProfileActionsProps) {
  return (
    <div className="mx-auto mt-6 flex max-w-4xl items-center justify-center gap-4 px-4 sm:gap-5 sm:px-6">
      {/* Message — Icon-only circle button */}
      <Link href={`/chats?characterId=${characterId}`}>
        <button className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border/60 bg-card text-foreground shadow-md transition-all hover:border-pink-500/50 hover:shadow-lg sm:h-16 sm:w-16">
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
        </button>
      </Link>

      {/* Image — Pill button with sparkle, light style */}
      <button className="group relative flex h-14 flex-1 max-w-[260px] items-center justify-center gap-2.5 overflow-hidden rounded-full border-2 border-border/60 bg-card text-base font-semibold text-foreground shadow-md transition-all hover:border-purple-400/50 hover:shadow-lg sm:h-16 sm:gap-3 sm:text-lg">
        <Sparkles className="h-5 w-5 text-purple-400 sm:h-6 sm:w-6" />
        Image
        {/* Subtle shimmer on hover */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      </button>

      {/* Video — Pill button with sparkle, teal/emerald gradient */}
      <button className="group relative flex h-14 flex-1 max-w-[260px] items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-base font-semibold text-black shadow-md transition-all hover:from-emerald-500 hover:to-cyan-500 hover:shadow-lg sm:h-16 sm:gap-3 sm:text-lg">
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
        Video
        {/* Subtle shimmer on hover */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      </button>
    </div>
  );
}
