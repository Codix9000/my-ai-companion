"use client";
import { api } from "../../convex/_generated/api";
import { useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { useStablePaginatedQuery } from "../lib/hooks/use-stable-query";
import Image from "next/image";
import Link from "next/link";

const Characters = () => {
  const { results, status, loadMore } = useStablePaginatedQuery(
    api.characters.listByPopularity,
    {},
    { initialNumItems: 20 },
  );

  const allCharacters = (results || []).filter(
    (character: any) => character.name && character.cardImageUrl,
  );

  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (inView && status === "CanLoadMore") {
      loadMore(12);
    }
  }, [inView, loadMore, status]);

  return (
    <div className="flex flex-col gap-5 px-3 pb-24 sm:px-4 lg:px-2">
      {/* Page Title — "OpenRoleplay Characters" */}
      <div className="pt-4 lg:pt-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            OpenRoleplay
          </span>{" "}
          <span className="text-foreground">Characters</span>
        </h1>
      </div>

      {/* Character Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 2xl:grid-cols-5">
        {allCharacters.length > 0
          ? allCharacters.map((character: any) => (
              <DiscoverCard
                key={character._id}
                id={character._id}
                name={character.name}
                age={character.age}
                description={character.description}
                cardImageUrl={character.cardImageUrl}
              />
            ))
          : status === "LoadingFirstPage"
            ? Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl bg-muted"
                  style={{ aspectRatio: "3/4" }}
                />
              ))
            : null}

        {status === "LoadingMore" &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`loading-${i}`}
              className="animate-pulse rounded-xl bg-muted"
              style={{ aspectRatio: "3/4" }}
            />
          ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={ref} className="h-4" />
    </div>
  );
};

// Individual character card — candy.ai style
function DiscoverCard({
  id,
  name,
  age,
  description,
  cardImageUrl,
}: {
  id: string;
  name: string;
  age?: number;
  description?: string;
  cardImageUrl: string;
}) {
  return (
    <Link href={`/character/${id}`} className="group">
      <div
        className="relative overflow-hidden rounded-xl bg-muted shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
        style={{ aspectRatio: "3/4" }}
      >
        {/* Character Image */}
        <Image
          src={cardImageUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />

        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Text content — bottom */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          {/* Name + Age */}
          <h3 className="text-xl font-bold leading-tight text-white sm:text-2xl">
            {name}
            {age && (
              <span className="ml-1.5 text-lg font-normal text-white/70 sm:text-xl">
                {age}
              </span>
            )}
          </h3>

          {/* Description */}
          {description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-white/70">
              {description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default Characters;
