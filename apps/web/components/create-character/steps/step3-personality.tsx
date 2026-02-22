"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { Search, X, Plus } from "lucide-react";
import type { CharacterDraft } from "../wizard";

// ── Data ──

const PERSONALITY_TRAITS = [
  { value: "bubbly", label: "Bubbly", icon: "🫧" },
  { value: "shy", label: "Shy", icon: "🙈" },
  { value: "confident", label: "Confident", icon: "💪" },
  { value: "playful", label: "Playful", icon: "😜" },
  { value: "dominant", label: "Dominant", icon: "👑" },
  { value: "submissive", label: "Submissive", icon: "🦋" },
  { value: "intellectual", label: "Intellectual", icon: "🧠" },
  { value: "nurturing", label: "Nurturing", icon: "🤱" },
  { value: "sassy", label: "Sassy", icon: "💅" },
  { value: "loyal", label: "Loyal", icon: "🤝" },
  { value: "adventurous", label: "Adventurous", icon: "🌍" },
  { value: "romantic", label: "Romantic", icon: "🌹" },
  { value: "teasing", label: "Teasing", icon: "😏" },
  { value: "mysterious", label: "Mysterious", icon: "🔮" },
  { value: "funny", label: "Funny", icon: "😂" },
  { value: "caring", label: "Caring", icon: "💕" },
  { value: "bold", label: "Bold", icon: "🔥" },
  { value: "gentle", label: "Gentle", icon: "🕊️" },
  { value: "wild", label: "Wild", icon: "🐆" },
  { value: "calm", label: "Calm", icon: "🧘" },
];

const KINK_TAGS = [
  { value: "light-tease", label: "Light Tease", icon: "😘" },
  { value: "romantic", label: "Romantic", icon: "💗" },
  { value: "explicit", label: "Explicit", icon: "🔞" },
  { value: "dominant-sub", label: "Dom / Sub", icon: "⛓️" },
  { value: "roleplay", label: "Roleplay", icon: "🎭" },
  { value: "lingerie", label: "Lingerie", icon: "👙" },
  { value: "public-tease", label: "Public Tease", icon: "🏙️" },
];

const RELATIONSHIP_STYLES = [
  { value: "casual-fling", label: "Casual Fling", icon: "🍸", desc: "No strings attached fun" },
  { value: "loving-girlfriend", label: "Loving Girlfriend", icon: "💑", desc: "Sweet & committed" },
  { value: "dominant-gf", label: "Dominant GF", icon: "👠", desc: "She takes the lead" },
  { value: "submissive", label: "Submissive", icon: "🎀", desc: "Eager to please" },
  { value: "friends-with-benefits", label: "Friends w/ Benefits", icon: "🤝", desc: "Best of both worlds" },
  { value: "long-distance", label: "Long-Distance", icon: "✈️", desc: "Always missing you" },
];

