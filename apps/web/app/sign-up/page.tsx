"use client";
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex h-[100vh] w-full flex-col justify-self-start">
      <div className="flex h-full w-full items-start justify-center py-32">
        <SignUp />
      </div>
    </div>
  );
}
