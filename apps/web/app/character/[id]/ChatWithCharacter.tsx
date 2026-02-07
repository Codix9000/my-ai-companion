"use client";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Dialog } from "../../dialog";
import Spinner from "@repo/ui/src/components/spinner";
import useStoreChatEffect from "../../lib/hooks/use-store-chat-effect";
import { FadeInOut } from "../../lib/utils";
import { SignIn, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { Story } from "./story/[storyId]/story";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AgeRestriction from "../../../components/characters/age-restriction";
import { useNsfwPreference } from "../../lib/hooks/use-nsfw-preference";
import {
  useStablePaginatedQuery,
  useStableQuery,
} from "../../lib/hooks/use-stable-query";
import AddToHomeScreen from "../../../components/pwa/add-to-homescreen";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import useCurrentUser from "../../lib/hooks/use-current-user";

export const Stories = ({
  characterId,
  name,
  cardImageUrl,
  isHorizontal = false,
}: {
  characterId: Id<"characters">;
  name: string;
  cardImageUrl: string;
  isHorizontal?: boolean;
}) => {
  const { nsfwPreference } = useNsfwPreference();
  const { results } = useStablePaginatedQuery(
    api.stories.list,
    { characterId, nsfwPreference },
    { initialNumItems: 5 },
  );
  return (
    <section className="flex flex-col gap-4">
      <div className="font-medium">Stories</div>
      <div
        className={`flex h-full flex-col gap-4 ${
          isHorizontal ? "grid md:grid-cols-2 lg:grid-cols-3" : ""
        }`}
      >
        {results?.length > 0 ? (
          results.map((story, i) => (
            <Link
              href={`/character/${characterId}/story/${story._id}`}
              className="h-96 rounded-lg border p-4 shadow-lg"
            >
              <Story
                name={name}
                cardImageUrl={cardImageUrl as string}
                storyId={story._id}
              />
            </Link>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No stories yet.</div>
        )}
      </div>
    </section>
  );
};

export default function ChatWithCharacter({
  params,
}: {
  params: { id: string; storyId?: string };
}) {
  const currentUser = useCurrentUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const data = useStableQuery(
    api.characters.get,
    currentUser?.name
      ? {
          id: params.id as Id<"characters">,
        }
      : "skip",
  );
  const creatorName = useStableQuery(
    api.users.getUsername,
    currentUser?.name
      ? {
          id: data?.creatorId as Id<"users">,
        }
      : "skip",
  );
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get("chatId");
  const { chatId, isUnlocked } = useStoreChatEffect(
    params.id as Id<"characters">,
    params.storyId ? (params.storyId as Id<"stories">) : undefined,
    urlChatId as Id<"chats">,
  );
  const content = (
    <>
      {params.storyId && !isUnlocked ? (
        <Story
          name={data?.name as string}
          storyId={params.storyId as Id<"stories">}
          chatId={chatId ? chatId : undefined}
          cardImageUrl={data?.cardImageUrl}
        />
      ) : chatId ? (
        data?.visibility === "private" &&
        currentUser?._id !== data?.creatorId ? (
          <div className="text-error text-sm">
            This character is private and you do not have permission to view it.
          </div>
        ) : (
          <Authenticated>
            <Dialog
              name={data?.name as string}
              description={data?.description as string}
              creatorName={creatorName}
              userId={currentUser?._id}
              creatorId={data?.creatorId}
              model={data?.model as string}
              chatId={chatId}
              isAuthenticated={isAuthenticated}
              characterId={data?._id as any}
              cardImageUrl={data?.cardImageUrl}
            />
          </Authenticated>
        )
      ) : isAuthenticated && !isLoading ? (
        <div className="flex h-full w-full items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-8 lg:min-h-fit">
          <AnimatePresence>
            {data?.name && data?.visibility === "public" && (
              <motion.span
                {...FadeInOut}
                className="mt-16 font-medium lg:mt-0"
              >{`Sign in and start chat with ${data?.name}`}</motion.span>
            )}
          </AnimatePresence>
          <Unauthenticated>
            <div className="py-32">
              <SignIn />
            </div>
          </Unauthenticated>
        </div>
      )}
    </>
  );
  return (
    <div className="flex w-full flex-col justify-self-start lg:pr-6">
      {data?.isNSFW && <AgeRestriction />}
      <ErrorBoundary children={content} errorComponent={({ error }) => (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-medium text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground">
            There was an error loading this chat. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 text-sm text-white hover:from-pink-600 hover:to-purple-600"
          >
            Refresh Page
          </button>
        </div>
      )} />
      <AddToHomeScreen />
    </div>
  );
}
