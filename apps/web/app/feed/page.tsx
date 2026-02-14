"use client";

import { api } from "../../convex/_generated/api";
import { useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { useStablePaginatedQuery } from "../lib/hooks/use-stable-query";
import { useTranslation } from "react-i18next";
import { Unauthenticated } from "convex/react";
import PostCard from "../../components/feed/post-card";
import { useNsfwPreference } from "../lib/hooks/use-nsfw-preference";
import useStoreUserEffect from "../lib/hooks/use-store-user-effect";
import PreferenceDialog from "../../components/user/preference-dialog";
import useCurrentUser from "../lib/hooks/use-current-user";
import Spinner from "@repo/ui/src/components/spinner";

const FeedPage = () => {
  const { t } = useTranslation();
  const { nsfwPreference } = useNsfwPreference();
  useStoreUserEffect();

  const { results, status, loadMore } = useStablePaginatedQuery(
    api.feed.getFeed,
    {
      format: "feed",
      nsfwPreference,
    },
    { initialNumItems: 10 }
  );

  const posts = results || [];
  const ref = useRef(null);
  const inView = useInView(ref);
  const me = useCurrentUser();
  const username = me?.name;

  useEffect(() => {
    if (inView && status === "CanLoadMore") {
      loadMore(5);
    }
  }, [inView, loadMore, status]);

  return (
    <div className="h-full w-full overflow-x-hidden pb-24 lg:pl-16">
      <Unauthenticated>{!username && <PreferenceDialog />}</Unauthenticated>

      <div className="mx-auto max-w-xl px-4 lg:px-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-4 mb-4">
          <h1 className="text-xl font-bold">{t("Home")}</h1>
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
            <div className="flex flex-col items-center justify-center py-20">
              <Spinner className="h-8 w-8" />
              <p className="mt-4 text-muted-foreground">{t("Loading feed...")}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <svg
                  className="h-12 w-12 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{t("No posts yet")}</h3>
              <p className="text-muted-foreground max-w-sm">
                {t("When creators share posts, they'll appear here. Check back soon!")}
              </p>
            </div>
          )}

          {/* Loading more indicator */}
          {status === "LoadingMore" && (
            <div className="flex justify-center py-4">
              <Spinner className="h-6 w-6" />
            </div>
          )}

          {/* Infinite scroll trigger */}
          <div ref={ref} className="h-4" />
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
