"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { Id } from "../convex/_generated/dataModel";
import {
  Image as ImageIcon,
  MoreHorizontal,
  Send,
  Video,
  Sparkles,
  Delete,
  Edit,
  Repeat,
  Share,
} from "lucide-react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Button } from "@repo/ui/src/components";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/src/components/alert-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Spinner from "@repo/ui/src/components/spinner";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { ConvexError } from "convex/values";
import { useCrystalDialog } from "./lib/hooks/use-crystal-dialog";
import { usePostHog } from "posthog-js/react";
import {
  useStablePaginatedQuery,
  useStableQuery,
} from "./lib/hooks/use-stable-query";
import usePersona from "./lib/hooks/use-persona";
import React from "react";
import { FormattedMessage } from "../components/formatted-message";
import { useResponsivePopover } from "@repo/ui/src/hooks/use-responsive-popover";

// ─── Message Bubble ──────────────────────────────────────────────
export const Message = ({
  name,
  message,
  cardImageUrl,
  username = "You",
}: {
  index?: number;
  name: string;
  message: any;
  cardImageUrl: string;
  username?: string;
  chatId?: Id<"chats">;
}) => {
  const isCharacter = !!message?.characterId;

  return (
    <div
      className={`flex gap-2.5 ${isCharacter ? "justify-start" : "flex-row-reverse"}`}
    >
      {/* Avatar */}
      <Avatar className="mt-1 h-8 w-8 shrink-0">
        <AvatarImage
          src={cardImageUrl || ""}
          alt={isCharacter ? name : username}
          className="object-cover"
        />
        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-xs text-white">
          {isCharacter ? name?.[0] : username?.[0]}
        </AvatarFallback>
      </Avatar>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isCharacter ? "" : "text-right"}`}>
        {message?.text === "" ? (
          <div className="inline-flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-pink-400"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-pink-400"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-2 w-2 animate-bounce rounded-full bg-pink-400"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        ) : (
          <div
            className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
              isCharacter
                ? "bg-muted text-foreground"
                : "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
            }`}
          >
            <FormattedMessage message={message} username={username} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Chat Options Popover ────────────────────────────────────────
const ChatOptionsPopover = ({
  characterId,
  chatId,
  name,
  showEdit,
}: {
  characterId: Id<"characters">;
  chatId: Id<"chats">;
  name: string;
  showEdit: boolean;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const remove = useMutation(api.chats.remove);
  const { Popover, PopoverContent, PopoverTrigger } = useResponsivePopover();

  return (
    <Popover>
      <AlertDialog>
        <PopoverContent className="p-1 lg:w-48">
          {showEdit && (
            <Link href={`/my-characters/create?id=${characterId}`}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-sm text-muted-foreground"
              >
                <Edit className="h-4 w-4" />
                {t("Edit character")}
              </Button>
            </Link>
          )}
          <Link href={`/my-characters/create?remixId=${characterId}`}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm text-muted-foreground"
            >
              <Repeat className="h-4 w-4" />
              {t("Remix character")}
            </Button>
          </Link>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm text-muted-foreground"
            >
              <Delete className="h-4 w-4" />
              {t("Delete chat")}
            </Button>
          </AlertDialogTrigger>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sm text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.share) {
                navigator.share({
                  title: document.title,
                  url: document.location.href,
                });
              } else {
                navigator.clipboard.writeText(document.location.href);
                toast.success("Link copied to clipboard");
              }
            }}
          >
            <Share className="h-4 w-4" />
            {t("Share")}
          </Button>
        </PopoverContent>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you absolutely sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const promise = remove({ id: chatId });
                toast.promise(promise, {
                  loading: "Deleting chat...",
                  success: () => {
                    router.back();
                    return "Chat has been deleted.";
                  },
                  error: (error) => {
                    return error
                      ? (error.data as { message: string })?.message
                      : "Unexpected error occurred";
                  },
                });
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
    </Popover>
  );
};

