"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import Spinner from "@repo/ui/src/components/spinner";
import ProfileHeader from "./profile-header";
import ProfileActions from "./profile-actions";
import ProfilePosts from "./profile-posts";
import { useNsfwPreference } from "../../app/lib/hooks/use-nsfw-preference";
import AgeRestriction from "../characters/age-restriction";
import useCurrentUser from "../../app/lib/hooks/use-current-user";

interface CharacterProfileProps {
  characterId: Id<"characters">;
}

export default function CharacterProfile({ characterId }: CharacterProfileProps) {
  const currentUser = useCurrentUser();
  const { nsfwPreference } = useNsfwPreference();
  
  const character = useQuery(
    api.characters.get,
    currentUser?.name ? { id: characterId } : "skip"
  );

  if (!character) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="w-full pb-24">
      {character.isNSFW && <AgeRestriction />}
      
      {/* Profile Header - Avatar, Name, Description */}
      <ProfileHeader character={character} />

      {/* Action Buttons - Message, Image, Video */}
      <ProfileActions characterId={characterId} />

      {/* Character's Posts Grid */}
      <ProfilePosts
        characterId={characterId}
        nsfwPreference={nsfwPreference}
      />
    </div>
  );
}
