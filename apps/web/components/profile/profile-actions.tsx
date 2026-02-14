"use client";

import Link from "next/link";
import { MessageCircle, Image as ImageIcon, Video, Sparkles } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface ProfileActionsProps {
  characterId: Id<"characters">;
}

// Composite icon: base icon with a small sparkle on the top-right
function SparkleIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex">
      {children}
      <Sparkles className="absolute -right-1.5 -top-1.5 h-3 w-3 text-yellow-300 sm:h-3.5 sm:w-3.5" />
    </span>
  );
}

export default function ProfileActions({
  characterId,
}: ProfileActionsProps) {
  return (
    <div className="mx-auto mt-6 flex max-w-4xl items-center justify-center gap-3 px-4 sm:gap-4 sm:px-6">
      {/* Message — Pill button, same size as others */}
      <Link href={`/chats?characterId=${characterId}`} className="flex-1 max-w-[220px]">
        <button className="group relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full border-2 border-border/60 bg-card text-base font-semibold text-foreground shadow-md transition-all hover:border-pink-500/50 hover:shadow-lg sm:h-16 sm:gap-3 sm:text-lg">
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          Message
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </button>
      </Link>

      {/* Image — Pill button with image+sparkle composite icon */}
      <button className="group relative flex h-14 flex-1 max-w-[220px] items-center justify-center gap-2.5 overflow-hidden rounded-full border-2 border-border/60 bg-card text-base font-semibold text-foreground shadow-md transition-all hover:border-purple-400/50 hover:shadow-lg sm:h-16 sm:gap-3 sm:text-lg">
        <SparkleIcon>
          <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </SparkleIcon>
        Image
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      </button>

      {/* Video — Pill button with video+sparkle composite icon, pink/purple gradient */}
      <button className="group relative flex h-14 flex-1 max-w-[220px] items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-base font-semibold text-white shadow-md transition-all hover:from-pink-600 hover:to-purple-700 hover:shadow-lg sm:h-16 sm:gap-3 sm:text-lg">
        <SparkleIcon>
          <Video className="h-5 w-5 sm:h-6 sm:w-6" />
        </SparkleIcon>
        Video
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      </button>
    </div>
  );
}
