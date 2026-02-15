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
import {
  useStablePaginatedQuery,
  useStableQuery,
} from "../../app/lib/hooks/use-stable-query";

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
        "flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-white/5",
        isActive && "bg-white/[0.08]",
      )}
    >
      {/* Avatar — candy.ai uses ~52px */}
      <Avatar className="h-[52px] w-[52px] shrink-0">
        <AvatarImage
          src={character.cardImageUrl || ""}
          alt={character.name || ""}
          className="object-cover"
        />
        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-lg text-white">
          {character.name?.[0] || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          {/* Name — candy.ai: ~15px, bold, white */}
          <span className="truncate text-[15px] font-bold text-white">
            {character.name || "Unknown"}
          </span>
          {timeStr && (
            <span className="shrink-0 pl-2 text-[11px] font-normal text-white/35">
              {timeStr}
            </span>
          )}
        </div>
        {/* Message preview — candy.ai: ~13px, muted */}
        <p className="mt-1 truncate text-[13px] text-white/35">
          {message?.text
            ? (() => {
                const cleaned = message.text
                  .replace(/^\d+\.\s*/, "")
                  .replace(/^[-*]\s*/, "");
                return cleaned.substring(0, 32) + (cleaned.length > 32 ? "..." : "");
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
    <div className="flex h-full w-[270px] shrink-0 flex-col border-r border-white/[0.08]">
      {/* Header — "Chat" large and bold like candy.ai (~24px) */}
      <div className="px-5 pb-4 pt-5">
        <h2 className="text-2xl font-bold text-white">Chat</h2>
      </div>

      {/* Search — seamless, candy.ai style: no visible border */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.05] px-3 py-2.5">
          <Search className="h-[16px] w-[16px] shrink-0 text-white/25" />
          <input
            type="text"
            placeholder="Search for a profile..."
            className="w-full border-0 bg-transparent text-[13px] text-white placeholder-white/25 outline-none ring-0 focus:outline-none focus:ring-0"
            style={{ boxShadow: "none" }}
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
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-white/25">
            <p>No conversations yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
