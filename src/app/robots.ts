import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/panel/", "/api/", "/login", "/register"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-Web",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
          "Bytespider",
          "CCBot",
          "anthropic-ai",
          "cohere-ai",
        ],
        allow: ["/", "/assistant", "/ai", "/ai-music", "/music-analyzer", "/courses", "/about", "/gallery", "/free-player", "/online", "/arrangement", "/studio", "/separate", "/hitnevis", "/faq", "/contact", "/llms.txt"],
        disallow: ["/admin/", "/panel/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
