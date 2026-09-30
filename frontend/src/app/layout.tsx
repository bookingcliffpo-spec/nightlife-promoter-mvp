import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cliff Free Motion Studio",
  description: "Free browser-based flyer and photo motion video creator. No login, API key, or generation credits."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
