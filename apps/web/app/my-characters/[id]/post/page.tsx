"use client";

import { useConvexAuth } from "convex/react";
import { SignIn, useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";
import PostForm from "../../../../components/feed/post-form";

export default function Page(): JSX.Element {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const params = useParams();
  const characterId = params.id as Id<"characters">;

  return (
    <div className="w-full h-full flex flex-col justify-self-start lg:pl-16 lg:pr-6">
      {isAuthenticated ? (
        <PostForm characterId={characterId} />
      ) : (
        <div className="w-full h-full items-start justify-center flex py-32">
          {!user && <SignIn />}
        </div>
      )}
    </div>
  );
}
