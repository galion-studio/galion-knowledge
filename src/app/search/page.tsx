'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, Shield, Clock, BookOpen, Filter } from 'lucide-react'
import { searchArticles, categories, type KnowledgeArticle } from '@/lib/knowledge-data'

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''

  const [searchQuery, setSearchQuery] = useState(query)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const allResults = searchArticles(query)
  const results = selectedCategory
    ? allResults.filter(a => a.category === selectedCategory)
    : allResults

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
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

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl ml-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for knowledge..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl
                           text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Info */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">
            {query ? `Results for "${query}"` : 'Search Knowledge'}
          </h1>
          <p className="text-gray-500">
            {results.length} article{results.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter by Category
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors
                            ${!selectedCategory ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
                >
                  All Categories
                </button>
                {categories.map(cat => {
                  const count = allResults.filter(a => a.category === cat.id).length
                  if (count === 0) return null
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors flex justify-between
                                ${selectedCategory === cat.id ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-gray-600">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {results.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 mb-4">No articles found matching your search.</p>
                <p className="text-sm text-gray-600">Try different keywords or browse categories.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((article, index) => (
                  <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/article/${article.slug}`}
                      className="block p-6 bg-gray-900/30 border border-gray-800 rounded-xl
                               hover:border-blue-500/50 hover:bg-gray-900/50 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span
                            className="text-xs font-medium px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: `${categories.find(c => c.id === article.category)?.color}20`,
                              color: categories.find(c => c.id === article.category)?.color
                            }}
                          >
                            {categories.find(c => c.id === article.category)?.name}
                          </span>
                          <h2 className="text-xl font-semibold mt-2">{article.title}</h2>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-full shrink-0 ml-4">
                          <Shield className="w-3 h-3 text-green-500" />
                          <span className="text-xs font-medium text-green-500">{article.truthScore}%</span>
                        </div>
                      </div>

                      <p className="text-gray-400 mb-4">{article.summary}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {article.readTime} min read
                        </span>
                        <span>{article.sources} sources</span>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-800/50 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-600">
            Galion Knowledge - The Library of Truth
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <SearchResults />
    </Suspense>
  )
}
