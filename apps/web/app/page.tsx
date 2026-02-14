"use client";

import { api } from "../convex/_generated/api";
import { useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { useStablePaginatedQuery } from "./lib/hooks/use-stable-query";
import { useTranslation } from "react-i18next";
import { Unauthenticated, useQuery } from "convex/react";
import PostCard from "../components/feed/post-card";
import { useNsfwPreference } from "./lib/hooks/use-nsfw-preference";
import useStoreUserEffect from "./lib/hooks/use-store-user-effect";
import PreferenceDialog from "../components/user/preference-dialog";
import useCurrentUser from "./lib/hooks/use-current-user";
import Spinner from "@repo/ui/src/components/spinner";
import HeroCarousel from "../components/home/hero-carousel";
import StoryBar from "../components/home/story-bar";

export default function HomePage() {
  const { t } = useTranslation();
  const { nsfwPreference } = useNsfwPreference();
  useStoreUserEffect();

  const banners = useQuery(api.home.getActiveBanners) ?? [];
  const charactersWithPosts = useQuery(api.home.getCharactersWithPosts) ?? [];

  const { results, status, loadMore } = useStablePaginatedQuery(
    api.feed.getFeed,
    { format: "feed", nsfwPreference },
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
    <div className="h-full w-full overflow-x-hidden pb-24">
      <Unauthenticated>{!username && <PreferenceDialog />}</Unauthenticated>

      <div className="px-4 pt-4 lg:px-6">
        <HeroCarousel banners={banners} />
      </div>

      <div className="px-4 lg:px-6">
        <StoryBar characters={charactersWithPosts as any} />
      </div>

      <div className="mx-auto max-w-xl px-4 lg:px-0">
        <div className="flex flex-col gap-6 pt-4">
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">{t("No posts yet")}</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                {t("When creators share posts, they'll appear here. Check back soon!")}
              </p>
            </div>
          )}

          {status === "LoadingMore" && (
            <div className="flex justify-center py-4">
              <Spinner className="h-6 w-6" />
            </div>
          )}

          <div ref={ref} className="h-4" />
        </div>
      </div>
    </div>
  );
}
