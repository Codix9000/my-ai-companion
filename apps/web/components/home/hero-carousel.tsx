"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Banner {
  _id: string;
  title?: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
}

interface HeroCarouselProps {
  banners: Banner[];
}

export default function HeroCarousel({ banners }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(goNext, 5000);
    return () => clearInterval(interval);
  }, [goNext, banners.length]);

  if (banners.length === 0) {
    // Placeholder when no banners exist
    return (
      <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-pink-600/30 via-purple-600/30 to-pink-600/30">
        <div className="flex h-48 items-center justify-center sm:h-56 lg:h-64">
          <div className="text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-pink-400" />
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              Welcome to Your AI Companion
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Discover & connect with AI characters
            </p>
          </div>
        </div>
      </div>
    );
  }

  const banner = banners[currentIndex];

  const inner = (
    <div className="relative w-full overflow-hidden rounded-2xl">
      {/* Banner Image */}
      <div className="relative h-48 w-full sm:h-56 lg:h-64">
        <Image
          src={banner?.imageUrl || ""}
          alt={banner?.title || "Promo banner"}
          fill
          className="object-cover"
          priority
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Text overlay */}
        {(banner?.title || banner?.subtitle) && (
          <div className="absolute bottom-4 left-4 right-16 z-10">
            {banner.title && (
              <h2 className="text-lg font-bold text-white drop-shadow-lg sm:text-2xl lg:text-3xl">
                {banner.title}
              </h2>
            )}
            {banner.subtitle && (
              <p className="mt-1 text-xs text-white/80 drop-shadow sm:text-sm">
                {banner.subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (banner?.linkUrl) {
    return <Link href={banner.linkUrl}>{inner}</Link>;
  }
  return inner;
}
