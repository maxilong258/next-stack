import fs from "fs"
import matter from "gray-matter"
import path from "path"
import dayjs from "dayjs"
import { notFound } from "next/navigation"
import { remark } from "remark"
import remarkMath from "remark-math"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypeKatex from "rehype-katex"
import rehypeStringify from "rehype-stringify"

import type { ArticleItem } from "@/types"

const articlesDirectory = path.join(process.cwd(), "articles")
const SAFE_SLUG = /^[a-z0-9-]+$/

const isValidSlug = (id: string): boolean => {
  if (!SAFE_SLUG.test(id)) return false

  const fullPath = path.resolve(articlesDirectory, `${id}.md`)
  return fullPath.startsWith(articlesDirectory + path.sep) && fs.existsSync(fullPath)
}

const getArticleFileNames = (): string[] => {
  return fs.readdirSync(articlesDirectory).filter((fileName) => fileName.endsWith(".md"))
}

export const getArticleIds = (): string[] => {
  return getArticleFileNames().map((fileName) => fileName.replace(/\.md$/, ""))
}

export const getSortedArticles = (): ArticleItem[] => {
  const allArticlesData = getArticleFileNames().map((fileName) => {
    const id = fileName.replace(/\.md$/, "")
    const fullPath = path.join(articlesDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, "utf-8")
    const matterResult = matter(fileContents)

    return {
      id,
      title: matterResult.data.title,
      date: matterResult.data.date,
      category: matterResult.data.category,
      description: matterResult.data.description,
    }
  })

  return allArticlesData.sort(
    (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
  )
}

export const getAllCategories = (): { name: string; count: number }[] => {
  const categorisedArticles = getCategorisedArticles()
  return Object.keys(categorisedArticles).map((category) => ({
    name: category,
    count: categorisedArticles[category].length
  }))
}

export const getArticlesByCategory = (category: string): ArticleItem[] => {
  const categorisedArticles = getCategorisedArticles()
  return categorisedArticles[category] || []
}


export const getCategorisedArticles = (): Record<string, ArticleItem[]> => {
  const sortedArticles = getSortedArticles()
  const categorisedArticles: Record<string, ArticleItem[]> = {}

  sortedArticles.forEach((article) => {
    if (!categorisedArticles[article.category]) {
      categorisedArticles[article.category] = []
    }
    categorisedArticles[article.category].push(article)
  })

  return categorisedArticles
}

export const getArticleData = async (id: string) => {
  if (!isValidSlug(id)) {
    notFound()
  }

  const fullPath = path.join(articlesDirectory, `${id}.md`)
  const fileContents = fs.readFileSync(fullPath, "utf-8")
  const matterResult = matter(fileContents)
  const processedContent = await remark()
    .use(remarkMath)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(matterResult.content)
  const contentHtml = processedContent.toString()

  return {
    id,
    contentHtml,
    title: matterResult.data.title,
    category: matterResult.data.category,
    date: matterResult.data.date,
    description: matterResult.data.description,
  }
}
