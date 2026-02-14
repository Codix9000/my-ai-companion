"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "framer-motion";
import { Heart, X, Play, ChevronUp, ChevronDown, Lock, Video } from "lucide-react";
import Image from "next/image";
import { useStablePaginatedQuery } from "../../app/lib/hooks/use-stable-query";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { nFormatter } from "../../app/lib/utils";
import Spinner from "@repo/ui/src/components/spinner";

interface PostAuthor {
  id: Id<"characters">;
  name: string;
  handle: string;
  avatarUrl: string | null;
}

interface Post {
  _id: Id<"posts">;
  author: PostAuthor | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  likesCount: number;
  isLocked: boolean;
  isNSFW?: boolean;
}

interface ProfilePostsProps {
  characterId: Id<"characters">;
  nsfwPreference?: string;
}

// Grid thumbnail component
function PostThumbnail({
  post,
  onClick,
  nsfwPreference,
}: {
  post: Post;
  onClick: () => void;
  nsfwPreference?: string;
}) {
  const shouldBlur =
    post.isLocked || (post.isNSFW && nsfwPreference !== "allow");

  return (
    <div
      className="group relative aspect-square cursor-pointer overflow-hidden bg-muted"
      onClick={onClick}
    >
      {/* Thumbnail: image or video first-frame */}
      {post.mediaType === "image" ? (
        <Image
          src={post.mediaUrl}
          alt={post.caption || "Post"}
          fill
          className={`object-cover transition-transform duration-200 group-hover:scale-105 ${
            shouldBlur ? "blur-lg scale-110" : ""
          }`}
          sizes="(max-width: 768px) 33vw, 200px"
        />
      ) : (
        <video
          src={post.mediaUrl}
          className={`h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 ${
            shouldBlur ? "blur-lg scale-110" : ""
          }`}
          muted
          playsInline
          preload="metadata"
        />
      )}

      {/* Video indicator */}
      {post.mediaType === "video" && !shouldBlur && (
        <div className="absolute right-1.5 top-1.5">
          <Video className="h-4 w-4 text-white drop-shadow-lg" />
        </div>
      )}

      {/* Hover overlay with likes */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
        <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Heart className="h-5 w-5 fill-white text-white" />
          <span className="text-sm font-bold text-white">
            {nFormatter(post.likesCount)}
          </span>
        </div>
      </div>

      {/* Lock overlay */}
      {post.isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Lock className="h-6 w-6 text-white" />
        </div>
      )}
    </div>
  );
}

// Post detail viewer component (scrollable, fullscreen overlay)
function PostDetailViewer({
  posts,
  initialIndex,
  onClose,
  nsfwPreference,
}: {
  posts: Post[];
  initialIndex: number;
  onClose: () => void;
  nsfwPreference?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Navigate to prev / next post
  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(posts.length - 1, prev + 1));
  }, [posts.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowDown" || e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goToPrev, goToNext]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const post = posts[currentIndex];
  if (!post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Close button */}
      <button
        className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/70"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/70 sm:left-auto sm:right-20 sm:top-4 sm:translate-x-0"
          onClick={goToPrev}
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}
      {currentIndex < posts.length - 1 && (
        <button
          className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/70 sm:bottom-4 sm:left-auto sm:right-20 sm:translate-x-0"
          onClick={goToNext}
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      )}

      {/* Post counter */}
      <div className="absolute left-4 top-4 z-10 rounded-full bg-black/40 px-3 py-1 text-sm text-white">
        {currentIndex + 1} / {posts.length}
      </div>

      {/* Post content */}
      <div
        ref={scrollContainerRef}
        className="flex h-full w-full max-w-2xl flex-col items-center overflow-y-auto px-4 py-16"
      >
        <PostDetailCard
          post={post}
          nsfwPreference={nsfwPreference}
        />
      </div>
    </div>
  );
}

