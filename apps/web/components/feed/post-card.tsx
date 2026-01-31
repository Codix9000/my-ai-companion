"use client";

import { Heart, Lock, MessageCircle, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";
import { Button } from "@repo/ui/src/components";
import { Card } from "@repo/ui/src/components";
import { Id } from "../../convex/_generated/dataModel";
import { nFormatter } from "../../app/lib/utils";

interface PostAuthor {
  id: Id<"characters">;
  name: string;
  handle: string;
  avatarUrl: string | null;
}

interface PostCardProps {
  id: Id<"posts">;
  author: PostAuthor | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  likesCount: number;
  isLocked: boolean;
  isNSFW?: boolean;
  nsfwPreference?: string;
}

const PostCard = ({
  id,
  author,
  mediaUrl,
  mediaType,
  caption,
  likesCount,
  isLocked,
  isNSFW,
  nsfwPreference,
}: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);

  const handleLikeToggle = () => {
    // Toggle UI only for now - will connect to backend later
    setIsLiked(!isLiked);
    setLocalLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const shouldBlur = isLocked || (isNSFW && nsfwPreference !== "allow");

  return (
    <Card className="w-full overflow-hidden rounded-xl border bg-card">
      {/* Header - Author Info */}
      <div className="flex items-center gap-3 p-4">
        <Link href={`/character/${author?.id}`}>
          <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-primary/20 transition-all hover:ring-primary/50">
            <AvatarImage src={author?.avatarUrl || ""} alt={author?.name || ""} />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
              {author?.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex flex-col">
          <Link
            href={`/character/${author?.id}`}
            className="font-semibold text-foreground hover:underline"
          >
            {author?.name || "Unknown"}
          </Link>
          <span className="text-sm text-muted-foreground">
            {author?.handle || "@unknown"}
          </span>
        </div>
      </div>

      {/* Media Display */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {mediaType === "image" ? (
          <Image
            src={mediaUrl}
            alt={caption}
            fill
            className={`object-cover transition-all duration-300 ${
              shouldBlur ? "blur-xl scale-110" : ""
            }`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <video
            src={mediaUrl}
            className={`h-full w-full object-cover ${
              shouldBlur ? "blur-xl scale-110" : ""
            }`}
            controls={!shouldBlur}
            muted
            loop
            playsInline
          />
        )}

        {/* Paywall Overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/60 px-8 py-6 text-white">
              <Lock className="h-12 w-12" />
              <span className="text-lg font-semibold">Premium Content</span>
              <Button
                variant="default"
                className="mt-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                Subscribe to Unlock
              </Button>
            </div>
          </div>
        )}

        {/* NSFW Overlay (when not locked but NSFW) */}
        {!isLocked && isNSFW && nsfwPreference !== "allow" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-black/60 px-6 py-4 text-white">
              <span className="text-sm font-medium">Sensitive Content</span>
              <span className="text-xs text-white/70">
                Update preferences to view
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Actions & Caption */}
      <div className="p-4">
        {/* Action Buttons */}
        <div className="mb-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={handleLikeToggle}
          >
            <Heart
              className={`h-6 w-6 transition-all ${
                isLiked
                  ? "fill-red-500 text-red-500 scale-110"
                  : "text-foreground hover:text-red-500"
              }`}
            />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <MessageCircle className="h-6 w-6 text-foreground hover:text-primary" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <Share2 className="h-6 w-6 text-foreground hover:text-primary" />
          </Button>
        </div>

        {/* Likes Count */}
        <div className="mb-2 text-sm font-semibold">
          {nFormatter(localLikesCount)} likes
        </div>

        {/* Caption */}
        <div className="text-sm">
          <Link
            href={`/character/${author?.id}`}
            className="mr-2 font-semibold hover:underline"
          >
            {author?.name}
          </Link>
          <span className="text-foreground/90">{caption}</span>
        </div>
      </div>
    </Card>
  );
};

export default PostCard;
