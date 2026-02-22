"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, Dices } from "lucide-react";
import Step1CoreIdentity from "./steps/step1-core-identity";

const TOTAL_STEPS = 5;
const STEP_LABELS = [
  "Core Identity",
  "Personality",
  "Style & Look",
  "Voice & Chat",
  "Review & Create",
];

export interface CharacterDraft {
  ethnicity: string | null;
  ageCategory: string | null;
  bodyType: string | null;
}

const INITIAL_DRAFT: CharacterDraft = {
  ethnicity: null,
  ageCategory: null,
  bodyType: null,
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
    return true;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS && canGoNext()) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleRandomize = () => {
    if (step === 1) {
      const ethnicities = ["asian", "white", "black", "latina"];
      const ages = ["young-adult", "early-20s", "mid-20s", "mature", "milf"];
      const bodies = ["slim", "athletic", "average", "curvy", "voluptuous"];
      updateDraft({
        ethnicity: ethnicities[Math.floor(Math.random() * ethnicities.length)]!,
        ageCategory: ages[Math.floor(Math.random() * ages.length)]!,
        bodyType: bodies[Math.floor(Math.random() * bodies.length)]!,
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
            <div className="flex h-64 items-center justify-center text-white/30">
              Step 2: Personality — Coming soon
            </div>
          )}
          {step === 3 && (
            <div className="flex h-64 items-center justify-center text-white/30">
              Step 3: Style & Look — Coming soon
            </div>
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
          {(draft.ethnicity || draft.ageCategory || draft.bodyType) && (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
