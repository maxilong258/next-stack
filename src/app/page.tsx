import { getSortedArticles, getAllCategories } from "@/lib/articles";
import Link from "next/link";

export default function Home() {
  const articles = getSortedArticles();
  const categories = getAllCategories();
  console.log(categories);

  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      <section className="mt-20 flex flex-col gap-16 mb-20">
        <header>
          <h3 className="text-5xl font-semibold leading-tight text-gray-900 dark:text-gray-100">
            NextStack
          </h3>
          <p className="text-xl text-gray-500">
            Pure thoughts, simple stories.
          </p>
        </header>

        <section>
          {articles !== null &&
            articles.map((article) => (
              <Link
                key={article.id}
                className="flex cursor-pointer flex-col justify-between rounded-lg py-2.5 transition-all active:scale-[0.995] active:bg-gray-200 
                    sm:flex-row sm:items-center sm:px-2 hover:bg-gray-100 dark:hover:bg-[#1e1f21]"
                href={`/${article.id}`}
                title={article.title}
              >
                <span className="shrink-0 mr-2">[{article.category}]</span>
                <span className="shrink-0">{article.title}</span>
                <span className="mx-8 hidden h-px w-full grow border-t border-dashed border-gray-300 dark:border-gray-700 sm:flex" />
                <span className="shrink-0 text-gray-400 dark:text-gray-600">
                  {article.date}
                </span>
              </Link>
            ))}
        </section>

        <section className="mb-16">
          <ul className="flex flex-wrap gap-2 text-base">
            {categories.map(({ name, count }) => (
              <li
                key={name}
                className="block cursor-pointer rounded-full bg-gray-200 px-4 py-2 text-gray-600 transition-all hover:bg-gray-300 
                    hover:text-gray-900 dark:bg-[#1e1f21] dark:text-gray-400 dark:hover:text-gray-200"
              >
                {name}
                <sup className="text-[10px] text-gray-500 dark:text-gray-400 ml-1">
                  {count}
                </sup>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </div>
  );
}
