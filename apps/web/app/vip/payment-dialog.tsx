import React, { useEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogPortal,
} from "@repo/ui/src/components/dialog";
import { usePaymentDialog } from "../lib/hooks/use-crystal-dialog";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, X } from "lucide-react";
import { Drawer, DrawerContent } from "@repo/ui/src/components/drawer";

const stripeKey =
  process.env.NODE_ENV === "development"
    ? "pk_test_51OJquFDWbs4J5X5ckbKjSEpcjrgOYTsHxRiOq1frxbahPFDtt0perqP7cWLl8FTUIQ0aVP7dMugvauRxpbT54Wjo004FuhU1Ug"
    : "pk_live_51OJquFDWbs4J5X5c73h8TpqpRHY5OVpGBiWqia7DkkYMUUAf8yZ5upuDhEK2LRXcFe8qCrlzNLPmkJr0AKVtXn7600AVe2lUmZ";

const stripePromise = loadStripe(stripeKey);

const CrystalDialog: React.FC = () => {
  const { isOpen, clientSecret, closeDialog } = usePaymentDialog();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  useEffect(() => {
    if (sessionId) {
      toast.success(`Payment processed successfully.`);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [sessionId]);

  return (
    <Drawer open={isOpen} onClose={closeDialog}>
      <DrawerContent className="w-full bg-white">
        <div className="max-h-96 overflow-y-scroll py-4 lg:max-h-[36rem] xl:max-h-[48rem]">
          {clientSecret && (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CrystalDialog;
