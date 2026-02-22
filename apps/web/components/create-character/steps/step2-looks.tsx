"use client";

import { useCallback, useEffect } from "react";
import type { CharacterDraft } from "../wizard";

// ── Data ──

const HAIR_STYLES = [
  { value: "short-pixie", label: "Short Pixie", icon: "✂️" },
  { value: "bob", label: "Bob", icon: "💇" },
  { value: "shoulder-straight", label: "Shoulder Straight", icon: "📏" },
  { value: "long-straight", label: "Long Straight", icon: "🪮" },
  { value: "wavy-long", label: "Wavy Long", icon: "🌊" },
  { value: "curly-long", label: "Curly Long", icon: "🌀" },
  { value: "ponytail", label: "Ponytail", icon: "🎀" },
  { value: "braided", label: "Braided", icon: "🪢" },
  { value: "messy-bun", label: "Messy Bun", icon: "💫" },
  { value: "bangs", label: "Bangs", icon: "🎭" },
  { value: "layered", label: "Layered", icon: "🍃" },
  { value: "beach-waves", label: "Beach Waves", icon: "🏖️" },
];

const HAIR_COLORS = [
  { value: "black", label: "Black", hex: "#1a1a1a" },
  { value: "dark-brown", label: "Dark Brown", hex: "#3b2314" },
  { value: "light-brown", label: "Light Brown", hex: "#8b6c42" },
  { value: "blonde", label: "Blonde", hex: "#d4a853" },
  { value: "platinum", label: "Platinum", hex: "#e8e0d0" },
  { value: "red", label: "Red", hex: "#b33030" },
  { value: "pink", label: "Pink", hex: "#e87fa0" },
  { value: "blue", label: "Blue", hex: "#4488cc" },
];

const SKIN_TONES = [
  { value: "fair", label: "Fair", hex: "#fde7d4" },
  { value: "light", label: "Light", hex: "#f5d0a9" },
  { value: "medium", label: "Medium", hex: "#d4a574" },
  { value: "olive", label: "Olive", hex: "#c4956a" },
  { value: "tan", label: "Tan", hex: "#a0764a" },
  { value: "deep", label: "Deep", hex: "#6b4226" },
];

const ETHNICITY_SKIN_DEFAULTS: Record<string, string> = {
  asian: "light",
  white: "fair",
  black: "deep",
  latina: "medium",
};

const BREAST_SIZES = ["A", "B", "C", "D", "DD", "E", "G"];

const EYE_COLORS = [
  { value: "brown", label: "Brown", hex: "#6b4226" },
  { value: "blue", label: "Blue", hex: "#4488cc" },
  { value: "green", label: "Green", hex: "#4a8c5c" },
  { value: "hazel", label: "Hazel", hex: "#8b7340" },
];

const MAKEUP_LABELS = ["Natural", "Light", "Moderate", "Glam", "Full Glam"];

interface Props {
  draft: CharacterDraft;
  updateDraft: (updates: Partial<CharacterDraft>) => void;
}

