import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commerce Support Lab · Koreshield reference client",
  description:
    "A synthetic AI commerce-support workflow demonstrating input, private-context, and proposed-action protection with Koreshield.",
};

export const viewport: Viewport = { themeColor: "#f3f0e9" };

export default function RootLayout({ children }: LayoutProps<"/">): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
