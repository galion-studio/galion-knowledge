'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, Clock, ArrowRight, Shuffle } from 'lucide-react'
import { getFeaturedArticles, getRandomArticle, categories } from '@/lib/knowledge-data'
import { useRouter } from 'next/navigation'

export default function FeaturedArticles() {
  const router = useRouter()
  const featured = getFeaturedArticles(6)

  const handleRandomArticle = () => {
    const random = getRandomArticle()
    router.push(`/article/${random.slug}`)
  }

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h2 className="text-3xl font-bold mb-2">Featured Knowledge</h2>
            <p className="text-gray-500">Highly verified articles across all categories</p>
          </div>
          <button
            onClick={handleRandomArticle}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700
                     rounded-full text-sm transition-colors"
          >
            <Shuffle className="w-4 h-4" />
            <span className="hidden sm:inline">Random Article</span>
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((article, index) => {
            const category = categories.find(c => c.id === article.category)
            return (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={`/article/${article.slug}`}
                  className="group block p-6 bg-gray-900/30 border border-gray-800 rounded-2xl
                           hover:border-blue-500/50 hover:bg-gray-900/50 transition-all duration-300 h-full"
                >
                  {/* Category & Truth Score */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: `${category?.color}20`,
                        color: category?.color
                      }}
                    >
                      {category?.name}
                    </span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-full">
                      <Shield className="w-3 h-3 text-green-500" />
                      <span className="text-xs font-medium text-green-500">{article.truthScore}%</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-blue-400 transition-colors">
                    {article.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                    {article.summary}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readTime} min
                      </span>
                      <span>{article.sources} sources</span>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                  </div>
                </Link>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
