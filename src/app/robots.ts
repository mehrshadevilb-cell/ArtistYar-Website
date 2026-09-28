import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

  // Private app surfaces — never index
  const privatePaths = [
    "/admin/",
    "/panel/",
    "/api/",
    "/login",
    "/register",
    "/learn",
    "/files",
    "/projects",
    "/my-artistyar",
    "/profile",
    "/practice",
  ];

  // Public marketing + educational surfaces preferred for AI citation / search bots
  const aiAllow = [
    "/",
    "/assistant",
    "/ai",
    "/ai-music",
    "/music-analyzer",
    "/courses",
    "/amoozesh-tanzim-mix-mastering",
    "/about",
    "/gallery",
    "/free-player",
    "/online",
    "/arrangement",
    "/studio",
    "/separate",
    "/hitnevis",
    "/faq",
    "/contact",
    "/plugins",
    "/llms.txt",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      // AI search / citation bots
      {
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
        ],
        allow: aiAllow,
        disallow: privatePaths,
      },
      // Training crawlers
      {
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "Claude-Web",
          "anthropic-ai",
          "cohere-ai",
          "Bytespider",
          "CCBot",
        ],
        allow: aiAllow,
        disallow: privatePaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
