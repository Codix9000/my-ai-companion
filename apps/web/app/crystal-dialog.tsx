import React from "react";
import {
  DialogOrDrawer,
  DialogOrDrawerContent,
  DialogOrDrawerHeader,
  DialogOrDrawerDescription,
} from "@repo/ui/src/components/dialog-or-drawer";
import { useCrystalDialog } from "./lib/hooks/use-crystal-dialog";
import { useTranslation } from "react-i18next";
import { Button } from "@repo/ui/src/components";
import CurrentCrystals from "./current-crystals";
import { DialogPortal } from "@repo/ui/src/components/dialog";
import { MobilePackageWrapper } from "./vip/mobile-package";
import { packages } from "./vip/packages";
import Link from "next/link";
import useCurrentUser from "./lib/hooks/use-current-user";

const CrystalDialog: React.FC = () => {
  const { t } = useTranslation();
  const { isOpen, closeDialog } = useCrystalDialog();
  const currentUser = useCurrentUser();
  const isPlus = currentUser?.subscriptionTier === "plus";

  return (
    <DialogOrDrawer
      open={isOpen}
      onOpenChange={closeDialog}
      onPointerDownOutside={closeDialog}
    >
      <DialogPortal>
        <DialogOrDrawerContent
          className="min-w-fit p-8"
          onOpenAutoFocus={(e: any) => e.preventDefault()}
        >
          <DialogOrDrawerHeader className="p-0 text-left">
            <h2>{t("Not enough crystals")}</h2>
          </DialogOrDrawerHeader>
          <div className="flex flex-col gap-4">
            <DialogOrDrawerDescription>
              {t("Crystals are used per AI features you have used.")}{" "}
              {t("Top-up your crystals and gain access to over 30 AI models.")}
            </DialogOrDrawerDescription>
            <div className="flex items-center justify-center gap-2 sm:flex-row">
              {packages.slice(0, 2).map((pkg) => (
                <MobilePackageWrapper
                  key={pkg.src}
                  src={pkg.src}
                  amount={pkg.amount as any}
                  bonus={pkg.bonus}
                  price={pkg.price}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <CurrentCrystals />
            <Link href="/vip">
              <Button className="w-fit" onClick={closeDialog} variant="ghost">
                {t("Shop")}
              </Button>
            </Link>
          </div>
        </DialogOrDrawerContent>
      </DialogPortal>
    </DialogOrDrawer>
  );
};

export default CrystalDialog;
