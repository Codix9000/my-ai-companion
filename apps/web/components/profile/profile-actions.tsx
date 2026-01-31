"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { MessageSquare, Bell, Edit, ImagePlus } from "lucide-react";
import { Button } from "@repo/ui/src/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/components/dialog";
import { Id } from "../../convex/_generated/dataModel";

interface ProfileActionsProps {
  characterId: Id<"characters">;
  characterName: string;
  isCreator: boolean;
}

export default function ProfileActions({
  characterId,
  characterName,
  isCreator,
}: ProfileActionsProps) {
  const { t } = useTranslation();
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <>
      {/* Action Buttons */}
      <div className="mx-auto mt-6 flex max-w-2xl gap-3 px-4">
        {/* Subscribe Button */}
        <Button
          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          onClick={() => setShowComingSoon(true)}
        >
          <Bell className="mr-2 h-4 w-4" />
          {t("Subscribe")}
        </Button>

        {/* Chat Button */}
        <Link href={`/character/${characterId}/chat`} className="flex-1">
          <Button variant="outline" className="w-full">
            <MessageSquare className="mr-2 h-4 w-4" />
            {t("Chat")}
          </Button>
        </Link>

        {/* Creator-only: Edit and Create Post buttons */}
        {isCreator && (
          <>
            <Link href={`/my-characters/create?id=${characterId}`}>
              <Button variant="outline" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/my-characters/${characterId}/post`}>
              <Button variant="outline" size="icon">
                <ImagePlus className="h-4 w-4" />
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Coming Soon Dialog */}
      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-pink-500" />
              {t("Subscriptions Coming Soon")}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t(
                "We're working on subscription features that will let you unlock exclusive content from"
              )}{" "}
              <span className="font-semibold">{characterName}</span>.{" "}
              {t("Stay tuned!")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowComingSoon(false)}>
              {t("Got it")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