// ─── Main Dialog Component ───────────────────────────────────────
export function Dialog({
  name,
  description,
  creatorName,
  userId,
  creatorId,
  model,
  cardImageUrl,
  chatId,
  characterId,
  isAuthenticated,
}: {
  name: string;
  description?: string;
  creatorName?: string | null | undefined;
  userId?: Id<"users">;
  creatorId?: Id<"users">;
  model: string;
  cardImageUrl?: string;
  chatId: Id<"chats">;
  characterId: Id<"characters">;
  isAuthenticated: boolean;
}) {
  const { t } = useTranslation();

  const { results, loadMore } = useStablePaginatedQuery(
    api.messages.list,
    chatId && isAuthenticated ? { chatId } : "skip",
    { initialNumItems: 10 },
  );
  const remoteMessages = results.reverse();
  const messages = useMemo(
    () =>
      (
        [] as {
          characterId: Id<"characters">;
          text: string;
          _id: string;
        }[]
      ).concat(
        (remoteMessages ?? []) as {
          characterId: Id<"characters">;
          text: string;
          _id: string;
        }[],
      ),
    [remoteMessages],
  );

  const persona = usePersona();
  const username = persona?.name;
  const sendMessage = useMutation(api.messages.send);
  const posthog = usePostHog();
  const [isScrolled, setScrolled] = useState(false);
  const [input, setInput] = useState("");
  const { openDialog } = useCrystalDialog();

  const sendAndReset = async (text: string) => {
    setInput("");
    try {
      await sendMessage({ message: text, chatId, characterId });
      posthog.capture("send_message");
    } catch (error) {
      if (error instanceof ConvexError) {
        openDialog();
      } else {
        toast.error("An unknown error occurred");
      }
    }
  };

  const handleSend = (event?: FormEvent) => {
    event && event.preventDefault();
    if (input.trim()) {
      sendAndReset(input);
      setScrolled(false);
    }
  };

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isScrolled) return;
    setTimeout(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 0);
  }, [messages, isScrolled]);

  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (inView && isScrolled) {
      loadMore(5);
    }
  }, [inView, loadMore]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Chat Header ── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/30 px-4">
        <Link
          href={`/character/${characterId}`}
          className="flex items-center gap-3"
        >
          <Avatar className="h-9 w-9 ring-2 ring-pink-500/30">
            <AvatarImage
              src={cardImageUrl || ""}
              alt={name}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-sm text-white">
              {name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-base font-semibold text-foreground">
            {name}
          </span>
        </Link>
        <ChatOptionsPopover
          characterId={characterId}
          chatId={chatId}
          name={name}
          showEdit={userId === creatorId}
        />
      </div>

      {/* ── Messages Area ── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        ref={listRef}
        onWheel={() => setScrolled(true)}
      >
        <div ref={ref} />
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {remoteMessages === undefined ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Spinner className="h-5 w-5" />
              </div>
            ) : (
              messages.map((message, i) => (
                <motion.div
                  key={message._id}
                  initial={{ scale: 0.97, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Message
                    index={i}
                    name={name}
                    message={message}
                    cardImageUrl={
                      message?.characterId
                        ? (cardImageUrl as string)
                        : (persona?.cardImageUrl as string)
                    }
                    username={(username as string) || "You"}
                    chatId={chatId}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Input Bar ── */}
      <div className="shrink-0 border-t border-border/30 px-4 py-3">
        <form
          className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2"
          onSubmit={handleSend}
        >
          <input
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
            autoFocus
            name="message"
            placeholder={t("Write a message...")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            type="submit"
            disabled={!input.trim()}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {/* Generate buttons */}
        <div className="mt-2 flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50">
            <span className="relative">
              <ImageIcon className="h-4 w-4" />
              <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 text-yellow-400" />
            </span>
            Generate Image
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50">
            <span className="relative">
              <Video className="h-4 w-4" />
              <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 text-yellow-400" />
            </span>
            Generate Video
          </button>
        </div>
      </div>
    </div>
  );
}
