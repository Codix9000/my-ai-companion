"use client";

import { useQuery } from "convex/react";
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
import { MessageSquare, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { useStablePaginatedQuery, useStableQuery } from "../../app/lib/hooks/use-stable-query";

interface ChatHistorySidebarProps {
  characterId: Id<"characters">;
  currentChatId?: Id<"chats">;
  characterName: string;
  cardImageUrl?: string;
}

interface ChatItemProps {
  chatId: Id<"chats">;
  characterId: Id<"characters">;
  isActive: boolean;
  isCollapsed: boolean;
}

function ChatItem({ chatId, characterId, isActive, isCollapsed }: ChatItemProps) {
  const message = useStableQuery(api.messages.mostRecentMessage, { chatId });
  const recentMessageAt = message?._creationTime as number;

  return (
    <Link
      href={`/character/${characterId}/chat?chatId=${chatId}`}
      className={cn(
        "flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-primary/10",
        isActive && "bg-primary/15 ring-1 ring-pink-500/30"
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400/20 to-purple-500/20">
        <MessageSquare className="h-4 w-4 text-pink-500" />
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm text-foreground">
            {message?.text ? message.text.substring(0, 40) + (message.text.length > 40 ? "..." : "") : "New conversation"}
          </p>
          {recentMessageAt && !isNaN(new Date(recentMessageAt).getTime()) && (
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(recentMessageAt), { addSuffix: true })}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}

export default function ChatHistorySidebar({
  characterId,
  currentChatId,
  characterName,
  cardImageUrl,
}: ChatHistorySidebarProps) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Fetch chats for this specific character
  const { results: chats } = useStablePaginatedQuery(
    api.chats.list,
    {},
    { initialNumItems: 20 }
  );

  // Filter chats for this character only
  const characterChats = chats?.filter(
    (chat) => chat.characterId === characterId
  ) || [];

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
            <Avatar className="h-8 w-8 ring-2 ring-pink-500/20">
              <AvatarImage src={cardImageUrl || ""} alt={characterName} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-sm text-white">
                {characterName?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{t("Chats")}</span>
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

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2">
        {characterChats.length > 0 ? (
          <div className="flex flex-col gap-1">
            {characterChats.map((chat) => (
              <ChatItem
                key={chat._id}
                chatId={chat._id}
                characterId={characterId}
                isActive={currentChatId === chat._id}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        ) : (
          !isCollapsed && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="mb-2 h-8 w-8 opacity-50" />
              <p>{t("No conversations yet")}</p>
            </div>
          )
        )}
      </div>

      {/* New Chat Button */}
      {!isCollapsed && (
        <div className="border-t p-3">
          <Link href={`/character/${characterId}/chat`}>
            <Button
              variant="outline"
              className="w-full gap-2 border-pink-500/30 hover:bg-pink-500/10"
            >
              <Plus className="h-4 w-4" />
              {t("New Chat")}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
