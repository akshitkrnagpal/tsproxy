import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: <strong>tsproxy</strong>,
  project: {
    link: "https://github.com/akshitkrnagpal/typesense-proxy",
  },
  docsRepositoryBase:
    "https://github.com/akshitkrnagpal/typesense-proxy/tree/main/apps/docs/pages",
  footer: {
    text: `MIT ${new Date().getFullYear()} © tsproxy`,
  },
  editLink: {
    text: "Edit this page on GitHub →",
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s – tsproxy",
    };
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        name="description"
        content="A search proxy for Typesense with caching, rate limiting, and headless React components."
      />
    </>
  ),
};

export default config;
