import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function useStoreChatEffect(
  characterId: Id<"characters">,
  storyId?: Id<"stories">,
  urlChatId?: Id<"chats">,
) {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const [chatId, setChatId] = useState<Id<"chats"> | undefined>(urlChatId);
  const chat = useQuery(
    api.chats.get,
    chatId && isAuthenticated ? { id: chatId as Id<"chats"> } : "skip",
  );
  const createChat = useMutation(api.chats.create);
  const translate = useMutation(api.characters.translate);

  useEffect(() => {
    if (!isAuthenticated || chatId) {
      return;
    }

    async function createChatForUser() {
      try {
        const id = await createChat({
          characterId,
          storyId,
        });
        setChatId(id);
        await translate({ id: characterId });
      } catch (error: any) {
        const msg = error?.data?.message || error?.message || "";
        if (msg.includes("CHARACTER_DELETED")) {
          return;
        }
        throw error;
      }
    }

    createChatForUser();
    return () => setChatId(undefined);
  }, [isAuthenticated, createChat, user?.id]);

  return { chatId, isUnlocked: chat?.isUnlocked };
}
