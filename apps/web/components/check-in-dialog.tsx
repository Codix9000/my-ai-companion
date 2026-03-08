"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/src/components/alert-dialog";
import useCurrentUser from "../app/lib/hooks/use-current-user";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CalendarCheck } from "lucide-react";
import { Crystal } from "@repo/ui/src/components/icons";
import Image from "next/image";
import { Button } from "@repo/ui/src/components";
import Link from "next/link";

const CheckinDialog = () => {
  const { t } = useTranslation();
  const me = useCurrentUser();
  const checkin = useMutation(api.serve.checkin);
  const checkedIn = useQuery(api.serve.checkedIn);
  const onClickHandler = async () => {
    const promise = checkin();
    toast.promise(promise, {
      loading: "Claiming your daily reward...",
      success: () => {
        return t(
          `Daily reward claimed successfully! Don't forget to return tomorrow for more rewards.`,
        );
      },
      error: (error) => {
        return error
          ? (error.data as { message: string })?.message
          : "Unexpected error occurred";
      },
    });
  };

  return (
    me &&
    checkedIn === false && (
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center justify-center gap-1 text-3xl">
              <CalendarCheck className="h-8 w-8 p-1" />
              {t("Daily Rewards")}
            </AlertDialogTitle>

            <div className="flex w-full flex-col items-center justify-center">
              <Image
                src={"/shop/crystal.png"}
                width={256}
                height={256}
                alt={"image for pricing"}
                className="h-24 w-24 rounded-lg object-cover"
              />
              <AlertDialogDescription className="flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1 text-lg text-foreground">
                  <Crystal className="h-5 w-5" />
                  {me?.subscriptionTier === "plus"
                    ? `200 ${t("Crystals")}`
                    : `15 ${t("Crystals")}`}
                </div>
                <div className="flex text-center">
                  {t(
                    "Crystal is an universal currency for calling AI features in openroleplay.ai.",
                  )}
                </div>
              </AlertDialogDescription>
            </div>
            <div className="flex w-full items-center justify-between gap-4 pt-4">
              <Link href="/vip">
                <Button
                  className="w-fit"
                  onClick={onClickHandler}
                  variant="ghost"
                >
                  {t("Visit Shop")}
                </Button>
              </Link>
              <AlertDialogAction onClick={onClickHandler}>
                {me?.subscriptionTier === "plus"
                  ? t("Claim 200 Crystals")
                  : t("Claim 15 Crystals")}
              </AlertDialogAction>
            </div>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )
  );
};

export default CheckinDialog;
