'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Search, Shield, Clock, BookOpen,
  Atom, History, Brain, TreePine, Heart, Calculator,
  Globe, Lightbulb, Palette, Users, Scale, Microscope
} from 'lucide-react'
import { getCategoryById, getArticlesByCategory, type KnowledgeArticle } from '@/lib/knowledge-data'

// Icon mapping
const iconMap: { [key: string]: React.ElementType } = {
  Atom, History, Brain, TreePine, Heart, Calculator,
  Globe, Lightbulb, Palette, Users, Scale, Microscope
}

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const categoryId = params.id as string

  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const category = getCategoryById(categoryId)
  const allArticles = getArticlesByCategory(categoryId)

  // Filter articles by search
  const articles = allArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.summary.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!mounted) return null

  if (!category) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  const IconComponent = iconMap[category.icon] || BookOpen

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Link href="/" className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-500" />
                <span className="font-semibold">Knowledge</span>
              </Link>
            </div>

            {/* Search */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search in category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg
                         text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Category Hero */}
      <section className="py-16 px-6 border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-6"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <IconComponent className="w-10 h-10" style={{ color: category.color }} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-3">{category.name}</h1>
              <p className="text-lg text-gray-400 mb-4 max-w-2xl">{category.description}</p>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span>{articles.length} articles</span>
                <span>•</span>
                <span>All verified & sourced</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {articles.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No articles found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/article/${article.slug}`}
                    className="block p-6 bg-gray-900/30 border border-gray-800 rounded-2xl
                             hover:border-blue-500/50 hover:bg-gray-900/50 transition-all duration-300 h-full"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {article.title}
                      </h2>
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-full shrink-0 ml-4">
                        <Shield className="w-3 h-3 text-green-500" />
                        <span className="text-xs font-medium text-green-500">{article.truthScore}%</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                      {article.summary}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime} min
                        </span>
                        <span>{article.sources} sources</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {article.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-600">
            Galion Knowledge - The Library of Truth
          </p>
        </div>
      </footer>
    </div>
  )
}
