"use client";

import { useConvexAuth } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useStablePaginatedQuery } from "../lib/hooks/use-stable-query";
import { api } from "../../convex/_generated/api";
import useStoreUserEffect from "../lib/hooks/use-store-user-effect";
import CreateCharacterWizard from "../../components/create-character/wizard";
import MyCharactersList from "../../components/create-character/my-characters-list";
import { SignIn } from "@clerk/nextjs";

export default function CreatePage() {
  useStoreUserEffect();
  const { isAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const forceNew = searchParams.get("new") === "true";

  const { results, status } = useStablePaginatedQuery(
    api.characters.listMy,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 50 },
  );

  const myCharacters = (results || []).filter(
    (c: any) => c.name && c.cardImageUrl,
  );

  if (!isAuthenticated) {
    return (
      <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-8 py-32 lg:min-h-fit">
        <SignIn />
      </div>
    );
  }

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex h-full min-h-[60vh] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
      </div>
    );
  }

  if (forceNew || myCharacters.length === 0) {
    return <CreateCharacterWizard />;
  }

  return <MyCharactersList characters={myCharacters} />;
}
