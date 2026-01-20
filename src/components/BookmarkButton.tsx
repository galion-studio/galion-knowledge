'use client'

import { useState, useEffect } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'

interface BookmarkButtonProps {
  articleSlug: string
  articleTitle: string
}

export default function BookmarkButton({ articleSlug, articleTitle }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)

  useEffect(() => {
    const bookmarks = JSON.parse(localStorage.getItem('knowledge-bookmarks') || '[]')
    setIsBookmarked(bookmarks.some((b: { slug: string }) => b.slug === articleSlug))
  }, [articleSlug])

  const toggleBookmark = () => {
    const bookmarks = JSON.parse(localStorage.getItem('knowledge-bookmarks') || '[]')

    if (isBookmarked) {
      const updated = bookmarks.filter((b: { slug: string }) => b.slug !== articleSlug)
      localStorage.setItem('knowledge-bookmarks', JSON.stringify(updated))
      setIsBookmarked(false)
    } else {
      bookmarks.push({ slug: articleSlug, title: articleTitle, savedAt: new Date().toISOString() })
      localStorage.setItem('knowledge-bookmarks', JSON.stringify(bookmarks))
      setIsBookmarked(true)
    }
  }

  return (
    <button
      onClick={toggleBookmark}
      className={`p-2 rounded-lg transition-colors ${
        isBookmarked
          ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
          : 'hover:bg-gray-800 text-gray-400 hover:text-white'
      }`}
      title={isBookmarked ? 'Remove bookmark' : 'Bookmark article'}
    >
      {isBookmarked ? (
        <BookmarkCheck className="w-5 h-5" />
      ) : (
        <Bookmark className="w-5 h-5" />
      )}
    </button>
  )
}
