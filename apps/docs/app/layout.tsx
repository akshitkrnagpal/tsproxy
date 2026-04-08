import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";

export const metadata = {
  title: {
    default: "tsproxy — Typesense Search Proxy",
    template: "%s — tsproxy",
  },
  description:
    "A search proxy framework for Typesense with caching, rate limiting, ingestion queue, and headless React components.",
  metadataBase: new URL("https://tsproxy.akshit.io"),
  openGraph: {
    title: "tsproxy — Typesense Search Proxy",
    description:
      "A search proxy framework for Typesense with caching, rate limiting, ingestion queue, and headless React components.",
    url: "https://tsproxy.akshit.io",
    siteName: "tsproxy",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "tsproxy — Typesense Search Proxy",
    description:
      "A search proxy framework for Typesense with caching, rate limiting, ingestion queue, and headless React components.",
  },
  alternates: {
    canonical: "https://tsproxy.akshit.io",
  },
};

const navbar = (
  <Navbar
    logo={<b>tsproxy</b>}
    projectLink="https://github.com/akshitkrnagpal/tsproxy"
  />
);

const footer = (
  <Footer>MIT {new Date().getFullYear()} © tsproxy</Footer>
);

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/akshitkrnagpal/tsproxy/tree/main/apps/docs/content"
          editLink="Edit this page on GitHub"
          footer={footer}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