const OCCUPATIONS = [
  { value: "nurse", label: "Nurse", icon: "🩺" },
  { value: "gamer", label: "Gamer", icon: "🎮" },
  { value: "fitness-coach", label: "Fitness Coach", icon: "💪" },
  { value: "artist", label: "Artist", icon: "🎨" },
  { value: "office-lady", label: "Office Lady", icon: "💼" },
  { value: "college-student", label: "College Student", icon: "📚" },
  { value: "traveler", label: "Traveler", icon: "✈️" },
  { value: "model", label: "Model", icon: "📸" },
  { value: "chef", label: "Chef", icon: "👩‍🍳" },
  { value: "teacher", label: "Teacher", icon: "📖" },
  { value: "dancer", label: "Dancer", icon: "💃" },
  { value: "musician", label: "Musician", icon: "🎵" },
  { value: "streamer", label: "Streamer", icon: "📺" },
  { value: "barista", label: "Barista", icon: "☕" },
  { value: "photographer", label: "Photographer", icon: "📷" },
  { value: "yoga-instructor", label: "Yoga Instructor", icon: "🧘" },
  { value: "fashion-designer", label: "Fashion Designer", icon: "✂️" },
  { value: "bartender", label: "Bartender", icon: "🍹" },
  { value: "librarian", label: "Librarian", icon: "📕" },
  { value: "veterinarian", label: "Veterinarian", icon: "🐾" },
  { value: "journalist", label: "Journalist", icon: "📝" },
  { value: "scientist", label: "Scientist", icon: "🔬" },
  { value: "pilot", label: "Pilot", icon: "✈️" },
  { value: "lawyer", label: "Lawyer", icon: "⚖️" },
  { value: "influencer", label: "Influencer", icon: "📱" },
  { value: "cosplayer", label: "Cosplayer", icon: "🦸" },
  { value: "writer", label: "Writer", icon: "✍️" },
  { value: "singer", label: "Singer", icon: "🎤" },
  { value: "programmer", label: "Programmer", icon: "💻" },
  { value: "lifeguard", label: "Lifeguard", icon: "🏖️" },
  { value: "flight-attendant", label: "Flight Attendant", icon: "🛫" },
  { value: "cheerleader", label: "Cheerleader", icon: "📣" },
  { value: "actress", label: "Actress", icon: "🎬" },
  { value: "makeup-artist", label: "Makeup Artist", icon: "💄" },
  { value: "therapist", label: "Therapist", icon: "🧠" },
  { value: "entrepreneur", label: "Entrepreneur", icon: "🚀" },
  { value: "athlete", label: "Athlete", icon: "🏅" },
  { value: "dj", label: "DJ", icon: "🎧" },
  { value: "tattoo-artist", label: "Tattoo Artist", icon: "🖋️" },
  { value: "secret-agent", label: "Secret Agent", icon: "🕶️" },
  { value: "maid", label: "Maid", icon: "🧹" },
  { value: "princess", label: "Princess", icon: "👸" },
  { value: "witch", label: "Witch", icon: "🧙‍♀️" },
  { value: "detective", label: "Detective", icon: "🔍" },
  { value: "waitress", label: "Waitress", icon: "🍽️" },
  { value: "personal-trainer", label: "Personal Trainer", icon: "🏋️" },
  { value: "babysitter", label: "Babysitter", icon: "👶" },
  { value: "spa-therapist", label: "Spa Therapist", icon: "💆" },
  { value: "florist", label: "Florist", icon: "🌸" },
  { value: "astronaut", label: "Astronaut", icon: "🚀" },
];

const NSFW_LABELS = ["Soft", "Light", "Moderate", "Spicy", "Max"];

interface Props {
  draft: CharacterDraft;
  updateDraft: (updates: Partial<CharacterDraft>) => void;
}

