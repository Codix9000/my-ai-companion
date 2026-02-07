import { Button, Card, CardHeader, CardTitle } from "@repo/ui/src/components";
import {
  AvatarImage,
  AvatarFallback,
  Avatar,
} from "@repo/ui/src/components/avatar";
import { api } from "../../convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { Id } from "../../convex/_generated/dataModel";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  useStablePaginatedQuery,
  useStableQuery,
} from "../../app/lib/hooks/use-stable-query";
import { useConvexAuth } from "convex/react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

export const Chat = ({
  name,
  chatId,
  characterId,
}: {
  name: string;
  chatId: Id<"chats">;
  characterId: Id<"characters">;
}) => {
  const character = useStableQuery(api.characters.get, {
    id: characterId as Id<"characters">,
  });
  const message = useStableQuery(api.messages.mostRecentMessage, {
    chatId,
  });
  const recentMessageAt = message?._creationTime as number;
  return (
    <Link href={`/character/${characterId}/chat?chatId=${chatId}`}>
      <li className="group p-4 hover:bg-muted">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage
              alt={`preview of chat ${name}`}
              src={character?.cardImageUrl}
              className="object-cover"
              width={300}
              height={525}
            />
            <AvatarFallback>
              {name ? name : character?.name?.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">
                {name ? name : character?.name ? character?.name : "Loading"}
              </h2>
              {recentMessageAt &&
                !isNaN(new Date(recentMessageAt).getTime()) && (
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(recentMessageAt), {
                      addSuffix: true,
                    })}
                  </p>
                )}
            </div>
            <p className="line-clamp-1 text-base text-muted-foreground">
              {message?.text ? message?.text : "Click here to chat."}
            </p>
          </div>
        </div>
      </li>
    </Link>
  );
};

export default function Chats() {
  const { t } = useTranslation();
  const { isAuthenticated } = useConvexAuth();
  const { results, loadMore } = useStablePaginatedQuery(
    api.chats.list,
    {},
    { initialNumItems: 10 },
  );
  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (results?.length > 9 && inView) {
      loadMore(10);
    }
  }, [inView, loadMore]);
  return (
    <Card className="h-full w-full overflow-scroll rounded-b-none border-transparent shadow-none scrollbar-hide lg:border-border lg:shadow-xl">
      <CardHeader>
        <CardTitle>{t("Chats")}</CardTitle>
      </CardHeader>
      <ul>
        {results?.length ? (
          results.map((chat) => (
            <ErrorBoundary errorComponent={() => undefined}>
              {isAuthenticated && (
                <Chat
                  name={chat.chatName as string}
                  characterId={chat.characterId as Id<"characters">}
                  chatId={chat._id as Id<"chats">}
                />
              )}
            </ErrorBoundary>
          ))
        ) : (
          <div className="flex h-[100vh] w-full flex-col items-center justify-center gap-2">
            {t("New chats will appear here.")}
            <Link href="/">
              <Button>{t("Start Chat")}</Button>
            </Link>
          </div>
        )}
        <div ref={ref} />
      </ul>
    </Card>
  );
}
