"use client";

import { useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ImageIcon } from "lucide-react";
import { useStablePaginatedQuery } from "../../app/lib/hooks/use-stable-query";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import PostCard from "../feed/post-card";
import Spinner from "@repo/ui/src/components/spinner";

interface ProfilePostsProps {
  characterId: Id<"characters">;
  nsfwPreference?: string;
}

export default function ProfilePosts({
  characterId,
  nsfwPreference,
}: ProfilePostsProps) {
  const { t } = useTranslation();

  const { results, status, loadMore } = useStablePaginatedQuery(
    api.feed.getPostsByAuthor,
    { authorId: characterId },
    { initialNumItems: 10 }
  );

  const posts = results || [];
  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (inView && status === "CanLoadMore") {
      loadMore(5);
    }
  }, [inView, loadMore, status]);

  return (
    <div className="mx-auto mt-8 max-w-2xl px-4">
      {/* Section Header */}
      <div className="mb-4 flex items-center gap-2 border-b pb-3">
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">{t("Posts")}</h2>
      </div>

      {/* Posts Feed */}
      <div className="flex flex-col gap-6">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post._id}
              id={post._id}
              author={post.author}
              mediaUrl={post.mediaUrl}
              mediaType={post.mediaType}
              caption={post.caption}
              likesCount={post.likesCount}
              isLocked={post.isLocked}
              isNSFW={post.isNSFW}
              nsfwPreference={nsfwPreference}
            />
          ))
        ) : status === "LoadingFirstPage" ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="h-6 w-6" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("Loading posts...")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-medium">{t("No posts yet")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("When this creator shares posts, they'll appear here.")}
            </p>
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
    </div>
  );
}
