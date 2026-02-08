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
import { Button } from "@repo/ui/src/components/button";
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { cn } from "@repo/ui/src/utils";
import { useStablePaginatedQuery, useStableQuery } from "../../app/lib/hooks/use-stable-query";

interface ChatHistorySidebarProps {
  currentCharacterId?: Id<"characters"> | null;
  onSelectCharacter?: (characterId: string) => void;
}

interface CharacterChatItemProps {
  chatId: Id<"chats">;
  characterId: Id<"characters">;
  isActive: boolean;
  isCollapsed: boolean;
}

function CharacterChatItem({ chatId, characterId, isActive, isCollapsed }: CharacterChatItemProps) {
  const character = useStableQuery(api.characters.get, { id: characterId });
  const message = useStableQuery(api.messages.mostRecentMessage, { chatId });
  const recentMessageAt = message?._creationTime as number;

  if (!character) return null;

  return (
    <Link
      href={`/chats?characterId=${characterId}`}
      className={cn(
        "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-primary/10",
        isActive && "bg-primary/15 ring-1 ring-pink-500/30"
      )}
    >
      <Avatar className="h-10 w-10 shrink-0 ring-2 ring-pink-500/20">
        <AvatarImage src={character.cardImageUrl || ""} alt={character.name || ""} className="object-cover" />
        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-sm text-white">
          {character.name?.[0] || "?"}
        </AvatarFallback>
      </Avatar>
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-foreground">
            {character.name || "Unknown"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {message?.text
              ? (() => {
                  // Strip markdown list prefixes (e.g. "1. ", "2. ", "- ")
                  const cleaned = message.text.replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, "");
                  return cleaned.substring(0, 30) + (cleaned.length > 30 ? "..." : "");
                })()
              : "Start chatting..."}
          </p>
          {recentMessageAt && !isNaN(new Date(recentMessageAt).getTime()) && (
            <p className="text-xs text-muted-foreground/70">
              {formatDistanceToNow(new Date(recentMessageAt), { addSuffix: true })}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}

export default function ChatHistorySidebar({
  currentCharacterId,
}: ChatHistorySidebarProps) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Fetch all user's chats
  const { results: chats } = useStablePaginatedQuery(
    api.chats.list,
    {},
    { initialNumItems: 50 }
  );

  // Group chats by character - keep only the most recent chat per character
  const characterChats = useMemo(() => {
    if (!chats) return [];
    
    const chatsByCharacter = new Map<string, typeof chats[0]>();
    
    for (const chat of chats) {
      const charId = chat.characterId as string;
      if (!chatsByCharacter.has(charId)) {
        chatsByCharacter.set(charId, chat);
      }
    }
    
    return Array.from(chatsByCharacter.values());
  }, [chats]);

  return (
    <div
      className={cn(
        "hidden h-full flex-col border-r bg-background/50 transition-all duration-300 lg:flex",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-pink-500" />
            <span className="font-medium text-sm">{t("Conversations")}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Chat List - One per character */}
      <div className="flex-1 overflow-y-auto p-2">
        {characterChats.length > 0 ? (
          <div className="flex flex-col gap-1">
            {characterChats.map((chat) => (
              <CharacterChatItem
                key={chat._id}
                chatId={chat._id}
                characterId={chat.characterId as Id<"characters">}
                isActive={currentCharacterId === chat.characterId}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        ) : (
          !isCollapsed && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="mb-2 h-8 w-8 opacity-50" />
              <p>{t("No conversations yet")}</p>
              <p className="text-xs mt-1">{t("Start chatting with characters!")}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
