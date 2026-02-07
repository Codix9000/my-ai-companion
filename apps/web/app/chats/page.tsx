"use client";

import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { SignIn, useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Dialog } from "../dialog";
import Spinner from "@repo/ui/src/components/spinner";
import useStoreChatEffect from "../lib/hooks/use-store-chat-effect";
import { useStableQuery } from "../lib/hooks/use-stable-query";
import useCurrentUser from "../lib/hooks/use-current-user";
import ChatHistorySidebar from "../../components/chats/chat-history-sidebar";
import { MessageSquare, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Button } from "@repo/ui/src/components";
import AgeRestriction from "../../components/characters/age-restriction";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

function ActiveChat({ characterId }: { characterId: Id<"characters"> }) {
  const currentUser = useCurrentUser();
  const { isAuthenticated } = useConvexAuth();

  const data = useStableQuery(
    api.characters.get,
    currentUser?.name ? { id: characterId } : "skip",
  );
  const creatorName = useStableQuery(
    api.users.getUsername,
    currentUser?.name && data?.creatorId
      ? { id: data.creatorId as Id<"users"> }
      : "skip",
  );

  const { chatId } = useStoreChatEffect(characterId);

  if (!data || !chatId) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (data.visibility === "private" && currentUser?._id !== data.creatorId) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        This character is private.
      </div>
    );
  }

  return (
    <>
      {data.isNSFW && <AgeRestriction />}
      <Dialog
        name={data.name as string}
        description={data.description as string}
        creatorName={creatorName}
        userId={currentUser?._id}
        creatorId={data.creatorId}
        model={data.model as string}
        chatId={chatId}
        isAuthenticated={isAuthenticated}
        characterId={data._id as Id<"characters">}
        cardImageUrl={data.cardImageUrl}
      />
    </>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-400/20 to-purple-500/20">
        <Heart className="h-10 w-10 text-pink-500" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {t("Select a conversation")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Choose a character from the sidebar to start chatting")}
        </p>
      </div>
      <Link href="/characters">
        <Button className="mt-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
          {t("Explore Characters")}
        </Button>
      </Link>
    </div>
  );
}

export default function Page() {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId") as Id<"characters"> | null;

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-[100vh] w-full items-start justify-center py-32">
        {!user && <SignIn />}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Sidebar with all character conversations */}
      <ChatHistorySidebar currentCharacterId={characterId} />

      {/* Main chat area */}
      <div className="flex-1 overflow-hidden">
        {characterId ? (
          <ErrorBoundary
            errorComponent={({ error }) => (
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
            )}
          >
            <ActiveChat characterId={characterId} />
          </ErrorBoundary>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
