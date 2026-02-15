"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";
import {
  Sparkles,
  Pen,
  Copy,
  Heart,
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  Plus,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { useConvexAuth } from "convex/react";
import { SignIn, useUser } from "@clerk/nextjs";
import Spinner from "@repo/ui/src/components/spinner";

// ── Suggestion categories ──
const CATEGORIES = [
  { key: "outfit" as const, label: "Outfit" },
  { key: "action" as const, label: "Action" },
  { key: "pose" as const, label: "Pose" },
  { key: "accessories" as const, label: "Accessories" },
  { key: "scene" as const, label: "Scene" },
];

// ── Default placeholder suggestions (used when DB is empty) ──
const PLACEHOLDER_SUGGESTIONS: Record<string, { label: string; promptText: string }[]> = {
  outfit: [
    { label: "Bikini", promptText: "wearing a bikini" },
    { label: "Skirt", promptText: "wearing a short skirt" },
    { label: "Lingerie", promptText: "wearing lingerie" },
    { label: "Crop top", promptText: "wearing a crop top" },
    { label: "Leather", promptText: "wearing a leather outfit" },
    { label: "Mini-skirt", promptText: "wearing a mini-skirt" },
    { label: "Satin Robe", promptText: "wearing a satin robe" },
    { label: "Sundress", promptText: "wearing a sundress" },
  ],
  action: [
    { label: "Walking", promptText: "walking down a street" },
    { label: "Dancing", promptText: "dancing gracefully" },
    { label: "Sitting", promptText: "sitting comfortably" },
    { label: "Stretching", promptText: "stretching" },
    { label: "Leaning", promptText: "leaning against a wall" },
    { label: "Laying down", promptText: "laying down relaxed" },
  ],
  pose: [
    { label: "Standing", promptText: "standing with confidence" },
    { label: "Kneeling", promptText: "kneeling" },
    { label: "Side profile", promptText: "side profile view" },
    { label: "Looking back", promptText: "looking back over shoulder" },
    { label: "Arms up", promptText: "with arms raised above head" },
    { label: "Crossed legs", promptText: "with crossed legs" },
  ],
  accessories: [
    { label: "Sunglasses", promptText: "wearing sunglasses" },
    { label: "Necklace", promptText: "wearing an elegant necklace" },
    { label: "Hat", promptText: "wearing a stylish hat" },
    { label: "Earrings", promptText: "wearing dangling earrings" },
    { label: "Choker", promptText: "wearing a choker" },
    { label: "Bracelet", promptText: "wearing bracelets" },
  ],
  scene: [
    { label: "Beach", promptText: "at the beach with ocean in background" },
    { label: "Bedroom", promptText: "in a cozy bedroom" },
    { label: "City street", promptText: "on a city street" },
    { label: "Garden", promptText: "in a beautiful garden" },
    { label: "Pool", promptText: "by the pool" },
    { label: "Studio", promptText: "in a photo studio" },
  ],
};

// ── Number of images options ──
const IMAGE_COUNT_OPTIONS = [
  { count: 1, premium: false },
  { count: 4, premium: true },
  { count: 16, premium: true },
  { count: 32, premium: true },
  { count: 64, premium: true },
];

// ── Suggestion Thumbnail Card ──
function SuggestionCard({
  label,
  imageUrl,
  isSelected,
  onClick,
}: {
  label: string;
  imageUrl?: string | null;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex shrink-0 flex-col items-center gap-1.5 transition-transform hover:scale-105 ${
        isSelected ? "scale-105" : ""
      }`}
    >
      <div
        className={`relative h-[90px] w-[80px] overflow-hidden rounded-xl border-2 transition-colors ${
          isSelected
            ? "border-pink-500 shadow-lg shadow-pink-500/20"
            : "border-transparent hover:border-white/20"
        }`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={label}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-500/20">
            <span className="text-2xl text-white/30">
              {label[0]}
            </span>
          </div>
        )}
      </div>
      <span className="text-[11px] text-white/60">{label}</span>
    </button>
  );
}

// ── Main Page ──
export default function GenerateImagePage() {
  const params = useParams();
  const characterId = params.characterId as Id<"characters">;
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();

  const character = useQuery(api.characters.get, { id: characterId });
  const allSuggestions = useQuery(api.imageGeneration.getAllSuggestions);
  const generatedImages = useQuery(
    api.imageGeneration.getGeneratedImages,
    isAuthenticated ? { characterId } : "skip",
  );

  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]["key"]>("outfit");
  const [prompt, setPrompt] = useState("");
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [selectedCount, setSelectedCount] = useState(1);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Initialize prompt from character's imagePromptInstructions
  const defaultPrompt = (character as any)?.imagePromptInstructions || "";
  const displayPrompt = prompt || defaultPrompt || "Describe the image you want to generate...";

  // Get suggestions for active category (DB or placeholder)
  const currentSuggestions = useMemo(() => {
    const dbItems = allSuggestions ? allSuggestions[activeCategory] : undefined;
    if (dbItems && dbItems.length > 0) {
      return dbItems;
    }
    return (PLACEHOLDER_SUGGESTIONS[activeCategory] ?? []).map((s) => ({
      ...s,
      _id: s.label,
      category: activeCategory,
      imageUrl: null,
      imageStorageId: undefined,
      sortOrder: 0,
      _creationTime: 0,
    })) || [];
  }, [allSuggestions, activeCategory]);

  const handleSuggestionClick = (suggestion: { label: string; promptText: string }) => {
    setSelectedSuggestion(suggestion.label);
    setPrompt(suggestion.promptText);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt || defaultPrompt);
    toast.success("Prompt copied to clipboard");
  };

  const handleGenerate = () => {
    toast.info("Image generation coming soon! The API will be connected in the next update.");
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-[100vh] w-full items-start justify-center py-32">
        {!user && <SignIn />}
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* ══════════════════════════════════════════════════
          LEFT COLUMN — Generate Image
         ══════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
        {/* Title */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20">
            <Sparkles className="h-5 w-5 text-pink-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Generate Image</h1>
        </div>

        {/* Character card + prompt area */}
        <div className="mb-8 flex gap-5">
          {/* Character image card */}
          <div className="relative h-[180px] w-[150px] shrink-0 overflow-hidden rounded-xl">
            {character.cardImageUrl ? (
              <Image
                src={character.cardImageUrl}
                alt={character.name || "Character"}
                fill
                className="object-cover"
                sizes="150px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/30 to-purple-500/30">
                <span className="text-4xl text-white/40">
                  {character.name?.[0] || "?"}
                </span>
              </div>
            )}
            {/* Name overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-6">
              <p className="text-sm font-semibold text-white">{character.name}</p>
            </div>
          </div>

          {/* Prompt text area */}
          <div className="flex flex-1 flex-col">
            <div className="flex items-start gap-2">
              <button
                onClick={() => setIsEditingPrompt(true)}
                className="mt-0.5 shrink-0 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
              >
                <Pen className="h-4 w-4" />
              </button>
              <div className="flex-1">
                {isEditingPrompt ? (
                  <textarea
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[14px] leading-relaxed text-white/80 outline-none focus:border-pink-500/40"
                    style={{ boxShadow: "none" }}
                    rows={4}
                    value={prompt || defaultPrompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onBlur={() => setIsEditingPrompt(false)}
                    autoFocus
                  />
                ) : (
                  <p
                    className="cursor-text text-[14px] leading-relaxed text-white/60"
                    onClick={() => setIsEditingPrompt(true)}
                  >
                    {displayPrompt}
                  </p>
                )}
              </div>
            </div>
            {/* Copy button */}
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleCopyPrompt}
                className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Suggestions ── */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-6">
            <h3 className="text-[15px] font-bold text-white">Suggestions</h3>
            {/* Category tabs */}
            <div className="flex items-center gap-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setSelectedSuggestion(null);
                  }}
                  className={`text-[13px] transition-colors ${
                    activeCategory === cat.key
                      ? "font-semibold text-white underline decoration-pink-500 underline-offset-4"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suggestion thumbnails — horizontal scroll */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {currentSuggestions.map((suggestion: any) => (
              <SuggestionCard
                key={suggestion._id || suggestion.label}
                label={suggestion.label}
                imageUrl={suggestion.imageUrl}
                isSelected={selectedSuggestion === suggestion.label}
                onClick={() => handleSuggestionClick(suggestion)}
              />
            ))}
          </div>
        </div>

        {/* ── Number of images ── */}
        <div className="mb-8">
          <h3 className="mb-3 text-[15px] font-bold text-white">Number of images</h3>
          <div className="flex items-center gap-3">
            {IMAGE_COUNT_OPTIONS.map((opt) => (
              <button
                key={opt.count}
                onClick={() => !opt.premium && setSelectedCount(opt.count)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  selectedCount === opt.count
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/20"
                    : "bg-white/[0.06] text-white/50 hover:bg-white/[0.1]"
                }`}
              >
                {opt.count > 1 && (
                  <span className="text-white/40">
                    {opt.count <= 4 ? (
                      <Grid2x2 className="h-3.5 w-3.5" />
                    ) : opt.count <= 16 ? (
                      <Grid3x3 className="h-3.5 w-3.5" />
                    ) : opt.count <= 32 ? (
                      <LayoutGrid className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </span>
                )}
                {opt.count === 1 && <Sparkles className="h-3.5 w-3.5" />}
                {opt.count}
                {opt.premium && (
                  <Heart className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Generate Button ── */}
        <button
          onClick={handleGenerate}
          className="flex w-full max-w-[520px] items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-6 py-4 text-[15px] font-bold text-white shadow-xl shadow-purple-500/20 transition-all hover:shadow-2xl hover:shadow-purple-500/30"
        >
          <Sparkles className="h-5 w-5" />
          Generate Image
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          RIGHT COLUMN — Generated Images
         ══════════════════════════════════════════════════ */}
      <div className="hidden w-[400px] shrink-0 flex-col border-l border-white/[0.08] lg:flex">
        <div className="px-6 pt-8">
          <h2 className="text-xl font-bold text-white">Generated Images</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/35">
            Here, you can find your images. You can leave the page or start a new series while others are still loading.
          </p>
        </div>

        {/* Generated images grid */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {generatedImages === undefined ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-5 w-5" />
            </div>
          ) : generatedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-white/[0.06] p-5">
                <Sparkles className="h-8 w-8 text-white/20" />
              </div>
              <p className="mt-4 text-sm text-white/30">No images generated yet</p>
              <p className="mt-1 text-xs text-white/20">Your generated images will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {generatedImages.map((img: any) => (
                <div
                  key={img._id}
                  className="group relative cursor-pointer overflow-hidden rounded-xl bg-white/[0.04]"
                  style={{ aspectRatio: "3/4" }}
                  onClick={() => setLightboxImage(img.mediaUrl)}
                >
                  <Image
                    src={img.mediaUrl}
                    alt={img.prompt || "Generated image"}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    sizes="180px"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
            onClick={() => setLightboxImage(null)}
          >
            ✕
          </button>
          <div className="relative max-h-[85vh] max-w-[90vw]">
            <Image
              src={lightboxImage}
              alt="Full size"
              width={1024}
              height={1792}
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
