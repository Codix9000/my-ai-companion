"use client";

import { useConvexAuth } from "convex/react";
import { SignIn, useUser } from "@clerk/nextjs";
import { Id } from "../../../convex/_generated/dataModel";
import CharacterProfile from "../../../components/profile/character-profile";
import useStoreUserEffect from "../../lib/hooks/use-store-user-effect";
import useCurrentUser from "../../lib/hooks/use-current-user";

export default function CharacterProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useCurrentUser();
  
  // Store user effect for session management
  useStoreUserEffect();

  const characterId = params.id as Id<"characters">;

  // Show sign-in if not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-8 lg:min-h-fit">
        <span className="mt-16 font-medium lg:mt-0">
          Sign in to view this profile
        </span>
        <div className="py-16">
          {!user && <SignIn />}
        </div>
      </div>
    );
  }

  // Wait for user data to load
  if (!currentUser?.name) {
    return null;
  }

  return (
    <div className="h-full w-full overflow-x-hidden lg:pl-16">
      <CharacterProfile characterId={characterId} />
    </div>
  );
}
