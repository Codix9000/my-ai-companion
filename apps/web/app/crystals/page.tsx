"use client";

import { useState } from "react";
import { Button } from "@repo/ui/src/components";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@repo/ui/src/components/tabs";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Unlock,
  Infinity,
  Brain,
  Zap,
  Mic,
  Check,
  Sparkles,
  Crown,
} from "lucide-react";
import Image from "next/image";
import { MovingBorder } from "../../components/ui/moving-border";

/* ─── Sparks balance (mock) ─── */
function SparksHeader({
  sparks,
}: {
  sparks: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-8 flex items-center gap-2">
      <Zap className="h-5 w-5 text-yellow-400" />
      <span className="text-sm font-medium text-foreground/70">
        {t("Your Sparks")}:
      </span>
      <span className="font-display text-lg font-bold text-yellow-400">
        {sparks.toLocaleString()}
      </span>
    </div>
  );
}

/* ─── Feature row ─── */
function Feature({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3 text-sm text-foreground/80">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </li>
  );
}

/* ─── Monthly plan card ─── */
function MonthlyCard({ onSubscribe }: { onSubscribe: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05]">
      <div className="mb-4 flex items-center gap-3">
        <Crown className="h-5 w-5 text-pink-400" />
        <h3 className="font-display text-lg font-semibold text-foreground">
          {t("1 Month")}
        </h3>
      </div>

      <div className="mb-6">
        <span className="font-display text-4xl font-bold text-foreground">$13.99</span>
        <span className="ml-1 text-sm text-foreground/50">/ {t("month")}</span>
      </div>

      <ul className="mb-8 flex flex-col gap-3">
        <Feature
          icon={<Unlock className="h-4 w-4 text-pink-500" />}
          text={t("Remove all Image & Video Blurs")}
        />
        <Feature
          icon={<Infinity className="h-4 w-4 text-pink-500" />}
          text={t("Unlimited Erotic Roleplay Chat")}
        />
        <Feature
          icon={<Brain className="h-4 w-4 text-pink-500" />}
          text={t("Flawless Long-Term Memory")}
        />
        <Feature
          icon={<Zap className="h-4 w-4 text-yellow-400" />}
          text={t("1,000 Monthly Sparks")}
        />
      </ul>

      <Button
        onClick={onSubscribe}
        className="w-full rounded-xl bg-white/10 py-3 font-semibold text-foreground transition-all hover:bg-white/20"
      >
        {t("Subscribe")}
      </Button>
    </div>
  );
}

/* ─── Yearly plan card (BEST VALUE with moving border) ─── */
function YearlyCard({ onSubscribe }: { onSubscribe: () => void }) {
  const { t } = useTranslation();
  return (
    <MovingBorder containerClassName="w-full">
      <div className="relative p-6">
        {/* Best value badge */}
        <div className="absolute -top-px right-6 z-10">
          <div className="rounded-b-lg bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              {t("Best Value")} — 70% OFF
            </span>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 pt-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            {t("Yearly")}
          </h3>
        </div>

        <div className="mb-1">
          <span className="font-display text-4xl font-bold text-foreground">$4.19</span>
          <span className="ml-1 text-sm text-foreground/50">/ {t("month")}</span>
        </div>
        <p className="mb-6 text-xs text-foreground/40">
          {t("Billed")} $49.99 {t("annually")}
        </p>

        <ul className="mb-8 flex flex-col gap-3">
          <Feature
            icon={<Unlock className="h-4 w-4 text-pink-500" />}
            text={t("Remove all Image & Video Blurs")}
          />
          <Feature
            icon={<Infinity className="h-4 w-4 text-pink-500" />}
            text={t("Unlimited Erotic Roleplay Chat")}
          />
          <Feature
            icon={<Brain className="h-4 w-4 text-pink-500" />}
            text={t("Flawless Long-Term Memory")}
          />
          <Feature
            icon={<Zap className="h-4 w-4 text-yellow-400" />}
            text={t("2,500 Monthly Sparks")}
          />
          <Feature
            icon={<Mic className="h-4 w-4 text-pink-500" />}
            text={t("Unlimited Voice Calls")}
          />
        </ul>

        <Button
          onClick={onSubscribe}
          className="w-full rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 py-3 font-semibold text-white shadow-lg shadow-pink-500/20 transition-all hover:from-pink-500 hover:to-purple-500 hover:shadow-pink-500/30"
        >
          {t("Subscribe & Save 70%")}
        </Button>
      </div>
    </MovingBorder>
  );
}

