import fs from "fs"
import matter from "gray-matter"
import path from "path"
import dayjs from "dayjs"
import { remark } from "remark"
import html from "remark-html"

import type { ArticleItem } from "@/types"

const articlesDirectory = path.join(process.cwd(), "articles")

export const getSortedArticles = (): ArticleItem[] => {
  const fileNames = fs.readdirSync(articlesDirectory)

  const allArticlesData = fileNames.map((fileName) => {
    const id = fileName.replace(/\.md$/, "")
    const fullPath = path.join(articlesDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, "utf-8")
    const matterResult = matter(fileContents)
    
    return {
      id,
      title: matterResult.data.title,
      date: matterResult.data.date,
      category: matterResult.data.category,
    }
  })

  return allArticlesData.sort((a, b) => {
    const dateOne = dayjs(a.date, 'MM-DD-YYYY')
    const dateTwo = dayjs(b.date, 'MM-DD-YYYY')
    if (dateOne.isBefore(dateTwo)) {
      return -1
    } else if (dateTwo.isAfter(dateOne)) {
      return 1
    } else {
      return 0
    }
  })
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
  const fullPath = path.join(articlesDirectory, `${id}.md`)
  const fileContents = fs.readFileSync(fullPath, "utf-8")
  const matterResult = matter(fileContents)
  const processedContent = await remark().use(html).process(matterResult.content)
  const contentHtml = processedContent.toString()

  return {
    id,
    contentHtml,
    title: matterResult.data.title,
    category: matterResult.data.category,
    date: matterResult.data.date
  }
}