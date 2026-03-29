import { Newsreader } from "next/font/google";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});

export const metadata = {
  title: "The Home Reset",
  description: "ADHD-friendly daily & weekly cleaning checklist",
  manifest: "/manifest.json",
  themeColor: "#5B7A5E",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Home Reset",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={newsreader.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
