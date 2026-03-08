"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { Id } from "../convex/_generated/dataModel";
import {
  Image as ImageIcon,
  Flame,
  Heart,
  Lightbulb,
  MoreHorizontal,
  Send,
  Video,
  Sparkles,
  Delete,
  Edit,
  Repeat,
  Share,
  X,
  Dices,
} from "lucide-react";
import { Progress } from "@repo/ui/src/components/progress";
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
import Image from "next/image";
import { FormattedMessage } from "../components/formatted-message";
import { useResponsivePopover } from "@repo/ui/src/hooks/use-responsive-popover";

const PHOTO_REQUEST_PATTERN = /\b(send\s+me|show\s+me|can\s+you\s+(show|send)|take\s+a?\s*(pic|photo|selfie|picture)|send\s+a?\s*(pic|photo|selfie|picture)|i\s+want\s+a?\s*(pic|photo|picture)|i\s+wanna\s+see|let\s+me\s+see)/i;

const NSFW_DETECT_PATTERN = /\b(naked|nude|topless|nsfw|strip|undress|lingerie|panties|bra\b|ass\b|boobs|tits|pussy|dick|cock|blowjob|sex\b|fuck|horny|naughty|explicit|thong|nipple|orgasm|cum\b|wet\b|spread|bent\s*over|no\s*cloth|take.*off|nothing\s*on|titties|butt|cleavage|underwear)\b/i;

// ── Pose suggestions for inline image generation ──
const POSE_SUGGESTIONS = [
  { label: "Selfie", promptText: "a selfie" },
  { label: "Posing", promptText: "posing" },
  { label: "Sitting", promptText: "sitting" },
  { label: "Kneeling", promptText: "kneeling" },
  { label: "Squatting", promptText: "squatting" },
];

