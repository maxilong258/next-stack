import Link from "next/link"
import { getArticleData } from "@/lib/articles"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

const Article = async ({ params }: { params: { slug: string } }) => {
  const articleData = await getArticleData(params.slug)

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
