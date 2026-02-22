"use client";

import { useCallback, useMemo, useState } from "react";
import { Sparkles, Volume2 } from "lucide-react";
import type { CharacterDraft } from "../wizard";

// ── Name suggestions keyed by ethnicity ──

const NAME_POOL: Record<string, string[]> = {
  asian: [
    "Aiko", "Yuki", "Mei", "Hana", "Suki", "Rina", "Sakura", "Mika",
    "Nari", "Jia", "Yuna", "Kaya", "Sora", "Amaya", "Lina", "Miko",
    "Rei", "Akemi", "Kohana", "Natsuki",
  ],
  white: [
    "Emma", "Sophie", "Chloe", "Mia", "Lily", "Ava", "Grace", "Olivia",
    "Isla", "Ruby", "Ivy", "Elara", "Nora", "Sienna", "Willow", "Clara",
    "Violet", "Stella", "Aurora", "Freya",
  ],
  black: [
    "Zara", "Nia", "Amara", "Imani", "Kira", "Aaliyah", "Jade", "Sade",
    "Ebony", "Naomi", "Kai", "Alaya", "Nyla", "Zariah", "Sage", "Aniya",
    "Myla", "Ari", "Tiana", "Serena",
  ],
  latina: [
    "Luna", "Valentina", "Isabella", "Camila", "Sofia", "Rosa", "Carmen",
    "Lucia", "Elena", "Marisol", "Paloma", "Catalina", "Dulce", "Estrella",
    "Alma", "Selena", "Xiomara", "Bianca", "Daniela", "Natalia",
  ],
};

const FALLBACK_NAMES = NAME_POOL["white"]!;

// ── Backstory templates (dynamic based on draft) ──

function getBackstoryTemplates(draft: CharacterDraft): { label: string; text: string }[] {
  const name = draft.characterName || "She";
  const occ = draft.occupations[0]?.replace(/-/g, " ") || draft.customOccupation || null;
  const age = draft.ageCategory?.replace(/-/g, " ") || "";
  const traits = draft.personalityTraits.slice(0, 2).join(" and ") || "charming";
  const rel = draft.relationshipStyle?.replace(/-/g, " ") || "";

  return [
    {
      label: "College sweetheart",
      text: `${name} is a ${age || "young"} college student who spends her days between lectures and late-night study sessions. ${traits ? `She's ${traits}` : ""} and loves spontaneous adventures — hiking on weekends, trying new coffee shops, and staying up way too late texting.${occ ? ` She dreams of becoming a ${occ} one day.` : ""}`,
    },
    {
      label: "Career-driven & flirty",
      text: `${name} is a ${occ || "driven professional"} in her ${age || "mid-20s"} who works hard and plays harder. She's ${traits} with a weakness for rooftop bars and weekend getaways.${rel ? ` She's looking for a ${rel} kind of connection.` : ""} Don't let the serious exterior fool you — she's full of surprises behind closed doors.`,
    },
    {
      label: "Free spirit",
      text: `${name} is a free-spirited ${occ || "traveler"} who lives for sunsets, spontaneous road trips, and deep conversations at 2 AM. She's ${traits} and has a talent for making everyone around her feel special.${rel ? ` She's into the ${rel} vibe` : ""} — no drama, just good energy and real connection.`,
    },
    {
      label: "Girl next door",
      text: `${name} is the ${traits} girl next door you've always noticed but never talked to. She's ${age || "in her early 20s"}, ${occ ? `works as a ${occ}` : "still figuring life out"}, and spends her free time binge-watching shows, baking, and scrolling TikTok at 3 AM. She's looking for someone who can make her laugh and keep things interesting.`,
    },
    {
      label: "Mysterious & seductive",
      text: `Not much is known about ${name} — and she likes it that way. She's ${traits}, ${age || "mature beyond her years"}, and carries an air of mystery that draws people in. ${occ ? `By day she's a ${occ}, but by night` : "By night"} she transforms into someone completely different.${rel ? ` She wants a ${rel} dynamic` : ""} — on her terms.`,
    },
  ];
}

interface Props {
  draft: CharacterDraft;
  updateDraft: (updates: Partial<CharacterDraft>) => void;
}

