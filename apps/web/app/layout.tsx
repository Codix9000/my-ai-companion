import "./globals.css";
import cx from "classnames";
import { calSans, inter } from "./fonts";
import { Providers } from "./providers";
import NavBar from "./navbar";
import { constructMetadata } from "./lib/utils";
import Footer from "./footer";
import TabsController from "./tabs-controller";
import { Suspense } from "react";
import Spinner from "@repo/ui/src/components/spinner";
import dynamic from "next/dynamic";
import type { Viewport } from "next";

export const metadata = constructMetadata();
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
const Pageview = dynamic(() => import("./pageview"), {
  ssr: false,
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning={true} lang="en">
      <body className={cx(calSans.variable, inter.variable)}>
        <Suspense fallback={<Spinner />}>
          <Providers>
            <NavBar />
            <main className="flex w-full pt-16 font-default lg:pt-16">
              <TabsController />
              <div className="flex-1">
                {children}
              </div>
              <Pageview />
            </main>
            <Footer />
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
