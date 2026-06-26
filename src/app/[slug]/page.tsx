import type { Metadata } from "next"
import Link from "next/link"
import { getArticleData, getArticleIds } from "@/lib/articles"
import { siteConfig } from "@/config/site"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const generateStaticParams = () => {
  return getArticleIds().map((slug) => ({ slug }))
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> => {
  const { slug } = await params
  const article = await getArticleData(slug)
  const description = article.description ?? siteConfig.description

  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
      type: "article",
      publishedTime: article.date,
    },
  }
}

const Article = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const articleData = await getArticleData(slug)

  return (
    <section className="mx-auto w-full max-w-5xl px-4 mt-20 flex flex-col gap-10">
      <div className="sticky top-0 z-10 py-4 bg-transparent">
        <Button variant="ghost" size="sm" className="gap-2 rounded-full bg-gray-200 !px-6 !py-5 text-gray-600 transition-all hover:bg-gray-300 
          hover:text-gray-900 dark:bg-[#1e1f21] dark:text-gray-400 dark:hover:text-gray-200" asChild>
          <Link href={"/"}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>
        </Button>
      </div>
      <article
        className="article"
        dangerouslySetInnerHTML={{ __html: articleData.contentHtml }}
      />
    </section>
  )
}

export default Article
