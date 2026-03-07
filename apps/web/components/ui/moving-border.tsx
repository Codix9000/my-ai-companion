"use client";

import React from "react";
import { cn } from "@repo/ui/src/utils";

export function MovingBorder({
  children,
  className,
  containerClassName,
  borderColor = "from-pink-500 via-purple-500 to-pink-500",
  borderWidth = 2,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  borderColor?: string;
  borderWidth?: number;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl p-px",
        containerClassName,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-2xl animate-spin-border",
          "bg-[conic-gradient(from_var(--border-angle),transparent_20%,theme(colors.pink.500)_40%,theme(colors.purple.500)_60%,transparent_80%)]",
        )}
        style={
          {
            "--border-angle": "0deg",
          } as React.CSSProperties
        }
      />
      <div
        className={cn(
          "relative rounded-2xl bg-[#0a0a0f]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
