"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";
import { ArrowDownUp, Image as ImageIcon, Video } from "lucide-react";
import Image from "next/image";
import Spinner from "@repo/ui/src/components/spinner";

type SortOption = "newest" | "oldest" | "az" | "za";

const sortLabels: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  az: "A-Z by name",
  za: "Z-A by name",
};

export default function CollectionPage() {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    type: "image" | "video";
  } | null>(null);

  const collection = useQuery(api.collection.getMyCollection, { sortBy });

  return (
    <div className="flex flex-col gap-4 px-3 pb-24 sm:px-4 lg:px-2">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 lg:pt-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            My
          </span>{" "}
          Collection
        </h1>

        {/* Sort by button */}
        <div className="relative mr-2 sm:mr-4">
          <button
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent"
            onClick={() => setSortOpen(!sortOpen)}
          >
            Sort by
            <ArrowDownUp className="h-4 w-4" />
          </button>

          {/* Sort dropdown */}
          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSortOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                {(Object.entries(sortLabels) as [SortOption, string][]).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                        sortBy === value
                          ? "bg-primary/10 font-medium text-foreground"
                          : "text-foreground/70"
                      }`}
                      onClick={() => {
                        setSortBy(value);
                        setSortOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Collection Content */}
      {collection === undefined ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner className="h-6 w-6" />
          <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : collection.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-6">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No media yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Generated images and videos with your AI characters will appear
            here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {collection.map((group) => (
            <div key={group.characterId}>
              {/* Character header */}
              <div className="mb-3 flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-pink-500/20">
                  <AvatarImage
                    src={group.characterAvatar || ""}
                    alt={group.characterName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-sm text-white">
                    {group.characterName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-base font-semibold leading-tight text-foreground">
                    {group.characterName}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    {group.media.length}
                  </div>
                </div>
              </div>

              {/* Media grid — 3:4 aspect ratio cards */}
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {group.media.map((item) => (
                  <div
                    key={item._id}
                    className="group relative cursor-pointer overflow-hidden rounded-lg bg-muted"
                    style={{ aspectRatio: "3/4" }}
                    onClick={() =>
                      setSelectedMedia({
                        url: item.mediaUrl,
                        type: item.mediaType,
                      })
                    }
                  >
                    {item.mediaType === "image" ? (
                      <Image
                        src={item.mediaUrl}
                        alt={item.prompt || "Generated image"}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
                      />
                    ) : (
                      <video
                        src={item.mediaUrl}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    )}

                    {/* Video badge */}
                    {item.mediaType === "video" && (
                      <div className="absolute right-1.5 top-1.5">
                        <Video className="h-4 w-4 text-white drop-shadow-lg" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
            onClick={() => setSelectedMedia(null)}
          >
            ✕
          </button>
          {selectedMedia.type === "image" ? (
            <div className="relative max-h-[85vh] max-w-[90vw]">
              <Image
                src={selectedMedia.url}
                alt="Full size"
                width={1024}
                height={1792}
                className="max-h-[85vh] w-auto rounded-lg object-contain"
              />
            </div>
          ) : (
            <video
              src={selectedMedia.url}
              className="max-h-[85vh] max-w-[90vw] rounded-lg"
              controls
              autoPlay
              loop
              muted
              playsInline
            />
          )}
        </div>
      )}
    </div>
  );
}
