'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Shield, Clock, BookOpen, ExternalLink,
  CheckCircle, Calendar, Share2
} from 'lucide-react'
import { getArticleBySlug, getCategoryById, getRelatedArticles } from '@/lib/knowledge-data'
import ReadingProgress from '@/components/ReadingProgress'
import BookmarkButton from '@/components/BookmarkButton'

// Simple markdown-like rendering
function renderContent(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inList = false
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 mb-6 text-gray-300">
          {listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
      listItems = []
    }
    inList = false
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    // Headers
    if (trimmed.startsWith('# ')) {
      flushList()
      elements.push(
        <h1 key={index} className="text-3xl font-bold mb-6 text-white">
          {trimmed.slice(2)}
        </h1>
      )
    } else if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={index} className="text-2xl font-bold mt-8 mb-4 text-white">
          {trimmed.slice(3)}
        </h2>
      )
    } else if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={index} className="text-xl font-semibold mt-6 mb-3 text-white">
          {trimmed.slice(4)}
        </h3>
      )
    }
    // List items
    else if (trimmed.startsWith('- ')) {
      inList = true
      // Handle bold text in list items
      let text = trimmed.slice(2)
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      listItems.push(text)
    }
    // Empty line
    else if (trimmed === '') {
      flushList()
    }
    // Regular paragraph
    else if (trimmed.length > 0) {
      flushList()
      // Handle bold and other formatting
      let text = trimmed
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      elements.push(
        <p
          key={index}
          className="text-gray-300 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      )
    }
  })

  flushList()
  return elements
}

export default function ArticlePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const article = getArticleBySlug(slug)
  const category = article ? getCategoryById(article.category) : null
  const relatedArticles = article ? getRelatedArticles(article) : []

  if (!mounted) return null

  if (!article || !category) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Reading Progress Bar */}
      <ReadingProgress />

      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
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

            <div className="flex items-center gap-2">
              <BookmarkButton articleSlug={slug} articleTitle={article.title} />
              <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-6 py-12">
        {/* Meta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href={`/category/${category.id}`}
            className="inline-block text-sm font-medium mb-4 px-3 py-1 rounded-full"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            {category.name}
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">{article.title}</h1>

          <p className="text-xl text-gray-400 mb-8 leading-relaxed">
            {article.summary}
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center gap-6 pb-8 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 rounded-full">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  {article.truthScore}% Truth Score
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-500">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{article.sources} verified sources</span>
            </div>

            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{article.readTime} min read</span>
            </div>

            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Verified {article.lastVerified}</span>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose prose-invert max-w-none"
        >
          {renderContent(article.content)}
        </motion.div>

        {/* Tags */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Related Topics</h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-gray-800 rounded-full text-sm text-gray-300 hover:bg-gray-700 cursor-pointer transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Source Transparency */}
        <div className="mt-8 p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Source Transparency
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            This article is based on {article.sources} verified sources including peer-reviewed
            academic papers, official documents, and expert analysis. All claims have been
            cross-referenced for accuracy.
          </p>
          <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            View all sources <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-bold mb-6">Related Knowledge</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedArticles.map(related => (
                <Link
                  key={related.id}
                  href={`/article/${related.slug}`}
                  className="p-4 bg-gray-900/30 border border-gray-800 rounded-xl
                           hover:border-blue-500/50 transition-all duration-300"
                >
                  <h4 className="font-medium mb-2">{related.title}</h4>
                  <p className="text-sm text-gray-500 line-clamp-2">{related.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-600">
            Galion Knowledge - The Library of Truth
          </p>
        </div>
      </footer>
    </div>
  )
}