// Individual post detail card (inside the viewer)
function PostDetailCard({
  post,
  nsfwPreference,
}: {
  post: Post;
  nsfwPreference?: string;
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount);
  const videoRef = useRef<HTMLVideoElement>(null);

  const shouldBlur =
    post.isLocked || (post.isNSFW && nsfwPreference !== "allow");

  // Auto-play video when detail card appears
  useEffect(() => {
    if (post.mediaType === "video" && videoRef.current && !shouldBlur) {
      videoRef.current.play().catch(() => {});
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [post._id, post.mediaType, shouldBlur]);

  const handleLikeToggle = () => {
    setIsLiked(!isLiked);
    setLocalLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  return (
    <div className="w-full overflow-hidden rounded-xl bg-card">
      {/* Media */}
      <div className="relative w-full overflow-hidden bg-black">
        {post.mediaType === "image" ? (
          <div className="relative w-full" style={{ aspectRatio: "4/5" }}>
            <Image
              src={post.mediaUrl}
              alt={post.caption || "Post"}
              fill
              className={`object-contain ${shouldBlur ? "blur-xl scale-110" : ""}`}
              sizes="(max-width: 768px) 100vw, 640px"
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            src={post.mediaUrl}
            className={`w-full ${shouldBlur ? "blur-xl scale-110" : ""}`}
            muted
            playsInline
            loop
            controls={!shouldBlur}
            style={{ maxHeight: "70vh" }}
          />
        )}

        {/* Lock overlay */}
        {post.isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <Lock className="h-10 w-10 text-white" />
            <span className="mt-2 text-sm font-semibold text-white">
              Premium Content
            </span>
          </div>
        )}
      </div>

      {/* Caption, likes, actions */}
      <div className="p-4">
        {/* Like button & count */}
        <div className="mb-3 flex items-center gap-3">
          <button
            className="rounded-full p-1 transition-colors hover:bg-muted"
            onClick={handleLikeToggle}
          >
            <Heart
              className={`h-7 w-7 transition-all ${
                isLiked
                  ? "fill-red-500 text-red-500 scale-110"
                  : "text-foreground hover:text-red-500"
              }`}
            />
          </button>
          <span className="text-sm font-bold">
            {nFormatter(localLikesCount)} likes
          </span>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-foreground/90">{post.caption}</p>
        )}
      </div>
    </div>
  );
}

// Main profile posts component
export default function ProfilePosts({
  characterId,
  nsfwPreference,
}: ProfilePostsProps) {
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(
    null
  );

  const { results, status, loadMore } = useStablePaginatedQuery(
    api.feed.getPostsByAuthor,
    { authorId: characterId },
    { initialNumItems: 18 }
  );

  const posts = (results || []) as Post[];
  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (inView && status === "CanLoadMore") {
      loadMore(12);
    }
  }, [inView, loadMore, status]);

  return (
    <>
      {/* Posts Grid — 3 columns, Instagram-style */}
      <div className="mx-auto mt-6 max-w-3xl px-1">
        {posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post, index) => (
              <PostThumbnail
                key={post._id}
                post={post}
                onClick={() => setSelectedPostIndex(index)}
                nsfwPreference={nsfwPreference}
              />
            ))}
          </div>
        ) : status === "LoadingFirstPage" ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="h-6 w-6" />
            <p className="mt-3 text-sm text-muted-foreground">
              Loading posts...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No posts yet</p>
          </div>
        )}

        {/* Loading more indicator */}
        {status === "LoadingMore" && (
          <div className="flex justify-center py-4">
            <Spinner className="h-5 w-5" />
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={ref} className="h-4" />
      </div>

      {/* Post Detail Viewer (Modal) */}
      {selectedPostIndex !== null && (
        <PostDetailViewer
          posts={posts}
          initialIndex={selectedPostIndex}
          onClose={() => setSelectedPostIndex(null)}
          nsfwPreference={nsfwPreference}
        />
      )}
    </>
  );
}