export default function Step2Looks({ draft, updateDraft }: Props) {
  // Auto-suggest skin tone from ethnicity on mount (only if not already set)
  useEffect(() => {
    if (!draft.skinTone && draft.ethnicity) {
      const suggested = ETHNICITY_SKIN_DEFAULTS[draft.ethnicity];
      if (suggested) updateDraft({ skinTone: suggested });
    }
  }, []);

  const set = useCallback(
    (field: keyof CharacterDraft, value: any) => updateDraft({ [field]: value }),
    [updateDraft],
  );

  const makeupLabel = MAKEUP_LABELS[Math.min(Math.floor(draft.makeupIntensity / 25), 4)];

  return (
    <div className="space-y-10">
      {/* ── Hair Style ── */}
      <section>
        <SectionHeader number={1} title="Hair Style" subtitle="Pick her hairstyle" />
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {HAIR_STYLES.map((h) => {
            const selected = draft.hairStyle === h.value;
            return (
              <button
                key={h.value}
                onClick={() => set("hairStyle", h.value)}
                className={`group flex flex-col items-center gap-2 rounded-xl px-2 py-4 transition-all duration-200 ${
                  selected
                    ? "bg-gradient-to-b from-pink-500/20 to-purple-500/20 ring-[3px] ring-pink-500 ring-offset-2 ring-offset-background"
                    : "bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.12] hover:ring-white/30"
                }`}
              >
                <span className="text-2xl transition-transform group-hover:scale-110">{h.icon}</span>
                <span className={`text-center text-[11px] font-semibold leading-tight ${selected ? "text-pink-300" : "text-white/60"}`}>
                  {h.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Hair Color ── */}
      <section>
        <SectionHeader number={2} title="Hair Color" subtitle="Choose her hair color" />
        <div className="mt-4 flex flex-wrap gap-3">
          {HAIR_COLORS.map((c) => {
            const selected = draft.hairColor === c.value;
            return (
              <button
                key={c.value}
                onClick={() => set("hairColor", c.value)}
                className={`group flex items-center gap-2.5 rounded-xl px-4 py-3 transition-all duration-200 ${
                  selected
                    ? "bg-white/[0.12] ring-[3px] ring-pink-500 ring-offset-2 ring-offset-background"
                    : "bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.12]"
                }`}
              >
                <div
                  className={`h-6 w-6 rounded-full border-2 transition-all ${selected ? "border-pink-400 scale-110" : "border-white/20"}`}
                  style={{ backgroundColor: c.hex }}
                />
                <span className={`text-xs font-semibold ${selected ? "text-pink-300" : "text-white/60"}`}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Skin Tone ── */}
      <section>
        <SectionHeader
          number={3}
          title="Skin Tone"
          subtitle={draft.ethnicity ? `Auto-suggested from "${draft.ethnicity}" — adjust freely` : "Select her skin tone"}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          {SKIN_TONES.map((t) => {
            const selected = draft.skinTone === t.value;
            return (
              <button
                key={t.value}
                onClick={() => set("skinTone", t.value)}
                className={`group flex flex-col items-center gap-2 rounded-xl px-5 py-3.5 transition-all duration-200 ${
                  selected
                    ? "bg-white/[0.12] ring-[3px] ring-pink-500 ring-offset-2 ring-offset-background"
                    : "bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.12]"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full border-2 transition-all ${selected ? "border-pink-400 scale-110" : "border-white/20"}`}
                  style={{ backgroundColor: t.hex }}
                />
                <span className={`text-xs font-semibold ${selected ? "text-pink-300" : "text-white/60"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Breast Size ── */}
      <section>
        <SectionHeader number={4} title="Breast Size" subtitle="Select cup size" />
        <div className="mt-4 flex flex-wrap gap-2.5">
          {BREAST_SIZES.map((size) => {
            const selected = draft.breastSize === size;
            return (
              <button
                key={size}
                onClick={() => set("breastSize", size)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold transition-all duration-200 ${
                  selected
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/25 scale-110"
                    : "bg-white/[0.06] text-white/60 ring-1 ring-white/10 hover:bg-white/[0.12] hover:text-white"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Eye Color ── */}
      <section>
        <SectionHeader number={5} title="Eye Color" subtitle="Choose her eye color" />
        <div className="mt-4 flex flex-wrap gap-3">
          {EYE_COLORS.map((e) => {
            const selected = draft.eyeColor === e.value;
            return (
              <button
                key={e.value}
                onClick={() => set("eyeColor", e.value)}
                className={`group flex items-center gap-2.5 rounded-xl px-4 py-3 transition-all duration-200 ${
                  selected
                    ? "bg-white/[0.12] ring-[3px] ring-pink-500 ring-offset-2 ring-offset-background"
                    : "bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.12]"
                }`}
              >
                <div
                  className={`h-6 w-6 rounded-full border-2 transition-all ${selected ? "border-pink-400 scale-110" : "border-white/20"}`}
                  style={{ backgroundColor: e.hex }}
                />
                <span className={`text-xs font-semibold ${selected ? "text-pink-300" : "text-white/60"}`}>
                  {e.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Makeup Intensity ── */}
      <section>
        <SectionHeader number={6} title="Makeup Intensity" subtitle="From natural to glamorous" />
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Natural</span>
            <span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-semibold text-pink-300">
              {makeupLabel}
            </span>
            <span className="text-xs text-white/40">Full Glam</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={draft.makeupIntensity}
            onChange={(e) => set("makeupIntensity", Number(e.target.value))}
            className="slider-pink h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-pink-500 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-pink-500/40"
          />
          <div className="flex justify-between text-[10px] text-white/20">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Shared Section Header ──
function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500/20 text-xs font-bold text-pink-400">
        {number}
      </div>
      <div>
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-xs text-white/40">{subtitle}</p>
      </div>
    </div>
  );
}
