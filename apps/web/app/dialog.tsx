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
} from "./lib/hooks/use-stable-query";
import usePersona from "./lib/hooks/use-persona";
import React from "react";
import { FormattedMessage } from "../components/formatted-message";
import { useResponsivePopover } from "@repo/ui/src/hooks/use-responsive-popover";

// ─── Message ─────────────────────────────────────────────────────
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
      {/* Avatar — small inline */}
      <Avatar className="mt-0.5 h-7 w-7 shrink-0">
        <AvatarImage
          src={cardImageUrl || ""}
          alt={isCharacter ? name : username}
          className="object-cover"
        />
        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-[10px] text-white">
          {isCharacter ? name?.[0] : username?.[0]}
        </AvatarFallback>
      </Avatar>

      {/* Message text — plain, no background boxes */}
      <div className="max-w-[75%]">
        {message?.text === "" ? (
          <div className="flex items-center gap-1 py-2">
            <span className="h-2 w-2 animate-bounce rounded-full bg-pink-400" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-pink-400" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-pink-400" style={{ animationDelay: "300ms" }} />
          </div>
        ) : (
          <div className="text-[14px] leading-relaxed text-white/90">
            <FormattedMessage message={message} username={username} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Chat Options ────────────────────────────────────────────────
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
              <Button variant="ghost" className="w-full justify-start gap-2 text-sm text-muted-foreground">
                <Edit className="h-4 w-4" /> {t("Edit character")}
              </Button>
            </Link>
          )}
          <Link href={`/my-characters/create?remixId=${characterId}`}>
            <Button variant="ghost" className="w-full justify-start gap-2 text-sm text-muted-foreground">
              <Repeat className="h-4 w-4" /> {t("Remix character")}
            </Button>
          </Link>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 text-sm text-muted-foreground">
              <Delete className="h-4 w-4" /> {t("Delete chat")}
            </Button>
          </AlertDialogTrigger>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sm text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.share) {
                navigator.share({ title: document.title, url: document.location.href });
              } else {
                navigator.clipboard.writeText(document.location.href);
                toast.success("Link copied to clipboard");
              }
            }}
          >
            <Share className="h-4 w-4" /> {t("Share")}
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
                  success: () => { router.back(); return "Chat has been deleted."; },
                  error: (error) => error ? (error.data as { message: string })?.message : "Unexpected error occurred",
                });
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-white/60 hover:text-white">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
    </Popover>
  );
};

// ─── Main Dialog ─────────────────────────────────────────────────
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
      ([] as { characterId: Id<"characters">; text: string; _id: string }[]).concat(
        (remoteMessages ?? []) as { characterId: Id<"characters">; text: string; _id: string }[],
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
      if (error instanceof ConvexError) openDialog();
      else toast.error("An unknown error occurred");
    }
  };

  const handleSend = (event?: FormEvent) => {
    event?.preventDefault();
    if (input.trim()) {
      sendAndReset(input);
      setScrolled(false);
    }
  };

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isScrolled) return;
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [messages, isScrolled]);

  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (inView && isScrolled) loadMore(5);
  }, [inView, loadMore]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Header — candy.ai style: large avatar + bold name ── */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <Link href={`/character/${characterId}`} className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={cardImageUrl || ""} alt={name} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-sm text-white">
              {name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-lg font-bold text-white">{name}</span>
        </Link>
        <ChatOptionsPopover
          characterId={characterId}
          chatId={chatId}
          name={name}
          showEdit={userId === creatorId}
        />
      </div>

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto px-5 py-5"
        ref={listRef}
        onWheel={() => setScrolled(true)}
      >
        <div ref={ref} />
        <div className="flex flex-col gap-5">
          <AnimatePresence>
            {remoteMessages === undefined ? (
              <div className="flex items-center justify-center py-12">
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

      {/* ── Input Area — ONE unified rounded container like candy.ai ── */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
          {/* Top row: text input */}
          <form onSubmit={handleSend}>
            <input
              className="w-full border-0 bg-transparent px-4 pb-1 pt-3 text-[14px] text-white placeholder-white/30 outline-none ring-0 focus:outline-none focus:ring-0"
              style={{ boxShadow: "none" }}
              autoFocus
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

            {/* Bottom row: icon buttons (left) + send button (right) */}
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
              <div className="flex items-center gap-1">
                {/* Generate Image */}
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
                >
                  <span className="relative">
                    <ImageIcon className="h-[18px] w-[18px]" />
                    <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 text-yellow-400" />
                  </span>
                </button>
                {/* Generate Video */}
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
                >
                  <span className="relative">
                    <Video className="h-[18px] w-[18px]" />
                    <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 text-yellow-400" />
                  </span>
                </button>
              </div>

              {/* Send button — gradient circle */}
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/20 transition-all disabled:opacity-30 hover:from-pink-600 hover:to-purple-600"
              >
                <Send className="h-[16px] w-[16px]" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
