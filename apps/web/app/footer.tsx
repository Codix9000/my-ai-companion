"use client";
import { Button } from "@repo/ui/src/components";
import { Github } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ href, children }) => (
  <Link
    href={href}
    className="text-muted-foreground duration-200 hover:opacity-50"
  >
    <Button variant="ghost">{children}</Button>
  </Link>
);

export default function Footer() {
  const pathname = usePathname();
  const showFooter =
    pathname === "/" ||
    pathname === "/vip" ||
    pathname === "/safety" ||
    pathname === "/dmca";
  if (!showFooter) return null;
  return (
    <footer className="flex max-w-xs items-center justify-center overflow-x-hidden px-6 py-4 text-xs md:max-w-full 2xl:px-0">
      <div className="flex w-full flex-col items-center gap-8">
        <div className="flex flex-col gap-8 sm:flex-row xl:gap-24">
          <div className="flex gap-8">
            <FooterLink href="/">
              © {new Date().getFullYear()} Empty Canvas, Inc.
            </FooterLink>
            <FooterLink href="/github">GitHub</FooterLink>
            <FooterLink href="/docs">Docs</FooterLink>
            <FooterLink href="/privacy.html">Privacy</FooterLink>
            <FooterLink href="/terms.html">Terms</FooterLink>
            <FooterLink href="/crystal/terms">Crystal Terms</FooterLink>
            <FooterLink href="/content-rules">Safety</FooterLink>
            <FooterLink href="/dmca">DMCA</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
