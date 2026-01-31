"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { Id } from "../convex/_generated/dataModel";
import { Switch } from "@repo/ui/src/components/switch";
import {
  ArrowLeft,
  Camera,
  CircleUserRound,
  ClipboardIcon,
  Delete,
  Edit,
  Eraser,
  Headphones,
  MoreHorizontal,
  Pause,
  Plus,
  Repeat,
  Send,
  Share,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Button, InfoTooltip, Tooltip } from "@repo/ui/src/components";
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
import { useRouter, useSearchParams } from "next/navigation";
import ModelBadge from "../components/characters/model-badge";
import { Crystal } from "@repo/ui/src/components/icons";
import Spinner from "@repo/ui/src/components/spinner";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@repo/ui/src/components/badge";
import { ConvexError } from "convex/values";
import { useCrystalDialog } from "./lib/hooks/use-crystal-dialog";
import { usePostHog } from "posthog-js/react";
import { LanguageSelect, useLanguage } from "./lang-select";
import { Label } from "@repo/ui/src/components/label";
import {
  useStablePaginatedQuery,
  useStableQuery,
} from "./lib/hooks/use-stable-query";
import { useVoiceOver } from "./lib/hooks/use-voice-over";
import {
  useMachineTranslation,
  useTranslationStore,
} from "./lib/hooks/use-machine-translation";
import usePersona from "./lib/hooks/use-persona";
import React from "react";
import { FormattedMessage } from "../components/formatted-message";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/src/components/drawer";
import { Textarea } from "@repo/ui/src/components/textarea";
import { useResponsivePopover } from "@repo/ui/src/hooks/use-responsive-popover";
import { CustomModelSelect } from "../components/characters/custom-model-select";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