// ─── Message ─────────────────────────────────────────────────────
export const Message = ({
  name,
  message,
  cardImageUrl,
  username = "You",
  onImageClick,
}: {
  index?: number;
  name: string;
  message: any;
  cardImageUrl: string;
  username?: string;
  chatId?: Id<"chats">;
  onImageClick?: (imageUrl: string) => void;
}) => {
  const isCharacter = !!message?.characterId;

  return (
    <div
      className={`flex gap-2.5 ${isCharacter ? "justify-start" : "flex-row-reverse"}`}
    >
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

      <div className="max-w-[75%]">
        {message?.imageUrl ? (
          <div className="overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => onImageClick?.(message.imageUrl)}
              className="block w-full cursor-zoom-in text-left outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
            >
              <Image
                src={message.imageUrl}
                alt="Generated image"
                width={320}
                height={426}
                className="h-auto w-full max-w-[320px] rounded-2xl object-cover transition-opacity hover:opacity-95"
                quality={90}
              />
            </button>
            {message.text && (
              <div className="mt-1 text-[14px] leading-relaxed text-white/90">
                <FormattedMessage message={message} username={username} />
              </div>
            )}
          </div>
        ) : message?.text === "" ? (
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
        <Button variant="ghost" size="icon" className="h-10 w-10 text-white/50 hover:text-white">
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
  const sendImageRequest = useMutation(api.messages.sendImageRequest);
  const generateChatImage = useAction(api.runpodImageGen.generateChatImage);
  const posthog = usePostHog();
  const [isScrolled, setScrolled] = useState(false);
  const [input, setInput] = useState("");
  const { openDialog } = useCrystalDialog();

  // ── Image generation mode state ──
  const [imageGenMode, setImageGenMode] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showPhotoTip, setShowPhotoTip] = useState(false);
  const [isNSFW, setIsNSFW] = useState(false);
  const [highlightNSFW, setHighlightNSFW] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Full-screen image lightbox ──
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  const activateImageGenMode = (preserveInput = false) => {
    setImageGenMode(true);
    if (!preserveInput) setInput("Show me ");
    setShowSuggestions(true);
    setShowPhotoTip(false);
    setHighlightNSFW(false);
    setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.value.length;
        inputRef.current.selectionEnd = inputRef.current.value.length;
      }
    }, 50);
  };

  const deactivateImageGenMode = () => {
    setImageGenMode(false);
    setInput("");
    setShowSuggestions(false);
    setShowPhotoTip(false);
  };

  const handlePoseSuggestionClick = (promptText: string) => {
    setInput(`Show me ${promptText}`);
    inputRef.current?.focus();
  };

  const handleRandomPose = () => {
    const random = POSE_SUGGESTIONS[Math.floor(Math.random() * POSE_SUGGESTIONS.length)];
    if (random) {
      setInput(`Show me ${random.promptText}`);
    }
    inputRef.current?.focus();
  };

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

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!input.trim()) return;

    if (imageGenMode) {
      const messageText = input;
      setInput("");
      setImageGenMode(false);
      setShowSuggestions(false);

      setIsGeneratingImage(true);
      try {
        await sendImageRequest({
          message: messageText,
          chatId,
          characterId,
        });
        await generateChatImage({
          characterId,
          chatId,
          userMessage: messageText,
          isNSFW,
        });
      } catch (error: any) {
        console.error("[ChatImageGen] Error:", error);
        toast.error(error?.message || "Failed to generate image.");
      } finally {
        setIsGeneratingImage(false);
      }
    } else {
      sendAndReset(input);
    }
    setScrolled(false);
  };

  const listRef = useRef<HTMLDivElement>(null);
  const hasInitiallyScrolled = useRef(false);

  const isNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  };

  useEffect(() => {
    if (isScrolled && !isNearBottom()) return;
    setScrolled(false);
    const isInitial = !hasInitiallyScrolled.current && messages.length > 0;
    if (isInitial) hasInitiallyScrolled.current = true;

    const scrollToBottom = () => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: isInitial ? "instant" : "smooth",
      });
    };

    if (isInitial) {
      requestAnimationFrame(() => {
        scrollToBottom();
        setTimeout(scrollToBottom, 100);
        setTimeout(scrollToBottom, 300);
      });
    } else {
      setTimeout(scrollToBottom, 0);
    }
  }, [messages]);

  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (inView && isScrolled) loadMore(5);
  }, [inView, loadMore]);

  useEffect(() => {
    if (zoomedImageUrl) {
      document.body.style.overflow = "hidden";
      const onEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setZoomedImageUrl(null);
      };
      window.addEventListener("keydown", onEscape);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", onEscape);
      };
    }
  }, [zoomedImageUrl]);

  return (
    <div className="relative flex h-full flex-col">
      {/* ── Full-screen image lightbox ── */}
      <AnimatePresence>
        {zoomedImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setZoomedImageUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="relative flex max-h-[90vh] max-w-[90vw] cursor-default items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-[85vh] w-[85vw] max-w-4xl">
                <Image
                  src={zoomedImageUrl}
                  alt="Full screen"
                  fill
                  className="rounded-xl object-contain shadow-2xl"
                  quality={95}
                  sizes="85vw"
                />
              </div>
              <button
                type="button"
                onClick={() => setZoomedImageUrl(null)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-6 py-4">
        <Link href={`/character/${characterId}`} className="flex items-center gap-4">
          <Avatar className="h-[52px] w-[52px]">
            <AvatarImage src={cardImageUrl || ""} alt={name} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-lg text-white">
              {name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <span className="text-[22px] font-bold leading-tight text-white">{name}</span>
            <div className="flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
              <span className="text-xs font-medium text-gray-400">
                {t("Intimacy Lvl 3")}
              </span>
              <Progress
                value={80}
                className="h-1.5 w-24"
                indicatorClassName="bg-gradient-to-r from-pink-500 to-purple-500"
              />
            </div>
          </div>
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
        className="flex-1 overflow-y-auto px-6 py-5"
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
                    onImageClick={setZoomedImageUrl}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Input Area ── */}
      <div className="relative mx-4 mb-4 shrink-0 pt-2">
        {/* ── Pose suggestions bar (visible in image gen mode) ── */}
        <AnimatePresence mode="wait">
          {imageGenMode && showSuggestions && (
            <motion.div
              key="suggestions-expanded"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
                {/* Dice / Random button */}
                <motion.button
                  type="button"
                  onClick={handleRandomPose}
                  className="flex shrink-0 flex-col items-center gap-1.5"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  <div className="flex h-[80px] w-[72px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] transition-colors hover:bg-white/[0.12]">
                    <Dices className="h-7 w-7 text-white/60" />
                  </div>
                  <span className="text-[11px] text-white/40">Random</span>
                </motion.button>

                {/* Pose thumbnails */}
                {POSE_SUGGESTIONS.map((pose, i) => (
                  <motion.button
                    key={pose.label}
                    type="button"
                    onClick={() => handlePoseSuggestionClick(pose.promptText)}
                    className="flex shrink-0 flex-col items-center gap-1.5"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 + i * 0.03 }}
                  >
                    <div className="flex h-[80px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] transition-colors hover:bg-white/[0.12]">
                      <span className="text-2xl text-white/30">{pose.label[0]}</span>
                    </div>
                    <span className="text-[11px] text-white/40">{pose.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Bottom row: NSFW toggle (left) + Hide suggestions (right) */}
              <motion.div
                className="mt-2 flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <motion.button
                  type="button"
                  onClick={() => { setIsNSFW(!isNSFW); setHighlightNSFW(false); }}
                  animate={highlightNSFW ? {
                    scale: [1, 1.04, 1],
                    boxShadow: [
                      "0 0 0px rgba(251,146,60,0), 0 0 0px rgba(239,68,68,0)",
                      "0 0 12px rgba(251,146,60,0.4), 0 0 24px rgba(239,68,68,0.15)",
                      "0 0 0px rgba(251,146,60,0), 0 0 0px rgba(239,68,68,0)",
                    ],
                  } : {}}
                  transition={highlightNSFW ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : {}}
                  className={`group flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold tracking-wide transition-all duration-300 ${
                    highlightNSFW
                      ? "bg-gradient-to-r from-red-500/25 to-orange-500/25 text-orange-200 ring-1 ring-orange-400/50"
                      : isNSFW
                        ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 ring-1 ring-red-400/40"
                        : "bg-gradient-to-r from-red-500/10 to-orange-500/10 text-orange-300/70 ring-1 ring-red-500/20 hover:from-red-500/20 hover:to-orange-500/20 hover:text-orange-300/90 hover:ring-red-500/30"
                  }`}
                >
                  <motion.span
                    animate={highlightNSFW ? {
                      y: [0, -1, 0],
                      scale: [1, 1.15, 1],
                      opacity: [0.85, 1, 0.85],
                    } : {
                      y: [0, -1.5, 0.5, -2, 0.5, -1, 0, -1.5, 0.5, -2.5, 0],
                      scaleY: [1, 1.25, 1.05, 1.35, 1.1, 1.2, 1, 1.3, 1.05, 1.4, 1],
                      scaleX: [1, 0.9, 1.05, 0.85, 1, 0.92, 1, 0.88, 1.02, 0.85, 1],
                      opacity: [1, 0.85, 1, 0.75, 1, 0.9, 1, 0.8, 1, 0.7, 1],
                    }}
                    transition={highlightNSFW
                      ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 1.2, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }
                    }
                    style={{ originY: 1, filter: highlightNSFW ? "drop-shadow(0 0 5px rgba(251,146,60,0.5))" : isNSFW ? "drop-shadow(0 0 4px rgba(251,191,36,0.6))" : "drop-shadow(0 0 3px rgba(251,146,60,0.3))" }}
                    className="flex"
                  >
                    <Flame className={`h-3.5 w-3.5 ${highlightNSFW ? "text-orange-400" : isNSFW ? "text-yellow-300" : "text-orange-400/60 group-hover:text-orange-400/80"}`} />
                  </motion.span>
                  NSFW
                  <span className={`flex h-4 w-7 items-center rounded-full p-0.5 transition-colors duration-200 ${isNSFW ? "justify-end bg-white/25" : "justify-start bg-red-500/15"}`}>
                    <motion.span
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={`block h-3 w-3 rounded-full ${isNSFW ? "bg-white" : "bg-orange-400/40"}`}
                    />
                  </span>
                </motion.button>

                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-center gap-1 text-[11px] text-white/30 transition-colors hover:text-white/50"
                >
                  <span>▸</span> Hide suggestions
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* Show suggestions toggle + NSFW (collapsed) */}
          {imageGenMode && !showSuggestions && (
            <motion.div
              key="suggestions-collapsed"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="mb-2 flex items-center justify-between overflow-hidden"
            >
              <motion.button
                type="button"
                onClick={() => { setIsNSFW(!isNSFW); setHighlightNSFW(false); }}
                animate={highlightNSFW ? {
                  scale: [1, 1.04, 1],
                  boxShadow: [
                    "0 0 0px rgba(251,146,60,0), 0 0 0px rgba(239,68,68,0)",
                    "0 0 12px rgba(251,146,60,0.4), 0 0 24px rgba(239,68,68,0.15)",
                    "0 0 0px rgba(251,146,60,0), 0 0 0px rgba(239,68,68,0)",
                  ],
                } : {}}
                transition={highlightNSFW ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : {}}
                className={`group flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold tracking-wide transition-all duration-300 ${
                  highlightNSFW
                    ? "bg-gradient-to-r from-red-500/25 to-orange-500/25 text-orange-200 ring-1 ring-orange-400/50"
                    : isNSFW
                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 ring-1 ring-red-400/40"
                      : "bg-gradient-to-r from-red-500/10 to-orange-500/10 text-orange-300/70 ring-1 ring-red-500/20 hover:from-red-500/20 hover:to-orange-500/20 hover:text-orange-300/90 hover:ring-red-500/30"
                }`}
              >
                <motion.span
                  animate={highlightNSFW ? {
                    y: [0, -1, 0],
                    scale: [1, 1.15, 1],
                    opacity: [0.85, 1, 0.85],
                  } : {
                    y: [0, -1.5, 0.5, -2, 0.5, -1, 0, -1.5, 0.5, -2.5, 0],
                    scaleY: [1, 1.25, 1.05, 1.35, 1.1, 1.2, 1, 1.3, 1.05, 1.4, 1],
                    scaleX: [1, 0.9, 1.05, 0.85, 1, 0.92, 1, 0.88, 1.02, 0.85, 1],
                    opacity: [1, 0.85, 1, 0.75, 1, 0.9, 1, 0.8, 1, 0.7, 1],
                  }}
                  transition={highlightNSFW
                    ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 1.2, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }
                  }
                  style={{ originY: 1, filter: highlightNSFW ? "drop-shadow(0 0 5px rgba(251,146,60,0.5))" : isNSFW ? "drop-shadow(0 0 4px rgba(251,191,36,0.6))" : "drop-shadow(0 0 3px rgba(251,146,60,0.3))" }}
                  className="flex"
                >
                  <Flame className={`h-3.5 w-3.5 ${highlightNSFW ? "text-orange-400" : isNSFW ? "text-yellow-300" : "text-orange-400/60 group-hover:text-orange-400/80"}`} />
                </motion.span>
                NSFW
                <span className={`flex h-4 w-7 items-center rounded-full p-0.5 transition-colors duration-200 ${isNSFW ? "justify-end bg-white/25" : "justify-start bg-red-500/15"}`}>
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`block h-3 w-3 rounded-full ${isNSFW ? "bg-white" : "bg-orange-400/40"}`}
                  />
                </span>
              </motion.button>

              <button
                type="button"
                onClick={() => setShowSuggestions(true)}
                className="flex items-center gap-1 text-[11px] text-white/30 transition-colors hover:text-white/50"
              >
                <span>▸</span> Show suggestions
              </button>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Photo request tip banner ── */}
        <AnimatePresence>
          {showPhotoTip && !imageGenMode && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto", marginBottom: 10 }}
              exit={{ opacity: 0, y: 8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <button
                type="button"
                onClick={() => activateImageGenMode(true)}
                className="flex w-full items-center gap-3 rounded-xl border border-pink-500/20 bg-gradient-to-r from-pink-500/10 to-purple-500/10 px-4 py-2.5 text-left transition-all hover:border-pink-500/40 hover:from-pink-500/15 hover:to-purple-500/15"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400/20 to-amber-500/20">
                  <Lightbulb className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white/80">
                    Want to generate an image? Use the action button below
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-white/60">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <Sparkles className="h-2.5 w-2.5 text-yellow-400" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── NSFW detected tip banner ── */}
        <AnimatePresence>
          {highlightNSFW && !imageGenMode && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto", marginBottom: 10 }}
              exit={{ opacity: 0, y: 8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="flex w-full items-center gap-3 rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/[0.07] to-orange-500/[0.07] px-4 py-2.5">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20"
                >
                  <Flame className="h-4 w-4 text-orange-400" />
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-orange-200/80">
                    Enable <span className="font-bold text-orange-300">NSFW</span> mode in image generation for spicier content
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    activateImageGenMode(true);
                    setIsNSFW(true);
                    setHighlightNSFW(false);
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-500/20 to-orange-500/20 px-3 py-1.5 text-[11px] font-semibold text-orange-300 ring-1 ring-red-500/25 transition-all hover:from-red-500/30 hover:to-orange-500/30 hover:text-orange-200"
                >
                  <Flame className="h-3 w-3" />
                  Enable
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-[0_0_15px_rgba(236,72,153,0.1)] backdrop-blur-xl transition-all duration-300 focus-within:shadow-[0_0_25px_rgba(236,72,153,0.25)]">
          {/* Text input row */}
          <form onSubmit={handleSend}>
            <input
              ref={inputRef}
              className="w-full border-0 bg-transparent px-5 pb-2 pt-4 text-[15px] text-white placeholder-white/30 outline-none ring-0 focus:outline-none focus:ring-0"
              style={{ boxShadow: "none" }}
              autoFocus
              placeholder={t("Write a message...")}
              value={input}
              onChange={(e) => {
                const value = e.target.value;
                setInput(value);
                if (value.startsWith("Show me ") && !imageGenMode) {
                  setImageGenMode(true);
                }
                if (!imageGenMode && !value.startsWith("Show me ")) {
                  const isPhotoRequest = PHOTO_REQUEST_PATTERN.test(value);
                  setShowPhotoTip(isPhotoRequest && value.length > 5);
                } else {
                  setShowPhotoTip(false);
                }

                const hasNsfwWords = NSFW_DETECT_PATTERN.test(value);
                setHighlightNSFW(hasNsfwWords && value.length > 3 && !isNSFW);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Bottom row: icon buttons (left) + send button (right) */}
            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <div className="flex items-center gap-2">
                {/* Generate Image button — smooth expand/collapse with image+stars + X */}
                <motion.button
                  type="button"
                  onClick={() => {
                    if (imageGenMode) {
                      deactivateImageGenMode();
                    } else {
                      activateImageGenMode();
                    }
                  }}
                  animate={{
                    width: imageGenMode ? 120 : 44,
                    borderRadius: imageGenMode ? 12 : 22,
                    scale: (showPhotoTip || highlightNSFW) && !imageGenMode ? [1, 1.08, 1] : 1,
                  }}
                  transition={
                    (showPhotoTip || highlightNSFW) && !imageGenMode
                      ? { scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }, type: "spring", stiffness: 400, damping: 30 }
                      : { type: "spring", stiffness: 400, damping: 30 }
                  }
                  className={`relative flex h-11 items-center justify-center gap-2 overflow-hidden ${
                    imageGenMode
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/25 hover:from-pink-600 hover:to-purple-600"
                      : highlightNSFW
                        ? "bg-gradient-to-r from-red-500/25 to-orange-500/25 text-orange-200/90 shadow-md shadow-red-500/15 ring-1 ring-red-500/30 hover:from-red-500/35 hover:to-orange-500/35"
                        : showPhotoTip
                          ? "bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-white/80 shadow-md shadow-pink-500/15 ring-1 ring-pink-500/30 hover:from-pink-500/40 hover:to-purple-500/40"
                          : "bg-white/[0.08] text-white/50 hover:bg-white/[0.14] hover:text-white/80"
                  }`}
                >
                  <span className="relative flex shrink-0">
                    <ImageIcon className="h-5 w-5" />
                    <Sparkles
                      className={`absolute -right-1 -top-1 h-2.5 w-2.5 ${
                        imageGenMode ? "text-yellow-300" : "text-yellow-400"
                      }`}
                    />
                  </span>
                  <AnimatePresence mode="wait">
                    {imageGenMode && (
                      <motion.span
                        key="x-icon"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="flex shrink-0"
                      >
                        <X className="h-5 w-5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Generate Video */}
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white/50 transition-colors hover:bg-white/[0.14] hover:text-white/80"
                >
                  <span className="relative">
                    <Video className="h-5 w-5" />
                    <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 text-yellow-400" />
                  </span>
                </button>
              </div>

              {/* Send / Generate button */}
              <button
                type="submit"
                disabled={!input.trim() || isGeneratingImage}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/25 transition-all disabled:opacity-25 hover:from-pink-600 hover:to-purple-600"
              >
                {isGeneratingImage ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Send className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