export default function Step4NameStory({ draft, updateDraft }: Props) {
  const [activeTemplate, setActiveTemplate] = useState<number | null>(null);

  const suggestedNames = useMemo(() => {
    const pool = NAME_POOL[draft.ethnicity || ""] || FALLBACK_NAMES;
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 20);
  }, [draft.ethnicity]);

  const backstoryTemplates = useMemo(() => getBackstoryTemplates(draft), [
    draft.characterName,
    draft.occupations,
    draft.ageCategory,
    draft.personalityTraits,
    draft.relationshipStyle,
    draft.customOccupation,
  ]);

  const selectName = useCallback(
    (name: string) => updateDraft({ characterName: name }),
    [updateDraft],
  );

  const applyTemplate = useCallback(
    (idx: number) => {
      setActiveTemplate(idx);
      updateDraft({ backstory: backstoryTemplates[idx]!.text });
    },
    [backstoryTemplates, updateDraft],
  );

  const charCount = draft.backstory.length;

  return (
    <div className="space-y-10">
      {/* ── Name ── */}
      <section>
        <SectionHeader number={1} title="Her Name" subtitle="Type a name or pick a suggestion" />

        <div className="mt-4">
          <input
            type="text"
            value={draft.characterName}
            onChange={(e) => updateDraft({ characterName: e.target.value })}
            placeholder="Enter her name…"
            maxLength={30}
            className="w-full rounded-xl border-0 bg-white/[0.06] px-5 py-4 text-lg font-semibold text-white placeholder:text-white/25 ring-1 ring-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <div className="mt-1.5 flex items-center justify-between px-1">
            <span className="text-[11px] text-white/25">
              {draft.characterName.length}/30
            </span>
            {draft.characterName.length >= 2 && (
              <span className="text-[11px] text-emerald-400">Looks good</span>
            )}
          </div>
        </div>

        {/* AI-suggested names */}
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-pink-400" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/30">
              Suggested {draft.ethnicity ? `${draft.ethnicity} names` : "names"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedNames.map((name) => {
              const selected = draft.characterName === name;
              return (
                <button
                  key={name}
                  onClick={() => selectName(name)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    selected
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/25"
                      : "bg-white/[0.06] text-white/50 ring-1 ring-white/10 hover:bg-white/[0.12] hover:text-white/80"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Backstory ── */}
      <section>
        <SectionHeader number={2} title="Backstory" subtitle="Write her story or use a template to get started" />

        {/* Templates */}
        <div className="mt-4 flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
          {backstoryTemplates.map((tpl, idx) => {
            const active = activeTemplate === idx;
            return (
              <button
                key={idx}
                onClick={() => applyTemplate(idx)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-200 ring-2 ring-pink-500"
                    : "bg-white/[0.06] text-white/40 ring-1 ring-white/10 hover:bg-white/[0.1] hover:text-white/60"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                {tpl.label}
              </button>
            );
          })}
        </div>

        {/* Free-text box */}
        <div className="mt-4">
          <textarea
            value={draft.backstory}
            onChange={(e) => {
              updateDraft({ backstory: e.target.value });
              setActiveTemplate(null);
            }}
            placeholder={`Tell us about ${draft.characterName || "her"}… What's her story? What makes her unique?`}
            rows={6}
            maxLength={1000}
            className="w-full resize-none rounded-xl border-0 bg-white/[0.06] px-5 py-4 text-sm leading-relaxed text-white placeholder:text-white/25 ring-1 ring-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <div className="mt-1.5 flex items-center justify-between px-1">
            <span className={`text-[11px] ${charCount > 900 ? "text-amber-400" : "text-white/25"}`}>
              {charCount}/1000
            </span>
            {charCount > 0 && charCount <= 900 && (
              <span className="text-[11px] text-white/25">Great start — the more detail, the better she&apos;ll chat</span>
            )}
          </div>
        </div>
      </section>

      {/* ── Voice (Coming Soon) ── */}
      <section>
        <SectionHeader number={3} title="Voice" subtitle="Choose how she sounds" />
        <div className="mt-4 flex items-center gap-4 rounded-xl bg-white/[0.04] p-6 ring-1 ring-white/[0.06]">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
            <Volume2 className="h-6 w-6 text-white/20" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/50">Voice customization</p>
            <p className="mt-0.5 text-xs text-white/25">
              Pick her speaking style, accent, and tone — coming in a future update.
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-purple-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-300">
            Soon
          </span>
        </div>
      </section>
    </div>
  );
}

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