export default function Step3Personality({ draft, updateDraft }: Props) {
  const [occupationSearch, setOccupationSearch] = useState("");
  const [showOccDropdown, setShowOccDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOccDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleTrait = useCallback(
    (value: string) => {
      const current = draft.personalityTraits;
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      updateDraft({ personalityTraits: next });
    },
    [draft.personalityTraits, updateDraft],
  );

  const toggleKink = useCallback(
    (value: string) => {
      const current = draft.kinks;
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      updateDraft({ kinks: next });
    },
    [draft.kinks, updateDraft],
  );

  const toggleOccupation = useCallback(
    (value: string) => {
      const current = draft.occupations;
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      updateDraft({ occupations: next });
    },
    [draft.occupations, updateDraft],
  );

  const addCustomOccupation = useCallback(() => {
    const trimmed = occupationSearch.trim();
    if (!trimmed) return;
    const slug = trimmed.toLowerCase().replace(/\s+/g, "-");
    if (!draft.occupations.includes(slug)) {
      updateDraft({ occupations: [...draft.occupations, slug], customOccupation: trimmed });
    }
    setOccupationSearch("");
    setShowOccDropdown(false);
  }, [occupationSearch, draft.occupations, updateDraft]);

  const filteredOccupations = OCCUPATIONS.filter(
    (o) =>
      o.label.toLowerCase().includes(occupationSearch.toLowerCase()) &&
      !draft.occupations.includes(o.value),
  );

  const nsfwLabel = NSFW_LABELS[Math.min(Math.floor(draft.nsfwIntensity / 25), 4)];

  return (
    <div className="space-y-10">
      {/* ── Personality Traits (multi-select chips) ── */}
      <section>
        <SectionHeader
          number={1}
          title="Personality Traits"
          subtitle={`Select 2 or more (${draft.personalityTraits.length} selected)`}
        />
        <div className="mt-4 flex flex-wrap gap-2.5">
          {PERSONALITY_TRAITS.map((trait) => {
            const selected = draft.personalityTraits.includes(trait.value);
            return (
              <button
                key={trait.value}
                onClick={() => toggleTrait(trait.value)}
                className={`group flex items-center gap-2 rounded-full px-4 py-2.5 transition-all duration-200 ${
                  selected
                    ? "bg-gradient-to-r from-pink-500/30 to-purple-500/30 ring-2 ring-pink-500 shadow-lg shadow-pink-500/10"
                    : "bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.12] hover:ring-white/25"
                }`}
              >
                <span className="text-base transition-transform group-hover:scale-110">
                  {trait.icon}
                </span>
                <span
                  className={`text-sm font-semibold ${selected ? "text-pink-200" : "text-white/60"}`}
                >
                  {trait.label}
                </span>
                {selected && (
                  <X className="ml-0.5 h-3.5 w-3.5 text-pink-300/60" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Kinks & Intimacy ── */}
      <section>
        <SectionHeader number={2} title="Kinks & Intimacy" subtitle="Toggle what she's into" />
        <div className="mt-4 flex flex-wrap gap-2.5">
          {KINK_TAGS.map((kink) => {
            const selected = draft.kinks.includes(kink.value);
            return (
              <button
                key={kink.value}
                onClick={() => toggleKink(kink.value)}
                className={`group flex items-center gap-2 rounded-xl px-4 py-3 transition-all duration-200 ${
                  selected
                    ? "bg-gradient-to-r from-rose-500/25 to-pink-500/25 ring-2 ring-rose-500"
                    : "bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.12]"
                }`}
              >
                <span className="text-lg">{kink.icon}</span>
                <span
                  className={`text-sm font-semibold ${selected ? "text-rose-200" : "text-white/60"}`}
                >
                  {kink.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* NSFW Intensity slider */}
        <div className="mt-6 space-y-3 rounded-xl bg-white/[0.04] p-5 ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white/70">NSFW Intensity</span>
            <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300">
              {nsfwLabel}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={draft.nsfwIntensity}
            onChange={(e) => updateDraft({ nsfwIntensity: Number(e.target.value) })}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-rose-500 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-rose-500/40"
          />
          <div className="flex justify-between text-[10px] text-white/25">
            <span>Soft</span>
            <span>Light</span>
            <span>Moderate</span>
            <span>Spicy</span>
            <span>Max</span>
          </div>
        </div>
      </section>

      {/* ── Relationship Style ── */}
      <section>
        <SectionHeader number={3} title="Relationship Style" subtitle="What kind of connection?" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {RELATIONSHIP_STYLES.map((rs) => {
            const selected = draft.relationshipStyle === rs.value;
            return (
              <button
                key={rs.value}
                onClick={() => updateDraft({ relationshipStyle: rs.value })}
                className={`group flex flex-col items-center gap-2 rounded-xl px-4 py-5 text-center transition-all duration-200 ${
                  selected
                    ? "bg-gradient-to-b from-pink-500/20 to-purple-500/20 ring-[3px] ring-pink-500 ring-offset-2 ring-offset-background shadow-lg shadow-pink-500/10"
                    : "bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.12] hover:ring-white/30"
                }`}
              >
                <span className="text-3xl transition-transform group-hover:scale-110">
                  {rs.icon}
                </span>
                <span
                  className={`text-sm font-bold ${selected ? "text-pink-200" : "text-white/70"}`}
                >
                  {rs.label}
                </span>
                <span className="text-[11px] text-white/30">{rs.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Occupation / Hobbies ── */}
      <section>
        <SectionHeader number={4} title="Occupation / Hobbies" subtitle="What does she do? Pick multiple or type your own" />

        {/* Search + dropdown */}
        <div ref={dropdownRef} className="relative mt-4">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10 focus-within:ring-pink-500/50">
            <Search className="h-4 w-4 shrink-0 text-white/30" />
            <input
              type="text"
              placeholder="Search or type custom occupation…"
              value={occupationSearch}
              onChange={(e) => {
                setOccupationSearch(e.target.value);
                setShowOccDropdown(true);
              }}
              onFocus={() => setShowOccDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filteredOccupations.length > 0) {
                    toggleOccupation(filteredOccupations[0]!.value);
                    setOccupationSearch("");
                    setShowOccDropdown(false);
                  } else if (occupationSearch.trim()) {
                    addCustomOccupation();
                  }
                }
              }}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            {occupationSearch && (
              <button onClick={() => { setOccupationSearch(""); setShowOccDropdown(false); }}>
                <X className="h-4 w-4 text-white/30 hover:text-white/60" />
              </button>
            )}
          </div>

          {showOccDropdown && (occupationSearch || filteredOccupations.length > 0) && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-background/95 p-2 shadow-2xl backdrop-blur-xl">
              {filteredOccupations.slice(0, 12).map((occ) => (
                <button
                  key={occ.value}
                  onClick={() => {
                    toggleOccupation(occ.value);
                    setOccupationSearch("");
                    setShowOccDropdown(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.08]"
                >
                  <span className="text-lg">{occ.icon}</span>
                  <span className="text-sm font-medium text-white/70">{occ.label}</span>
                </button>
              ))}
              {occupationSearch.trim() && !filteredOccupations.some((o) => o.label.toLowerCase() === occupationSearch.trim().toLowerCase()) && (
                <button
                  onClick={addCustomOccupation}
                  className="flex w-full items-center gap-3 rounded-lg border-t border-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.08]"
                >
                  <Plus className="h-4 w-4 text-pink-400" />
                  <span className="text-sm font-medium text-pink-300">
                    Add &ldquo;{occupationSearch.trim()}&rdquo;
                  </span>
                </button>
              )}
              {filteredOccupations.length === 0 && !occupationSearch.trim() && (
                <p className="px-3 py-2 text-xs text-white/30">No more occupations to show</p>
              )}
            </div>
          )}
        </div>

        {/* Selected occupations */}
        {draft.occupations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {draft.occupations.map((val) => {
              const found = OCCUPATIONS.find((o) => o.value === val);
              const label = found ? found.label : val.replace(/-/g, " ");
              const icon = found ? found.icon : "✨";
              return (
                <button
                  key={val}
                  onClick={() => toggleOccupation(val)}
                  className="group flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-2 ring-1 ring-emerald-500/30 transition-all hover:bg-red-500/20 hover:ring-red-500/30"
                >
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-semibold text-emerald-300 capitalize group-hover:text-red-300">
                    {label}
                  </span>
                  <X className="h-3 w-3 text-emerald-300/40 group-hover:text-red-300" />
                </button>
              );
            })}
          </div>
        )}

        {/* Quick-add popular grid */}
        <div className="mt-4">
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-white/25">
            Popular picks
          </p>
          <div className="flex flex-wrap gap-2">
            {OCCUPATIONS.slice(0, 16).map((occ) => {
              const selected = draft.occupations.includes(occ.value);
              if (selected) return null;
              return (
                <button
                  key={occ.value}
                  onClick={() => toggleOccupation(occ.value)}
                  className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/40 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.1] hover:text-white/60"
                >
                  <span>{occ.icon}</span>
                  {occ.label}
                </button>
              );
            })}
          </div>
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
