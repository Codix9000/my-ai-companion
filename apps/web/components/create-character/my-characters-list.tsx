"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus, Sparkles } from "lucide-react";

interface Character {
  _id: string;
  name?: string;
  cardImageUrl?: string;
  description?: string;
  numChats?: number;
}

export default function MyCharactersList({
  characters,
}: {
  characters: any[];
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Your AI Girlfriends</h1>
          <p className="mt-1 text-sm text-white/50">
            {characters.length} character{characters.length !== 1 ? "s" : ""} created
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {/* Create New button */}
        <Link
          href="/create?new=true"
          className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.04] p-6 transition-all hover:border-pink-500/50 hover:bg-pink-500/10"
          style={{ aspectRatio: "3/4" }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg shadow-pink-500/25 transition-transform group-hover:scale-110">
            <Plus className="h-7 w-7 text-white" />
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-white/70 group-hover:text-pink-400">
            <Sparkles className="h-3.5 w-3.5" />
            Create New
          </div>
        </Link>

        {characters.map((char) => (
          <Link
            key={char._id}
            href={`/character/${char._id}`}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all hover:border-pink-500/40 hover:shadow-lg hover:shadow-pink-500/10"
            style={{ aspectRatio: "3/4" }}
          >
            <Image
              src={char.cardImageUrl}
              alt={char.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10">
              <p className="truncate text-sm font-bold text-white">{char.name}</p>
              {char.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-white/60">
                  {char.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
