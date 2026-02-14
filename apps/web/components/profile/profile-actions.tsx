"use client";

import Link from "next/link";
import { MessageCircle, Image as ImageIcon, Video } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface ProfileActionsProps {
  characterId: Id<"characters">;
}

export default function ProfileActions({
  characterId,
}: ProfileActionsProps) {
  return (
    <div className="mx-auto mt-6 flex max-w-3xl gap-3 px-4">
      {/* Message Button */}
      <Link href={`/chats?characterId=${characterId}`} className="flex-1">
        <button className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-base font-semibold text-white shadow-lg transition-all hover:from-pink-600 hover:to-purple-700 hover:shadow-xl sm:h-18 sm:gap-3 sm:text-lg">
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
          Message
        </button>
      </Link>

      {/* Image Button */}
      <button className="flex h-16 flex-1 items-center justify-center gap-2 rounded-xl border border-border/50 bg-card text-base font-semibold text-foreground shadow transition-all hover:bg-accent sm:h-18 sm:gap-3 sm:text-lg">
        <ImageIcon className="h-6 w-6 sm:h-7 sm:w-7" />
        Image
      </button>

      {/* Video Button */}
      <button className="flex h-16 flex-1 items-center justify-center gap-2 rounded-xl border border-border/50 bg-card text-base font-semibold text-foreground shadow transition-all hover:bg-accent sm:h-18 sm:gap-3 sm:text-lg">
        <Video className="h-6 w-6 sm:h-7 sm:w-7" />
        Video
      </button>
    </div>
  );
}
