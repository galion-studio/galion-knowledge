'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  Search, BookOpen, Atom, Globe, Brain, History,
  Scale, Heart, Lightbulb, TreePine, Microscope,
  Calculator, Palette, Users, ArrowRight, Sparkles
} from 'lucide-react'
import MobileNav from '@/components/MobileNav'
import FeaturedArticles from '@/components/FeaturedArticles'

// Dynamic import for 3D Globe (client-side only)
const KnowledgeGlobe = dynamic(() => import('@/components/KnowledgeGlobe'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-16 h-16 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  ),
})

// Knowledge Categories
const categories = [
  { id: 'science', name: 'Science', icon: Atom, color: '#60a5fa' },
  { id: 'history', name: 'History', icon: History, color: '#f59e0b' },
  { id: 'philosophy', name: 'Philosophy', icon: Brain, color: '#a855f7' },
  { id: 'nature', name: 'Nature', icon: TreePine, color: '#22c55e' },
  { id: 'medicine', name: 'Medicine', icon: Heart, color: '#ef4444' },
  { id: 'mathematics', name: 'Mathematics', icon: Calculator, color: '#3b82f6' },
  { id: 'geography', name: 'Geography', icon: Globe, color: '#14b8a6' },
  { id: 'technology', name: 'Technology', icon: Lightbulb, color: '#eab308' },
  { id: 'arts', name: 'Arts', icon: Palette, color: '#ec4899' },
  { id: 'society', name: 'Society', icon: Users, color: '#8b5cf6' },
  { id: 'law', name: 'Law', icon: Scale, color: '#f97316' },
  { id: 'biology', name: 'Biology', icon: Microscope, color: '#06b6d4' },
]

// Sample prompts for inspiration
const samplePrompts = [
  "What is the theory of relativity?",
  "How do black holes form?",
  "Why do humans dream?",
  "What caused the fall of Rome?",
  "How does quantum computing work?",
  "What is consciousness?",
]

export default function KnowledgeHome() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      setCurrentPrompt((prev) => (prev + 1) % samplePrompts.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <BookOpen className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-semibold tracking-tight">
              Galion <span className="text-blue-500">Knowledge</span>
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-6"
          >
            <Link href="/search" className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors">
              Explore
            </Link>
            <Link href="/category/science" className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors">
              Science
            </Link>
            <Link href="/search" className="hidden sm:inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-medium transition-colors">
              Get Started
            </Link>
            <MobileNav />
          </motion.div>
        </div>
      </nav>

      {/* Main Hero Section */}
      <main className="relative min-h-[calc(100vh-80px)] flex flex-col lg:flex-row items-center">
        {/* Left side - Content */}
        <div className="relative z-10 w-full lg:w-1/2 px-6 lg:px-12 py-12 lg:py-0">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">The Library of Truth</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              All Human{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Knowledge
              </span>
              <br />
              <span className="text-gray-500">Unbiased. Truthful.</span>
            </h1>

            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              Access the world&apos;s knowledge as it truly is. No propaganda, no agenda,
              no distortion. Every fact sourced, every claim verified.
            </p>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="relative mb-8">
              <div
                className={`relative transition-all duration-500 ${
                  isSearchFocused ? 'scale-[1.02]' : ''
                }`}
              >
                {/* Glow effect */}
                <div
                  className={`absolute -inset-1 bg-gradient-to-r from-blue-600/50 to-cyan-600/50 rounded-2xl blur-lg transition-opacity duration-500 ${
                    isSearchFocused ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                <div className="relative bg-[#0a0f1c] border border-gray-800 rounded-2xl overflow-hidden">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder={mounted ? samplePrompts[currentPrompt] : "Search for any topic..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="w-full pl-14 pr-14 py-5 bg-transparent text-lg text-white
                             placeholder:text-gray-600 focus:outline-none"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 6).map((cat, index) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <Link
                    href={`/category/${cat.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 border border-gray-800
                             rounded-full text-sm text-gray-400 hover:text-white hover:border-gray-700
                             transition-all duration-300"
                  >
                    <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                    {cat.name}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right side - 3D Globe */}
        <div className="w-full lg:w-1/2 h-[50vh] lg:h-[calc(100vh-80px)] relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="w-full h-full"
          >
            {mounted && (
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-16 h-16 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                }
              >
                <KnowledgeGlobe />
              </Suspense>
            )}
          </motion.div>

          {/* Globe overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-transparent to-transparent pointer-events-none lg:hidden" />
        </div>
      </main>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 border-t border-gray-800/50 bg-[#030712]/80 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Knowledge Articles', value: '2.4M+' },
              { label: 'Verified Sources', value: '890K+' },
              { label: 'Topics Covered', value: '15K+' },
              { label: 'Truth Score Avg', value: '98.7%' },
            ].map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* All Categories Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Explore All Knowledge</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Dive into any field of human understanding. Each category contains
              verified, unbiased information from trusted sources.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <Link
                  href={`/category/${category.id}`}
                  className="group block p-6 bg-gray-900/30 border border-gray-800 rounded-2xl
                           hover:border-blue-500/50 hover:bg-gray-900/50 transition-all duration-300 h-full"
                >
                  <category.icon
                    className="w-10 h-10 mb-4 mx-auto transition-transform group-hover:scale-110"
                    style={{ color: category.color }}
                  />
                  <h3 className="font-medium text-sm text-gray-300 group-hover:text-white transition-colors text-center">
                    {category.name}
                  </h3>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <FeaturedArticles />

      {/* Mission Section */}
      <section className="relative z-10 py-20 px-6 border-t border-gray-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6">
              Truth in an Age of{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                Misinformation
              </span>
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed mb-8">
              We believe humanity deserves access to knowledge that is verified, unbiased, and truthful.
              Every fact is sourced. Every claim is checked. Every perspective is balanced.
              No algorithms optimizing for engagement. Just pure, honest truth.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Peer Reviewed
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Multi-Source Verified
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Politically Neutral
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 text-blue-500" />
            <span className="text-lg font-semibold">Galion Knowledge</span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            The Library of Truth - Part of the Galion Ecosystem
          </p>
          <p className="text-xs text-gray-700">
            2024-2025 Galion. Knowledge should be free and truthful.
          </p>
        </div>
      </footer>
    </div>
  )
}
