import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Occasion — event planner",
  description:
    "Plan a wedding, birthday or community event: a budget split, a timeline that counts back from the day, a vendor checklist and ideas made for your event.",
};

export const viewport: Viewport = {
  themeColor: "#f5efe4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to planner
        </a>
        <header className={styles.header}>
          <span className={styles.logo}>Occasion</span>
          <span className={styles.tag}>Weddings, birthdays and community events</span>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