/* ─── Spark package card ─── */
function SparkPackage({
  amount,
  price,
  description,
  isBestValue,
  onPurchase,
}: {
  amount: number;
  price: string;
  description: string;
  isBestValue?: boolean;
  onPurchase: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.06]">
      {isBestValue && (
        <div className="absolute right-3 top-3">
          <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
            {t("Best Value")}
          </span>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
          <Zap className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <p className="font-display text-xl font-bold text-foreground">
            {amount.toLocaleString()}
          </p>
          <p className="text-xs text-foreground/40">{t("Sparks")}</p>
        </div>
      </div>

      <p className="mb-4 text-xs text-foreground/40">{description}</p>

      <Button
        onClick={onPurchase}
        className="w-full rounded-xl bg-white/10 font-semibold text-foreground transition-all hover:bg-white/20"
      >
        {price}
      </Button>
    </div>
  );
}

/* ─── Character image / placeholder column ─── */
function CharacterColumn() {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {!imgError ? (
        <Image
          src="/store/vip-character.png"
          alt="VIP Character"
          fill
          className="object-cover object-top"
          priority
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-b from-[#1a0a1e] via-[#0d0610] to-[#050505]" />
      )}
      {/* Vignette overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#050505]/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/40" />
      <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#050505]/50" />
    </div>
  );
}

/* ─── Background gradient animation ─── */
function BackgroundGradient() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -left-1/4 -top-1/4 h-[150%] w-[150%] animate-bg-drift"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(88,28,135,0.15) 0%, transparent 60%), " +
            "radial-gradient(ellipse at 70% 30%, rgba(157,23,77,0.08) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 50% 80%, rgba(59,7,100,0.12) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}

/* ─── Main page ─── */
export default function Page() {
  const { t } = useTranslation();
  const [currentSparks, setCurrentSparks] = useState(0);

  const handleSubscribe = () => {
    toast.success(t("Redirecting to secure checkout..."));
  };

  const handlePurchase = () => {
    toast.success(t("Redirecting to secure checkout..."));
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[#050505] lg:mr-4 lg:overflow-hidden lg:rounded-xl">
      {/* ─── Left: Character image (desktop only) ─── */}
      <div className="fixed inset-0 z-0 lg:relative lg:block lg:w-[45%]">
        <div className="sticky top-0 h-screen">
          <CharacterColumn />
        </div>
      </div>

      {/* ─── Right: Store UI ─── */}
      <div className="relative z-10 min-h-screen w-full lg:w-[55%]">
        <BackgroundGradient />

        {/* Mobile glassmorphism overlay */}
        <div className="relative z-10 min-h-screen px-5 pb-24 pt-8 lg:bg-transparent lg:px-10 lg:pt-12">
          {/* Mobile glass background */}
          <div className="fixed inset-0 z-[-1] bg-black/60 backdrop-blur-xl lg:hidden" />

          {/* Header */}
          <div className="mb-2">
            <h1 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
              {t("VIP Store")}
            </h1>
            <p className="mt-1 text-sm text-foreground/40">
              {t("Unlock the full experience")}
            </p>
          </div>

          <SparksHeader sparks={currentSparks} />

          {/* Tabs */}
          <Tabs defaultValue="subscribe" className="w-full">
            <TabsList className="mb-8 grid w-full grid-cols-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
              <TabsTrigger
                value="subscribe"
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600/20 data-[state=active]:to-purple-600/20 data-[state=active]:text-foreground"
              >
                <Crown className="mr-2 h-4 w-4" />
                {t("Subscribe (VIP)")}
              </TabsTrigger>
              <TabsTrigger
                value="sparks"
                className="rounded-lg data-[state=active]:bg-yellow-400/10 data-[state=active]:text-foreground"
              >
                <Zap className="mr-2 h-4 w-4" />
                {t("Top-Up Sparks")}
              </TabsTrigger>
            </TabsList>

            {/* ─── Tab A: Subscribe (VIP) ─── */}
            <TabsContent value="subscribe">
              <div className="grid gap-6 lg:grid-cols-2">
                <MonthlyCard onSubscribe={handleSubscribe} />
                <YearlyCard onSubscribe={handleSubscribe} />
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-foreground/30">
                <Check className="h-3 w-3" />
                <span>{t("Cancel anytime. No hidden fees.")}</span>
              </div>
            </TabsContent>

            {/* ─── Tab B: Top-Up Sparks ─── */}
            <TabsContent value="sparks">
              <div className="mb-6">
                <p className="text-sm text-foreground/50">
                  {t("Sparks power custom photos, videos, and premium AI features.")}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SparkPackage
                  amount={500}
                  price="$4.99"
                  description={t("Good for ~20 custom photos")}
                  onPurchase={handlePurchase}
                />
                <SparkPackage
                  amount={2000}
                  price="$14.99"
                  description={t("Good for ~80 photos or 20 videos")}
                  onPurchase={handlePurchase}
                />
                <SparkPackage
                  amount={10000}
                  price="$49.99"
                  description={t("Good for ~400 photos")}
                  isBestValue
                  onPurchase={handlePurchase}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
