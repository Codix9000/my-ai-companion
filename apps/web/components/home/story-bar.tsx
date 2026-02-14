"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface Character {
  _id: Id<"characters">;
  name: string;
  cardImageUrl: string;
}

// Story viewer modal
function StoryViewer({
  characterId,
  characterName,
  characterImage,
  onClose,
}: {
  characterId: Id<"characters">;
  characterName: string;
  characterImage: string;
  onClose: () => void;
}) {
  const posts = useQuery(api.home.getLatestPostsForStory, { characterId });
  const [currentPost, setCurrentPost] = useState(0);

  if (!posts) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
        <div className="text-center text-white">
          <p className="text-lg">No posts yet</p>
          <button onClick={onClose} className="mt-4 text-sm text-pink-400">
            Close
          </button>
        </div>
      </div>
    );
  }

  const post = posts[currentPost];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={onClose}>
      <div
        className="relative flex h-full max-h-[90vh] w-full max-w-md flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="flex gap-1 px-4 pt-4">
          {posts.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className={`h-full rounded-full bg-white transition-all duration-300 ${
                  i < currentPost ? "w-full" : i === currentPost ? "w-full" : "w-0"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar className="h-8 w-8 ring-2 ring-pink-500/50">
            <AvatarImage src={characterImage} alt={characterName} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-xs text-white">
              {characterName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{characterName}</p>
            {post && (
              <p className="text-xs text-white/60">
                {formatDistanceToNow(new Date(post._creationTime), { addSuffix: true })}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Post content */}
        <div className="relative flex-1 overflow-hidden">
          {post?.mediaType === "video" ? (
            <video
              src={post.mediaUrl}
              className="h-full w-full object-contain"
              autoPlay
              playsInline
              muted
            />
          ) : (
            post?.mediaUrl && (
              <Image
                src={post.mediaUrl}
                alt={post.caption || "Story post"}
                fill
                className="object-contain"
              />
            )
          )}

          {/* Navigation areas */}
          {currentPost > 0 && (
            <button
              onClick={() => setCurrentPost((p) => p - 1)}
              className="absolute left-0 top-0 h-full w-1/3"
            />
          )}
          {currentPost < posts.length - 1 && (
            <button
              onClick={() => setCurrentPost((p) => p + 1)}
              className="absolute right-0 top-0 h-full w-1/3"
            />
          )}
        </div>

        {/* Caption */}
        {post?.caption && (
          <div className="px-4 py-3">
            <p className="text-sm text-white/90">{post.caption}</p>
          </div>
        )}

        {/* Arrow navigation */}
        {posts.length > 1 && (
          <div className="absolute left-0 right-0 top-1/2 flex -translate-y-1/2 justify-between px-2">
            {currentPost > 0 ? (
              <button
                onClick={() => setCurrentPost((p) => p - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : (
              <div />
            )}
            {currentPost < posts.length - 1 ? (
              <button
                onClick={() => setCurrentPost((p) => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface StoryBarProps {
  characters: Character[];
}

export default function StoryBar({ characters }: StoryBarProps) {
  const [viewingStory, setViewingStory] = useState<Character | null>(null);

  if (characters.length === 0) return null;

  return (
    <>
      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="flex gap-5 py-4 sm:gap-6">
          {characters.map((char) => (
            <button
              key={char._id}
              onClick={() => setViewingStory(char)}
              className="flex shrink-0 flex-col items-center gap-2"
            >
              <div className="rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-pink-400 p-[3px]">
                <Avatar className="h-20 w-20 border-[3px] border-background sm:h-24 sm:w-24">
                  <AvatarImage
                    src={char.cardImageUrl}
                    alt={char.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-2xl text-white sm:text-3xl">
                    {char.name[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="max-w-[6rem] truncate text-sm font-medium text-foreground/90">
                {char.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {viewingStory && (
        <StoryViewer
          characterId={viewingStory._id}
          characterName={viewingStory.name}
          characterImage={viewingStory.cardImageUrl}
          onClose={() => setViewingStory(null)}
        />
      )}
    </>
  );
}
