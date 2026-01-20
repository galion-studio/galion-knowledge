'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, BookOpen, Search, Home,
  Atom, History, Brain, TreePine, Heart, Calculator,
  Globe, Lightbulb, Palette, Users, Scale, Microscope
} from 'lucide-react'

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

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-[#0a0f1c] border-l border-gray-800 z-50 lg:hidden overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-blue-500" />
                  <span className="font-semibold">Knowledge</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-4">
                <div className="space-y-2 mb-6">
                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <Home className="w-5 h-5 text-gray-400" />
                    <span>Home</span>
                  </Link>
                  <Link
                    href="/search"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <Search className="w-5 h-5 text-gray-400" />
                    <span>Search</span>
                  </Link>
                </div>

                {/* Categories */}
                <div className="border-t border-gray-800 pt-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {categories.map(cat => (
                      <Link
                        key={cat.id}
                        href={`/category/${cat.id}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
                      >
                        <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                        <span className="text-sm">{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </nav>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-[#0a0f1c]">
                <p className="text-xs text-gray-600 text-center">
                  Galion Knowledge - The Library of Truth
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
