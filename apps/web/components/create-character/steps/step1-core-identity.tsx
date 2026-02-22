"use client";

import { useCallback } from "react";
import Image from "next/image";
import type { CharacterDraft } from "../wizard";

// ── Option Data ──

const ETHNICITIES = [
  {
    value: "asian",
    label: "Asian",
    emoji: "🌸",
    gradient: "from-rose-400 to-orange-300",
  },
  {
    value: "white",
    label: "White",
    emoji: "❄️",
    gradient: "from-blue-300 to-slate-200",
  },
  {
    value: "black",
    label: "Black",
    emoji: "✨",
    gradient: "from-amber-500 to-yellow-600",
  },
  {
    value: "latina",
    label: "Latina",
    emoji: "🔥",
    gradient: "from-red-400 to-pink-500",
  },
];

const AGE_CATEGORIES = [
  { value: "young-adult", label: "Young Adult", sub: "18–24" },
  { value: "early-20s", label: "Early 20s", sub: "22–26" },
  { value: "mid-20s", label: "Mid 20s", sub: "25–29" },
  { value: "mature", label: "Mature", sub: "30–39" },
  { value: "milf", label: "MILF", sub: "40+" },
];

const BODY_TYPES = [
  { value: "slim", label: "Slim / Petite", icon: "🦋" },
  { value: "athletic", label: "Athletic / Toned", icon: "💪" },
  { value: "average", label: "Average", icon: "🌻" },
  { value: "curvy", label: "Curvy", icon: "🍑" },
  { value: "voluptuous", label: "Voluptuous / Big", icon: "🔥" },
];

// ── Image placeholder path ──
// Upload ethnicity card images to: /public/create-character/ethnicity-{value}.jpg
// e.g. /public/create-character/ethnicity-asian.jpg
const ETHNICITY_IMAGE_BASE = "/create-character/ethnicity-";

interface Props {
  draft: CharacterDraft;
  updateDraft: (updates: Partial<CharacterDraft>) => void;
}

export default function Step1CoreIdentity({ draft, updateDraft }: Props) {
  const selectEthnicity = useCallback(
    (value: string) => updateDraft({ ethnicity: value }),
    [updateDraft],
  );
  const selectAge = useCallback(
    (value: string) => updateDraft({ ageCategory: value }),
    [updateDraft],
  );
  const selectBody = useCallback(
    (value: string) => updateDraft({ bodyType: value }),
    [updateDraft],
  );

  return (
    <div className="space-y-10">
      {/* ── Section: Ethnicity ── */}
      <section>
        <SectionHeader
          number={1}
          title="Ethnicity"
          subtitle="Choose her look"
        />
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {ETHNICITIES.map((eth) => {
            const selected = draft.ethnicity === eth.value;
            const imagePath = `${ETHNICITY_IMAGE_BASE}${eth.value}.jpg`;
            return (
              <button
                key={eth.value}
                onClick={() => selectEthnicity(eth.value)}
                className={`group relative shrink-0 overflow-hidden rounded-2xl transition-all duration-200 ${
                  selected
                    ? "ring-[3px] ring-pink-500 ring-offset-2 ring-offset-background scale-[1.02]"
                    : "ring-1 ring-white/10 hover:ring-white/30 hover:scale-[1.01]"
                }`}
                style={{ width: 160, height: 220 }}
              >
                {/* Background: gradient placeholder (replaced by image when uploaded) */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${eth.gradient} opacity-30 transition-opacity group-hover:opacity-50`}
                />
                {/* Image layer — shows when images are uploaded */}
                <Image
                  src={imagePath}
                  alt={eth.label}
                  fill
                  className="object-cover opacity-0 transition-opacity duration-300 [&[data-loaded=true]]:opacity-100"
                  sizes="160px"
                  onLoad={(e) =>
                    (e.currentTarget as HTMLImageElement).setAttribute(
                      "data-loaded",
                      "true",
                    )
                  }
                  onError={(e) =>
                    (e.currentTarget as HTMLImageElement).style.display = "none"
                  }
                />
                {/* Emoji fallback (visible when no image) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl drop-shadow-lg">{eth.emoji}</span>
                </div>
                {/* Label bar */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                  <span className="text-sm font-bold text-white">
                    {eth.label}
                  </span>
                </div>
                {/* Check badge */}
                {selected && (
                  <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-xs text-white shadow-lg">
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section: Age ── */}
      <section>
        <SectionHeader number={2} title="Age" subtitle="Select a range" />
        <div className="mt-4 flex flex-wrap gap-3">
          {AGE_CATEGORIES.map((age) => {
            const selected = draft.ageCategory === age.value;
            return (
              <button
                key={age.value}
                onClick={() => selectAge(age.value)}
                className={`flex flex-col items-center rounded-xl px-5 py-3.5 transition-all duration-200 ${
                  selected
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/25"
                    : "bg-white/[0.06] text-white/70 ring-1 ring-white/10 hover:bg-white/[0.12] hover:text-white"
                }`}
              >
                <span className="text-sm font-semibold">{age.label}</span>
                <span
                  className={`mt-0.5 text-xs ${selected ? "text-white/80" : "text-white/40"}`}
                >
                  {age.sub}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section: Body Type ── */}
      <section>
        <SectionHeader
          number={3}
          title="Body Type"
          subtitle="Pick her build"
        />
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {BODY_TYPES.map((body) => {
            const selected = draft.bodyType === body.value;
            return (
              <button
                key={body.value}
                onClick={() => selectBody(body.value)}
                className={`group flex shrink-0 flex-col items-center gap-2 rounded-2xl px-5 py-5 transition-all duration-200 ${
                  selected
                    ? "bg-gradient-to-b from-pink-500/20 to-purple-500/20 ring-[3px] ring-pink-500 ring-offset-2 ring-offset-background"
                    : "bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.12] hover:ring-white/30"
                }`}
                style={{ width: 120, height: 140 }}
              >
                <span className="text-3xl transition-transform duration-200 group-hover:scale-110">
                  {body.icon}
                </span>
                <span
                  className={`text-center text-xs font-semibold leading-tight ${
                    selected ? "text-pink-300" : "text-white/70"
                  }`}
                >
                  {body.label}
                </span>
                {selected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] text-white">
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── Section Header ──
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
