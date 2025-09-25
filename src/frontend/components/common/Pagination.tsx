'use client'

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

interface PaginationProps {
  page: number
  setPage: (page: number) => void
  totalPages: number
}

export default function Pagination({ page, setPage, totalPages }: PaginationProps) {
  const generatePages = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      const left = Math.max(1, page - 1)
      const right = Math.min(totalPages, page + 1)

      pages.push(1)
      if (left > 2) pages.push('...')
      for (let i = left; i <= right; i++) {
        if (i !== 1 && i !== totalPages) pages.push(i)
      }
      if (right < totalPages - 1) pages.push('...')
      if (totalPages !== 1) pages.push(totalPages)
    }

    return pages
  }

  const handleClick = (p: number | string) => {
    if (typeof p === 'number' && p !== page) setPage(p)
  }

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button
        onClick={() => page > 1 && setPage(page - 1)}
        className={`w-9 h-9 rounded-md border flex items-center justify-center transition ${
          page === 1
            ? 'cursor-not-allowed text-gray-400 border-gray-300 bg-white'
            : 'hover:bg-gray-100 text-gray-700 border-gray-300'
        }`}
        disabled={page === 1}
      >
        <FaChevronLeft size={14} />
      </button>

      {generatePages().map((p, idx) =>
        typeof p === 'number' ? (
          <button
            key={idx}
            onClick={() => handleClick(p)}
            className={`w-9 h-9 rounded-md border text-sm transition ${
              p === page
                ? 'bg-blue-600 text-white font-semibold border-blue-600'
                : 'text-gray-700 hover:bg-gray-100 border-gray-300'
            }`}
          >
            {p}
          </button>
        ) : (
          <span key={idx} className="px-2 text-gray-500">
            ...
          </span>
        )
      )}

      <button
        onClick={() => page < totalPages && setPage(page + 1)}
        className={`w-9 h-9 rounded-md border flex items-center justify-center transition ${
          page === totalPages
            ? 'cursor-not-allowed text-gray-400 border-gray-300 bg-white'
            : 'hover:bg-gray-100 text-gray-700 border-gray-300'
        }`}
        disabled={page === totalPages}
      >
        <FaChevronRight size={14} />
      </button>
    </div>
  )
}