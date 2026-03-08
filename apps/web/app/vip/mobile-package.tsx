"use client";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  Tooltip,
} from "@repo/ui/src/components";
import { useAction } from "convex/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import useCurrentUser from "../lib/hooks/use-current-user";
import { toast } from "sonner";
import { usePaymentDialog } from "../lib/hooks/use-crystal-dialog";

export const MobilePackage = ({
  src,
  amount,
  bonus,
  price,
  handlePurchaseClick,
}: {
  src: string;
  amount: 150 | 1650 | 5450 | 11200 | 19400 | 90000;
  bonus: number;
  price: number;
  handlePurchaseClick?: any;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Tooltip
      content={`Buy ${amount - bonus} ${
        bonus > 0 ? `(+ Bonus ${bonus})` : ""
      } crystals`}
      desktopOnly
    >
      <Card
        className="relative aspect-square h-full w-full rounded-lg tabular-nums duration-200 hover:shadow-lg md:h-64 md:w-64"
        role="button"
        onClick={
          handlePurchaseClick
            ? (e) => handlePurchaseClick(e)
            : () => router.push("/sign-in")
        }
      >
        <Image
          src={src}
          width={256}
          height={256}
          alt={"image for pricing"}
          className="absolute top-0 h-full w-full rounded-lg object-cover"
        />
        <div className="absolute bottom-0 h-[50%] w-full rounded-b-lg bg-gradient-to-b from-transparent via-white/95 to-white" />
        <div className="flex flex-col gap-1 pt-[60%]">
          <CardHeader className="flex items-center justify-center py-1">
            <CardTitle className="z-10 text-base text-black">
              {amount.toLocaleString()} {t("Crystals")}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex w-full items-center justify-center">
            <p className="z-10 w-full rounded-full bg-sky-100 text-center text-sm font-semibold text-sky-900">
              {price}$
            </p>
          </CardFooter>
        </div>
      </Card>
    </Tooltip>
  );
};

export const MobilePackageWrapper = ({
  src,
  amount,
  bonus,
  price,
}: {
  src: string;
  amount: 150 | 1650 | 5450 | 11200 | 19400 | 90000;
  bonus: number;
  price: number;
}) => {
  const buyCrystal = useAction(api.stripe.pay);
  const currentUser = useCurrentUser();
  const { setClientSecret, openDialog } = usePaymentDialog();

  async function handlePurchaseClick(event: any) {
    event.preventDefault();
    const promise = buyCrystal({
      numCrystals: amount,
      userId: currentUser._id,
    });
    toast.promise(promise, {
      loading: "Loading purchase details...",
      success: (clientSecret) => {
        openDialog();
        setClientSecret(clientSecret);
        return `Now you can proceed to purchase.`;
      },
      error: (error) => {
        return error
          ? (error.data as { message: string }).message
          : "Unexpected error occurred";
      },
    });
  }

  return (
    <MobilePackage
      src={src}
      amount={amount}
      bonus={bonus}
      price={price}
      handlePurchaseClick={handlePurchaseClick}
    />
  );
};