export const Message = ({
  index,
  name,
  message,
  cardImageUrl,
  username = "You",
  chatId,
}: {
  index?: number;
  name: string;
  message: any;
  cardImageUrl: string;
  username?: string;
  chatId?: Id<"chats">;
}) => {
  const { t } = useTranslation();
  const regenerate = useMutation(api.messages.regenerate);
  const react = useMutation(api.messages.react);
  const speech = useMutation(api.speeches.generate);
  const imagine = useMutation(api.images.imagine);
  const edit = useMutation(api.messages.edit);
  const posthog = usePostHog();
  const { playVoice, stopVoice, isVoicePlaying } = useVoiceOver();

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isImagining, setIsImagining] = useState(false);
  const [thinkingDots, setThinkingDots] = useState("");
  const [thinkingMessage, setThinkingMessage] = useState(t("Thinking"));
  const { openDialog } = useCrystalDialog();

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setThinkingDots((prevDots) => {
        if (prevDots.length < 3) {
          return prevDots + ".";
        } else {
          return "";
        }
      });
      if (Date.now() - startTime >= 3000) {
        setThinkingMessage(t("Warming up AI"));
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    message?.imageUrl && setIsImagining(false);
  }, [message?.imageUrl]);

  useEffect(() => {
    if (index === 0) playVoice();
  }, [index]);

  return (
    <div
      className={`flex flex-col gap-2 ${
        message?.characterId ? "self-start" : "self-end"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-base font-medium lg:text-sm ${
          message?.characterId ? "justify-start" : "justify-end"
        }`}
      >
        <Avatar className="h-6 w-6">
          <AvatarImage
            alt={`Character card of ${name}`}
            src={cardImageUrl ? cardImageUrl : "undefined"}
            className="object-cover"
          />
          <AvatarFallback>
            {message?.characterId ? name?.[0] : username?.[0]}
          </AvatarFallback>
        </Avatar>
        {message?.characterId ? <>{name}</> : <>{username}</>}
      </div>
      {message?.text === "" ? (
        <div className="whitespace-pre-wrap rounded-xl bg-gradient-to-b from-background to-muted px-3 py-2 shadow-lg md:max-w-[36rem] lg:max-w-[48rem]">
          {thinkingMessage}
          {thinkingDots}
        </div>
      ) : (
        <>
          <FormattedMessage message={message} username={username} />
          {isImagining ? (
            <div className="relative h-[30rem] w-[20rem] rounded-xl bg-muted">
              <div className="absolute inset-0 m-auto flex flex-col items-center justify-center gap-2 text-base lg:text-sm">
                <Spinner />
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  {name} is taking selfie
                </div>
                <span className="w-[80%] text-center text-xs text-muted-foreground">
                  {t(
                    "This can take a bit of time if your request is in a queue or the model is booting up. When model is ready, image is generated within 30 seconds. When image generation is failed due to an unexpected error, your crystal will be automatically refunded.",
                  )}
                </span>
              </div>
            </div>
          ) : (
            message?.imageUrl && (
              <Image
                src={message.imageUrl}
                alt={message?.text}
                width={525}
                height={300}
                className="h-[30rem] w-[20rem] rounded-xl"
              />
            )
          )}
          {message?.characterId && chatId && !isRegenerating && (
            <div className="flex w-fit items-center justify-start rounded-full bg-background/25 p-1 backdrop-blur">
              <Tooltip
                content={t("Copy message to clipboard")}
                desktopOnly={true}
              >
                <Button
                  variant="ghost"
                  className="h-8 w-8 rounded-full p-1 hover:bg-foreground/10 disabled:opacity-90 lg:h-6 lg:w-6"
                  onClick={() => {
                    navigator.clipboard.writeText(message?.text);
                    toast.success("Message copied to clipboard");
                  }}
                >
                  <ClipboardIcon className="h-5 w-5 lg:h-4 lg:w-4" />
                </Button>
              </Tooltip>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full p-1 hover:bg-foreground/10 disabled:opacity-90 lg:h-6 lg:w-6"
                disabled={message?.reaction === "like"}
                onClick={async () => {
                  await react({
                    messageId: message?._id as Id<"messages">,
                    type: "like",
                  });
                }}
              >
                {message?.reaction === "like" ? (
                  <ThumbsUp className="h-6 w-6 text-green-500 lg:h-4 lg:w-4" />
                ) : (
                  <ThumbsUp className="h-5 w-5 lg:h-4 lg:w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full p-1 hover:bg-foreground/10 disabled:opacity-90 lg:h-6 lg:w-6"
                disabled={message?.reaction === "dislike"}
                onClick={async () => {
                  await react({
                    messageId: message?._id as Id<"messages">,
                    type: "dislike",
                  });
                  setIsRegenerating(true);
                  await regenerate({
                    messageId: message?._id as Id<"messages">,
                    chatId,
                    characterId: message?.characterId,
                  });
                  setIsRegenerating(false);
                }}
              >
                {isRegenerating ? (
                  <Spinner className="h-5 w-5 lg:h-4 lg:w-4" />
                ) : message?.reaction === "dislike" ? (
                  <ThumbsDown className="h-6 w-6 text-rose-500 lg:h-4 lg:w-4" />
                ) : (
                  <ThumbsDown className="h-5 w-5 lg:h-4 lg:w-4" />
                )}
              </Button>
              {message?.characterId && chatId && (
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full p-1 hover:bg-foreground/10 disabled:opacity-90 lg:h-6 lg:w-6"
                    >
                      <Edit className="h-5 w-5 lg:h-4 lg:w-4" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <div className="mx-auto w-full">
                      <DrawerHeader>
                        <DrawerTitle>{t("Edit message")}</DrawerTitle>
                        <DrawerDescription>
                          {t("Change the story as you wish.")}
                        </DrawerDescription>
                      </DrawerHeader>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(
                            e.target as HTMLFormElement,
                          );
                          const editedText = formData.get("editedText");
                          if (
                            typeof editedText === "string" &&
                            editedText.trim() !== ""
                          ) {
                            try {
                              await edit({
                                messageId: message?._id as Id<"messages">,
                                editedText,
                              });
                              toast.success(t("Message updated successfully"));
                            } catch (error) {
                              toast.error(t("Failed to update message"));
                            }
                          }
                        }}
                      >
                        <div className="flex w-full justify-center px-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              const textarea = document.querySelector(
                                'textarea[name="editedText"]',
                              ) as HTMLTextAreaElement;
                              if (textarea) {
                                textarea.value = "";
                                textarea.focus();
                              }
                            }}
                            className="w-fit gap-0.5"
                          >
                            <Eraser className="h-4 w-4" />
                            {t("Clear")}
                          </Button>
                        </div>
                        <div className="p-4">
                          <Textarea
                            name="editedText"
                            defaultValue={message?.text.trim()}
                            className="resize-none"
                            rows={5}
                          />
                        </div>
                        <DrawerFooter className="flex w-full items-center gap-2">
                          <DrawerClose className="w-full">
                            <Button type="submit" className="w-full">
                              {t("Save")}
                            </Button>
                          </DrawerClose>
                          <DrawerClose className="w-full">
                            <Button variant="outline" className="w-full">
                              {t("Cancel")}
                            </Button>
                          </DrawerClose>
                        </DrawerFooter>
                      </form>
                    </div>
                  </DrawerContent>
                </Drawer>
              )}
              <Tooltip
                content={
                  <span className="flex gap-1 p-2">
                    {t("Listen")} (<Crystal className="h-4 w-4" /> x 15 )
                  </span>
                }
                desktopOnly={true}
              >
                <Button
                  variant="ghost"
                  className="h-8 w-8 rounded-full p-1 hover:bg-foreground/10 disabled:opacity-90 lg:h-6 lg:w-6"
                  onClick={async () => {
                    if (isSpeaking) {
                      setIsSpeaking(false);
                    } else {
                      try {
                        await speech({
                          messageId: message?._id as Id<"messages">,
                          characterId: message?.characterId,
                          text: message?.translation
                            ? message?.translation
                            : message?.text,
                        });
                        setIsSpeaking(true);
                      } catch (error) {
                        setIsSpeaking(false);
                        if (error instanceof ConvexError) {
                          openDialog();
                        } else {
                          toast.error("An unknown error occurred");
                        }
                      }
                    }
                  }}
                >
                  {isSpeaking ? (
                    <Pause className="h-5 w-5 lg:h-4 lg:w-4" />
                  ) : (
                    <span className="flex w-full items-center justify-center gap-1">
                      <Headphones className="h-5 w-5 lg:h-4 lg:w-4" />
                    </span>
                  )}
                </Button>
              </Tooltip>
              {message?.speechUrl && (isSpeaking || isVoicePlaying) && (
                <audio
                  autoPlay
                  controls
                  hidden
                  onEnded={() => {
                    setIsSpeaking(false);
                    stopVoice();
                  }}
                >
                  <source src={message?.speechUrl} type="audio/mpeg" />
                </audio>
              )}
              {message?.characterId && chatId && !isRegenerating && (
                <Tooltip
                  content={
                    <span className="flex gap-1 p-2">
                      {t(`Selfie`)} ( <Crystal className="h-4 w-4" /> x 4 )
                    </span>
                  }
                  desktopOnly={true}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full p-1 hover:bg-foreground/10 disabled:opacity-90 lg:h-6 lg:w-6"
                    onClick={async () => {
                      setIsImagining(true);
                      try {
                        await imagine({
                          messageId: message?._id as Id<"messages">,
                        });
                        posthog.capture("imagine");
                      } catch (error) {
                        setIsImagining(false);
                        if (error instanceof ConvexError) {
                          openDialog();
                        } else {
                          toast.error("An unknown error occurred");
                        }
                      }
                    }}
                    disabled={message?.imageUrl || isImagining}
                  >
                    {isImagining ? (
                      <Spinner className="h-5 w-5 lg:h-4 lg:w-4" />
                    ) : (
                      <Camera className="h-5 w-5 lg:h-4 lg:w-4" />
                    )}
                  </Button>
                </Tooltip>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface ChatOptionsPopoverProps {
  characterId: Id<"characters">;
  chatId: Id<"chats">;
  name: string;
  showEdit: boolean;
}

const ChatOptionsPopover = ({
  characterId,
  chatId,
  name,
  showEdit,
}: ChatOptionsPopoverProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const goBack = router.back;
  const remove = useMutation(api.chats.remove);
  const { Popover, PopoverContent, PopoverTrigger } = useResponsivePopover();
  return (
    <Popover>
      <AlertDialog>
        <PopoverContent className="p-4 pb-8 lg:w-52 lg:p-1 lg:pb-1">
          {showEdit && (
            <Link
              href={`/my-characters/create${
                characterId ? `?id=${characterId}` : ""
              }`}
            >
              <Button
                variant="ghost"
                className="w-full justify-start gap-1 text-muted-foreground"
              >
                <Edit className="h-4 w-4 p-0.5" />
                {t("Edit character")}
              </Button>
            </Link>
          )}
          <Link
            href={`/my-characters/create${
              characterId ? `?remixId=${characterId}` : ""
            }`}
          >
            <Button
              variant="ghost"
              className="w-full justify-start gap-1 text-muted-foreground"
            >
              <Repeat className="h-4 w-4 p-0.5" />
              {t("Remix character")}
            </Button>
          </Link>
          <Link href={`/my-personas`}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-1 text-muted-foreground"
            >
              <CircleUserRound className="h-4 w-4 p-0.5" />
              <span className="w-40 truncate text-left">
                {t("Edit my persona")}
              </span>
            </Button>
          </Link>

          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-1 text-muted-foreground"
            >
              <Delete className="h-4 w-4 p-0.5" />
              <span className="w-40 truncate text-left">
                {" "}
                {t("Delete chat")}
              </span>
            </Button>
          </AlertDialogTrigger>
          <Button
            variant="ghost"
            className="w-full justify-start gap-1 text-muted-foreground"
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
            <Share className="h-4 w-4 p-0.5" />
            <span className="w-40 truncate text-left">
              {t("Share")} {name}
            </span>
          </Button>
        </PopoverContent>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you absolutely sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {`This action cannot be undone. This will permanently delete chat.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const promise = remove({
                  id: chatId as Id<"chats">,
                });
                toast.promise(promise, {
                  loading: "Deleting chat...",
                  success: () => {
                    goBack();
                    return `Chat has been deleted.`;
                  },
                  error: (error) => {
                    console.log("error:::", error);
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
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
    </Popover>
  );
};

interface FollowUpsProps {
  followUps: any;
  sendAndReset: (message: string) => void;
  setScrolled: (scrolled: boolean) => void;
  isLastMessageLoaded: boolean;
  query: string;
}

const FollowUps = ({
  followUps,
  sendAndReset,
  setScrolled,
  isLastMessageLoaded,
  query,
}: FollowUpsProps) => {
  const choose = useMutation(api.followUps.choose);
  return (
    <>
      {followUps && !followUps?.isStale && isLastMessageLoaded && (
        <div className="z-10 flex w-full flex-col justify-center gap-1 px-6">
          <AnimatePresence>
            {["followUp1", "followUp2", "followUp3", "followUp4"].map(
              (followUpKey) =>
                followUps[followUpKey] && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <Button
                      key={followUpKey}
                      onClick={() => {
                        sendAndReset(followUps[followUpKey] as string);
                        choose({
                          followUpId: followUps._id,
                          chosen: followUps[followUpKey] as string,
                          query,
                        });
                        setScrolled(false);
                      }}
                      variant="outline"
                      className="flex h-fit w-fit gap-2 whitespace-normal border-none bg-background p-2 text-left text-sm font-normal tracking-tighter text-foreground/75 shadow dark:shadow-gray-800"
                    >
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span className="w-fit lg:max-w-screen-sm">
                        {followUps[followUpKey]}
                      </span>
                    </Button>
                  </motion.div>
                ),
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
};

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
  const router = useRouter();
  const params = useSearchParams();
  const newChat = useMutation(api.chats.create);
  const { translations } = useTranslationStore();
  const { mt } = useMachineTranslation();
  const urlChatId = params.get("chatId") as Id<"chats">;
  chatId = urlChatId ? urlChatId : chatId;
  const { results, loadMore } = useStablePaginatedQuery(
    api.messages.list,
    chatId && isAuthenticated ? { chatId } : "skip",
    { initialNumItems: 5 },
  );
  const { currentLanguage, autoTranslate, toggleAutoTranslate } = useLanguage();
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
    [remoteMessages, ""],
  );
  const persona = usePersona();
  const username = persona?.name;
  const choose = useMutation(api.followUps.choose);
  const sendMessage = useMutation(api.messages.send);
  const posthog = usePostHog();
  const followUps = useStableQuery(
    api.followUps.get,
    chatId && isAuthenticated ? { chatId } : "skip",
  );
  const [isScrolled, setScrolled] = useState(false);
  const [input, setInput] = useState("");
  const { openDialog } = useCrystalDialog();

  const sendAndReset = async (input: string) => {
    setInput("");
    try {
      await sendMessage({ message: input, chatId, characterId });
      followUps?.followUp1 &&
        messages[messages?.length - 1]?.text &&
        (await choose({
          chosen: input,
          followUpId: followUps?._id,
          query: `${name}: ${messages[messages?.length - 1]?.text as string}`,
        }));
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
    sendAndReset(input);
    setScrolled(false);
  };

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setScrolled(false);
  }, [followUps]);

  useEffect(() => {
    if (isScrolled) {
      return;
    }
    // Check if the device is mobile
    const isMobile = window.innerWidth <= 768;
    // Using `setTimeout` to make sure scrollTo works on button click in Chrome
    setTimeout(() => {
      if (isMobile) {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      } else {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: "smooth",
        });
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 0);
  }, [messages, isScrolled]);
  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (inView && isScrolled) {
      loadMore(5);
    }
  }, [inView, loadMore]);

  const lastMessage = messages?.[messages.length - 1]?.text || "";
  const isLastMessageLoaded = lastMessage?.length > 0 ?? false;

  return (
    <div className="h-full w-full lg:fixed lg:left-0 lg:right-0 lg:top-16 lg:h-[calc(100%-0.875rem)] lg:overflow-hidden lg:rounded-xl lg:border lg:bg-background">
      {chatId && (
        <div className="fixed top-0 z-50 flex h-12 w-full items-center justify-between border-b bg-background p-2 px-4 lg:sticky lg:rounded-t-lg lg:px-6">
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground lg:text-xs">
            <Link href="/chats" className="lg:hidden">
              <Button size="icon" variant="ghost">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <LanguageSelect isCompact />
            </div>
            <Badge variant="model">
              <Headphones className="h-4 w-4 p-0.5" /> /
              <Crystal className="h-4 w-4 p-0.5" /> x 15
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <ChatOptionsPopover
              characterId={characterId}
              chatId={chatId}
              name={name}
              showEdit={userId == creatorId}
            />
            <Button
              onClick={() => {
                const promise = newChat({
                  characterId,
                  isNew: true,
                });
                toast.promise(promise, {
                  loading: "Creating new chat...",
                  success: (chatId) => {
                    router.push(`/character/${characterId}?chatId=${chatId}`);
                    return `New chat has been created.`;
                  },
                  error: (error) => {
                    console.log("error:::", error);
                    return error
                      ? (error.data as { message: string })?.message
                      : "Unexpected error occurred";
                  },
                });
              }}
              className="flex aspect-square h-8 gap-0.5 lg:aspect-auto"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline"> {t("New chat")}</span>
            </Button>
          </div>
        </div>
      )}
      <div
        className={`flex h-full min-h-[60vh] flex-col overflow-y-auto lg:h-[calc(100%-12rem)] `}
        ref={listRef}
        onWheel={() => {
          setScrolled(true);
        }}
      >
        {currentLanguage !== "en" && (
          <div className="flex w-full items-center justify-center pt-8">
            <div className="mx-4 flex w-full flex-col items-center gap-1 rounded-xl bg-background/75 p-4 shadow-lg ring-1 ring-foreground/10 backdrop-blur-md">
              <div className="flex items-center gap-1">
                <Label htmlFor="automatic-translation">
                  {t("Automatic translation")}
                </Label>
                <InfoTooltip
                  content={t(
                    "Crystal is used when you send message and character answers.",
                  )}
                />
              </div>
              <span className="text-center text-xs">
                {t(
                  "Most AI models produce the highest quality results for English input. Enabling automatic translation will help you get the higher quality results.",
                )}
              </span>
              <Switch
                id="automatic-translation"
                value={autoTranslate}
                onCheckedChange={() => toggleAutoTranslate()}
              />
            </div>
          </div>
        )}
        {description && (
          <div className="m-4 my-6 flex flex-col rounded-xl bg-background/50 p-4 shadow-lg ring-1 ring-foreground/10 backdrop-blur-md">
            <strong>{mt(name, translations)}</strong>{" "}
            <div>{mt(description, translations)}</div>
            <div className="text-muted-foreground">
              by @{creatorName ? creatorName : "anonymous"}
            </div>
          </div>
        )}
        <div
          className="mx-2 flex h-fit flex-col gap-8 rounded-xl p-4"
          ref={listRef}
          onWheel={() => {
            setScrolled(true);
          }}
        >
          <div ref={ref} />
          <AnimatePresence>
            {remoteMessages === undefined ? (
              <>
                <div className="h-5 rounded-md bg-black/10" />
                <div className="h-9 rounded-md bg-black/10" />
              </>
            ) : (
              messages.map((message, i) => (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Message
                    index={i}
                    key={message._id}
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
        <FollowUps
          followUps={followUps}
          sendAndReset={sendAndReset}
          setScrolled={setScrolled}
          isLastMessageLoaded={isLastMessageLoaded}
          query={`${name}: ${messages[messages.length - 1]?.text}` || ""}
        />
        <div className="mb-[11rem] lg:mb-16" />
      </div>
      <form
        className="fixed bottom-0 z-50 flex h-32 min-h-fit w-full flex-col items-center border-0 border-t-[1px] border-solid bg-background pb-6 lg:rounded-br-lg"
        onSubmit={(event) => void handleSend(event)}
      >
        <div className="flex h-full w-full items-center justify-center gap-4 px-4">
          <input
            className="h-10 w-full resize-none border-none bg-background text-[16px] scrollbar-hide focus-visible:ring-0 lg:text-base"
            autoFocus
            name="message"
            placeholder={t("Send a message")}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.metaKey) {
                event.preventDefault();
                event.currentTarget.form?.dispatchEvent(
                  new Event("submit", { cancelable: true, bubbles: true }),
                );
              }
            }}
          />
          <Button disabled={input === ""} size="icon">
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex w-full items-end justify-end px-4">
          {characterId && (
            <ErrorBoundary
              children={
                <CustomModelSelect
                  initialModel={model as string}
                  characterId={characterId}
                />
              }
              errorComponent={() => ""}
            />
          )}
        </div>
      </form>
    </div>
  );
}
