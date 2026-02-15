"use client";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@repo/ui/src/utils";
import { useStablePaginatedQuery, useStableQuery } from "../../app/lib/hooks/use-stable-query";

interface ChatHistorySidebarProps {
  currentCharacterId?: Id<"characters"> | null;
}

function CharacterChatItem({
  chatId,
  characterId,
  isActive,
}: {
  chatId: Id<"chats">;
  characterId: Id<"characters">;
  isActive: boolean;
}) {
  const character = useStableQuery(api.characters.get, { id: characterId });
  const message = useStableQuery(api.messages.mostRecentMessage, { chatId });
  const recentMessageAt = message?._creationTime as number;

  if (!character) return null;

  const timeStr =
    recentMessageAt && !isNaN(new Date(recentMessageAt).getTime())
      ? formatDistanceToNow(new Date(recentMessageAt), { addSuffix: false })
          .replace("about ", "")
          .replace("less than a minute", "now")
      : "";

  return (
    <Link
      href={`/chats?characterId=${characterId}`}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-primary/10",
        isActive && "bg-primary/15",
      )}
    >
      <Avatar className="h-11 w-11 shrink-0 ring-2 ring-pink-500/20">
        <AvatarImage
          src={character.cardImageUrl || ""}
          alt={character.name || ""}
          className="object-cover"
        />
        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-sm text-white">
          {character.name?.[0] || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-semibold text-foreground">
            {character.name || "Unknown"}
          </p>
          {timeStr && (
            <span className="shrink-0 text-[11px] text-muted-foreground/60">
              {timeStr}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {message?.text
            ? (() => {
                const cleaned = message.text
                  .replace(/^\d+\.\s*/, "")
                  .replace(/^[-*]\s*/, "");
                return (
                  cleaned.substring(0, 40) +
                  (cleaned.length > 40 ? "..." : "")
                );
              })()
            : "Start chatting..."}
        </p>
      </div>
    </Link>
  );
}

export default function ChatHistorySidebar({
  currentCharacterId,
}: ChatHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { results: chats } = useStablePaginatedQuery(
    api.chats.list,
    {},
    { initialNumItems: 50 },
  );

  const characterChats = useMemo(() => {
    if (!chats) return [];
    const chatsByCharacter = new Map<string, (typeof chats)[0]>();
    for (const chat of chats) {
      const charId = chat.characterId as string;
      if (!chatsByCharacter.has(charId)) {
        chatsByCharacter.set(charId, chat);
      }
    }
    return Array.from(chatsByCharacter.values());
  }, [chats]);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border/40 bg-background/50">
      {/* Header */}
      <div className="border-b border-border/30 px-4 pb-3 pt-4">
        <h2 className="text-xl font-bold text-foreground">Chat</h2>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for a profile..."
            className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {characterChats.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {characterChats.map((chat) => (
              <CharacterChatItem
                key={chat._id}
                chatId={chat._id}
                characterId={chat.characterId as Id<"characters">}
                isActive={currentCharacterId === chat.characterId}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
            <p>No conversations yet</p>
            <p className="mt-1 text-xs">Start chatting with characters!</p>
          </div>
        )}
      </div>
    </div>
  );
}
