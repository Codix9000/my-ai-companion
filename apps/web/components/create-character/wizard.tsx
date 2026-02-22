"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, Dices } from "lucide-react";
import Step1CoreIdentity from "./steps/step1-core-identity";
import Step2Looks from "./steps/step2-looks";
import Step3Personality from "./steps/step3-personality";

const TOTAL_STEPS = 5;
const STEP_LABELS = [
  "Core Identity",
  "Looks",
  "Personality & Desires",
  "Voice & Chat",
  "Review & Create",
];

export interface CharacterDraft {
  // Step 1
  ethnicity: string | null;
  ageCategory: string | null;
  bodyType: string | null;
  // Step 2
  hairStyle: string | null;
  hairColor: string | null;
  skinTone: string | null;
  breastSize: string | null;
  eyeColor: string | null;
  makeupIntensity: number;
  // Step 3
  personalityTraits: string[];
  kinks: string[];
  nsfwIntensity: number;
  relationshipStyle: string | null;
  occupations: string[];
  customOccupation: string;
}

const INITIAL_DRAFT: CharacterDraft = {
  ethnicity: null,
  ageCategory: null,
  bodyType: null,
  hairStyle: null,
  hairColor: null,
  skinTone: null,
  breastSize: null,
  eyeColor: null,
  makeupIntensity: 30,
  personalityTraits: [],
  kinks: [],
  nsfwIntensity: 40,
  relationshipStyle: null,
  occupations: [],
  customOccupation: "",
};

