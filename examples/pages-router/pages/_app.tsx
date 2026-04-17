import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>tsproxy marketplace — Pages Router</title>
        <meta
          name="description"
          content="Faceted product search over an embedded tsproxy handler."
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
