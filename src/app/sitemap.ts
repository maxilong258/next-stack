import type { MetadataRoute } from "next"
import { getSortedArticles } from "@/lib/articles"
import { siteConfig } from "@/config/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getSortedArticles()

  return [
    {
      url: siteConfig.url,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...articles.map((article) => ({
      url: `${siteConfig.url}/${article.id}`,
      lastModified: article.date,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ]
}
