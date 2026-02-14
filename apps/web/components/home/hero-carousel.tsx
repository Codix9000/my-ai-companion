"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (banners.length > 1) {
      timerRef.current = setInterval(() => {
        setSlideDirection("left");
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 5000);
    }
  }, [banners.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    resetTimer();
  }, [banners.length, resetTimer]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    resetTimer();
  }, [banners.length, resetTimer]);

  // Auto-advance
  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  if (banners.length === 0) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-pink-600/30 via-purple-600/30 to-pink-600/30">
        <div className="flex h-32 items-center justify-center sm:h-40 lg:h-48">
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

  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      {/* Slide track — all banners side by side, translateX to slide */}
      <div
        className="flex transition-transform duration-600 ease-in-out"
        style={{
          width: `${banners.length * 100}%`,
          transform: `translateX(-${(currentIndex * 100) / banners.length}%)`,
          transitionDuration: "600ms",
        }}
      >
        {banners.map((banner, i) => (
          <div
            key={banner._id}
            className="relative w-full shrink-0"
            style={{ width: `${100 / banners.length}%` }}
          >
            {banner.linkUrl ? (
              <Link href={banner.linkUrl} className="block">
                <BannerSlide banner={banner} priority={i === 0} />
              </Link>
            ) : (
              <BannerSlide banner={banner} priority={i === 0} />
            )}
          </div>
        ))}
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
            className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentIndex(i);
                resetTimer();
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
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
}

function BannerSlide({ banner, priority }: { banner: Banner; priority: boolean }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: "4 / 1" }}>
      <Image
        src={banner.imageUrl}
        alt={banner.title || "Promo banner"}
        fill
        className="object-cover"
        priority={priority}
        sizes="100vw"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Text overlay */}
      {(banner.title || banner.subtitle) && (
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
  );
}
