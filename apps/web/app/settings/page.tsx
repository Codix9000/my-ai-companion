"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import useCurrentUser from "../lib/hooks/use-current-user";
import { Button } from "@repo/ui/src/components/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Crown, Gem, Pencil } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { t } = useTranslation();
  const me = useCurrentUser();
  const updateProfile = useMutation(api.users.updateProfile);

  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("");
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isEditingGender, setIsEditingGender] = useState(false);

  useEffect(() => {
    if (me?.name) setNickname(me.name);
    if (me?.gender) setGender(me.gender);
  }, [me?.name, me?.gender]);

  const handleSaveNickname = async () => {
    if (!nickname.trim()) return;
    try {
      await updateProfile({ name: nickname.trim() });
      toast.success("Nickname updated!");
      setIsEditingNickname(false);
    } catch {
      toast.error("Failed to update nickname");
    }
  };

  const handleSaveGender = async (value: string) => {
    try {
      await updateProfile({ gender: value });
      setGender(value);
      toast.success("Gender updated!");
      setIsEditingGender(false);
    } catch {
      toast.error("Failed to update gender");
    }
  };

  const currentPlan = me?.subscriptionTier === "plus" ? "Premium" : "Free";

  return (
    <div className="h-full w-full overflow-x-hidden pb-24 lg:pl-8">
      <div className="mx-auto max-w-2xl px-4 py-8 lg:px-0">
        <h1 className="mb-8 text-2xl font-bold text-foreground">
          {t("Profile Settings")}
        </h1>

        {/* Profile Info Card */}
        <div className="mb-6 rounded-2xl border border-border/60 bg-card p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Nickname */}
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("Nickname")}</span>
                <button
                  onClick={() => setIsEditingNickname(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              {isEditingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNickname();
                      if (e.key === "Escape") setIsEditingNickname(false);
                    }}
                  />
                  <Button size="sm" onClick={handleSaveNickname} className="h-8 rounded-lg">
                    {t("Save")}
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {me?.name || "—"}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("Gender")}</span>
                <button
                  onClick={() => setIsEditingGender(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              {isEditingGender ? (
                <div className="flex items-center gap-2">
                  {["Male", "Female", "Other"].map((g) => (
                    <Button
                      key={g}
                      variant={gender === g ? "default" : "outline"}
                      size="sm"
                      className="h-8 rounded-lg"
                      onClick={() => handleSaveGender(g)}
                    >
                      {t(g)}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => setIsEditingGender(false)}
                  >
                    {t("Cancel")}
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {gender || "—"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Current Plan Card */}
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-950/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-amber-400" />
              <div>
                <span className="text-sm font-medium text-foreground">
                  {t("Current Plan")}
                </span>
                <span className="ml-3 text-sm font-semibold text-amber-400">
                  {currentPlan}
                </span>
              </div>
            </div>
            {currentPlan === "Free" && (
              <Link href="/subscriptions">
                <Button className="gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 text-white hover:from-pink-600 hover:to-purple-600">
                  <Gem className="h-4 w-4" />
                  {t("Upgrade to Premium")}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-400">{t("Danger Zone")}</p>
              <p className="text-xs text-muted-foreground">
                {t("If you want to permanently delete this account and all of its data.")}
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-lg border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={() => toast.info("Coming soon!")}
            >
              {t("Delete account")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
