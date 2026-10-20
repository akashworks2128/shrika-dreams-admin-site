import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const STRIP_EXTENSION_ATTRS = `(function(){var A="fdprocessedid";function c(n){if(n.nodeType!==1)return;n.removeAttribute(A);if(n.querySelectorAll){n.querySelectorAll("["+A+"]").forEach(function(e){e.removeAttribute(A)})}}c(document.documentElement);new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==="attributes"){m.target.removeAttribute(A)}else{m.addedNodes.forEach(c)}})}).observe(document.documentElement,{attributes:true,attributeFilter:[A],childList:true,subtree:true})})();`;

export const metadata: Metadata = {
  title: "Shrika Dreams Admin",
  description: "Shrika Dreams admin panel",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Browser extensions (autofill/password managers) inject fdprocessedid into
            buttons and inputs before React hydrates, causing a false hydration error. */}
        <Script id="strip-extension-attrs" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS }} />
        {children}
      </body>
    </html>
  );
}