export default function CreateCharacterWizard() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<CharacterDraft>(INITIAL_DRAFT);

  const updateDraft = useCallback(
    (updates: Partial<CharacterDraft>) => {
      setDraft((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const canGoNext = () => {
    if (step === 1) {
      return !!draft.ethnicity && !!draft.ageCategory && !!draft.bodyType;
    }
    if (step === 2) {
      return !!draft.hairStyle && !!draft.hairColor && !!draft.skinTone && !!draft.breastSize && !!draft.eyeColor;
    }
    if (step === 3) {
      return draft.personalityTraits.length >= 2 && !!draft.relationshipStyle;
    }
    return true;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS && canGoNext()) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleRandomize = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
    if (step === 1) {
      updateDraft({
        ethnicity: pick(["asian", "white", "black", "latina"]),
        ageCategory: pick(["young-adult", "early-20s", "mid-20s", "mature", "milf"]),
        bodyType: pick(["slim", "athletic", "average", "curvy", "voluptuous"]),
      });
    }
    if (step === 2) {
      updateDraft({
        hairStyle: pick(["short-pixie", "bob", "shoulder-straight", "long-straight", "wavy-long", "curly-long", "ponytail", "braided", "messy-bun", "bangs", "layered", "beach-waves"]),
        hairColor: pick(["black", "dark-brown", "light-brown", "blonde", "platinum", "red", "pink", "blue"]),
        skinTone: pick(["fair", "light", "medium", "olive", "tan", "deep"]),
        breastSize: pick(["A", "B", "C", "D", "DD", "E", "G"]),
        eyeColor: pick(["brown", "blue", "green", "hazel"]),
        makeupIntensity: Math.floor(Math.random() * 100),
      });
    }
    if (step === 3) {
      const allTraits = ["bubbly", "shy", "confident", "playful", "dominant", "submissive", "intellectual", "nurturing", "sassy", "loyal", "adventurous", "romantic", "teasing", "mysterious", "funny", "caring", "bold", "gentle", "wild", "calm"];
      const allKinks = ["light-tease", "romantic", "explicit", "dominant-sub", "roleplay", "lingerie", "public-tease"];
      const allStyles = ["casual-fling", "loving-girlfriend", "dominant-gf", "submissive", "friends-with-benefits", "long-distance"];
      const allOccupations = ["nurse", "gamer", "fitness-coach", "artist", "office-lady", "college-student", "traveler"];
      const shuffled = [...allTraits].sort(() => Math.random() - 0.5);
      updateDraft({
        personalityTraits: shuffled.slice(0, 3 + Math.floor(Math.random() * 3)),
        kinks: [pick(allKinks), pick(allKinks)].filter((v, i, a) => a.indexOf(v) === i),
        nsfwIntensity: Math.floor(Math.random() * 100),
        relationshipStyle: pick(allStyles),
        occupations: [pick(allOccupations)],
        customOccupation: "",
      });
    }
  };

  return (
    <div className="flex h-full min-h-screen flex-col bg-background lg:flex-row">
      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col">
        {/* ── Top Bar: Progress + Random ── */}
        <div className="flex shrink-0 items-center gap-4 px-6 py-5 lg:px-10">
          {/* Back button */}
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white/60 transition-colors hover:bg-white/[0.14] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          {/* Progress bar */}
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/50">
                Step {step} of {TOTAL_STEPS}
              </span>
              <span className="text-xs font-semibold text-pink-400">
                {STEP_LABELS[step - 1]}
              </span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i < step
                      ? "bg-gradient-to-r from-pink-500 to-purple-500"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Random button */}
          <button
            onClick={handleRandomize}
            className="flex h-9 items-center gap-2 rounded-full bg-white/[0.08] px-4 text-sm text-white/60 transition-colors hover:bg-white/[0.14] hover:text-white"
          >
            <Dices className="h-4 w-4" />
            <span className="hidden sm:inline">Random</span>
          </button>
        </div>

        {/* ── Step Content ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-28 lg:px-10">
          {step === 1 && (
            <Step1CoreIdentity draft={draft} updateDraft={updateDraft} />
          )}
          {step === 2 && (
            <Step2Looks draft={draft} updateDraft={updateDraft} />
          )}
          {step === 3 && (
            <Step3Personality draft={draft} updateDraft={updateDraft} />
          )}
          {step === 4 && (
            <div className="flex h-64 items-center justify-center text-white/30">
              Step 4: Voice & Chat — Coming soon
            </div>
          )}
          {step === 5 && (
            <div className="flex h-64 items-center justify-center text-white/30">
              Step 5: Review & Create — Coming soon
            </div>
          )}
        </div>

        {/* ── Bottom Navigation ── */}
        <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between border-t border-white/[0.08] bg-background/95 px-6 py-4 backdrop-blur-md lg:absolute lg:left-auto lg:px-10">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:text-white disabled:invisible"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoNext() || step === TOTAL_STEPS}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-all hover:from-pink-600 hover:to-purple-600 disabled:opacity-30 disabled:shadow-none"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Right Side Panel (Desktop Only) ── */}
      <div className="hidden w-80 shrink-0 border-l border-white/[0.08] bg-white/[0.02] lg:flex lg:flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mb-6 flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20">
            <span className="text-6xl">👩</span>
          </div>
          <p className="text-center text-sm font-medium text-white/40">
            Previewing your dream girl…
          </p>
          {(draft.ethnicity || draft.ageCategory || draft.bodyType || draft.hairStyle || draft.hairColor || draft.personalityTraits.length > 0 || draft.relationshipStyle) && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {draft.ethnicity && (
                <span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-medium text-pink-300 capitalize">
                  {draft.ethnicity}
                </span>
              )}
              {draft.ageCategory && (
                <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300">
                  {draft.ageCategory.replace(/-/g, " ")}
                </span>
              )}
              {draft.bodyType && (
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300 capitalize">
                  {draft.bodyType}
                </span>
              )}
              {draft.hairStyle && (
                <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300">
                  {draft.hairStyle.replace(/-/g, " ")}
                </span>
              )}
              {draft.hairColor && (
                <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-300">
                  {draft.hairColor.replace(/-/g, " ")} hair
                </span>
              )}
              {draft.skinTone && (
                <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-medium text-orange-300 capitalize">
                  {draft.skinTone} skin
                </span>
              )}
              {draft.eyeColor && (
                <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-300">
                  {draft.eyeColor} eyes
                </span>
              )}
              {draft.breastSize && (
                <span className="rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-medium text-fuchsia-300">
                  {draft.breastSize} cup
                </span>
              )}
              {draft.personalityTraits.map((t) => (
                <span key={t} className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-medium text-violet-300 capitalize">
                  {t}
                </span>
              ))}
              {draft.relationshipStyle && (
                <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300">
                  {draft.relationshipStyle.replace(/-/g, " ")}
                </span>
              )}
              {draft.occupations.map((o) => (
                <span key={o} className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                  {o.replace(/-/g, " ")}
                </span>
              ))}
              {draft.customOccupation && (
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                  {draft.customOccupation}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
