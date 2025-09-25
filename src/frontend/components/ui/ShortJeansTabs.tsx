'use client'

import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useVariantModal } from '@/components/providers/VariantModalProvider'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const ITEM_WIDTH = 245
const toImg = (p?: string) => {
  if (!p) return '/images/no-image.png'
  if (/^https?:\/\//.test(p)) return p
  let s = p
  if (s.startsWith('/uploads/')) s = s.slice(1)
  if (!s.startsWith('uploads/')) s = `uploads/${s}`
  return `${API_BASE}/${s.replace(/^\/+/, '')}`
}

interface Product {
  _id: string; name: string; price: number; discount: number; slug: string;
  variants: { image: string; sizes: { sold: number }[] }[]; totalSold?: number
}

export default function ShortsJeansTabs() {
  const { openBuyNow, openAddToCart } = useVariantModal()

  const [activeTab, setActiveTab] = useState<'short' | 'jeans'>('short')
  const [productsShort, setProductsShort] = useState<Product[]>([])
  const [productsJeans, setProductsJeans] = useState<Product[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCategory('quan-shorts', setProductsShort)
    fetchCategory('quan-jeans', setProductsJeans)
  }, [])

  const fetchCategory = async (category: string, setter: React.Dispatch<React.SetStateAction<Product[]>>) => {
    try {
      const res = await axios.get(`${API_BASE}/api/products`, { params: { category, status: 'active', limit: 30 } })
      const data = res.data.items || res.data.products || []
      const processed = data.map((p: Product) => {
        const totalSold = p.variants?.reduce((sum, v) => sum + (v.sizes?.reduce((s, sz) => s + sz.sold, 0) || 0), 0) || 0
        return { ...p, totalSold }
      })
      setter(processed)
    } catch (err) { console.error('Lỗi khi lấy sản phẩm:', err) }
  }

  const handleScroll = (direction: 'next' | 'prev') => {
    if (!scrollRef.current) return
    const scrollAmount = direction === 'next' ? ITEM_WIDTH : -ITEM_WIDTH
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }

  const renderProduct = (product: Product) => {
    const imageUrl = toImg(product.variants?.[0]?.image)
    const finalPrice = Math.max(0, (product.price || 0) - (product.discount || 0))
    const detailHref = `/user/products/${product.slug}`
    return (
      <div key={product._id} className="col-5-sp" style={{ minWidth: ITEM_WIDTH, maxWidth: ITEM_WIDTH, flexShrink: 0, scrollSnapAlign: 'start' }}>
        <div className="img-sp">
          <Link href={detailHref} aria-label={product.name}>
            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/no-image.png' }} />
          </Link>
        </div>

        <div className="text-sp">
          <div className="left-sp">
            <p className="name-sp"><Link href={detailHref} className="hover:underline text-inherit">{product.name}</Link></p>
            <p style={{ color: '#cd1919', fontSize: 16, fontWeight: 550 }}>
              <Link href={detailHref} className="text-inherit no-underline">
                {finalPrice.toLocaleString()}₫{' '}
                {product.discount > 0 && <del style={{ color: '#979797', fontSize: 14 }}>{product.price.toLocaleString()}₫</del>}
              </Link>
            </p>
            <p style={{ fontSize: 14, color: 'black' }}>
              <Link href={detailHref} className="text-inherit hover:underline">Đã bán: <span style={{ color: 'red' }}>{product.totalSold || 0}</span></Link>
            </p>
            <button className="w-full mt-1 inline-block px-3 py-2 rounded text-white text-sm font-semibold"
              style={{ background: '#001F5D' }}
              onClick={() => openBuyNow({ productSlug: product.slug, productNameFallback: product.name, productImageFallback: imageUrl })}
            >Mua ngay</button>
          </div>
          <div className="right-sp">
            <button className="heart-btn"><i className="fa fa-heart" /></button>
            <button onClick={() => openAddToCart({ productSlug: product.slug, productNameFallback: product.name, productImageFallback: imageUrl })}>
              <i className="fa-solid fa-cart-plus" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const current = activeTab === 'short' ? productsShort : productsJeans

  return (
    <div className="new-sp">
      <div className="flex justify-between items-center mb-3">
        <div className="tabs flex gap-4 text-lg font-semibold">
          <span className={`cursor-pointer ${activeTab === 'short' ? 'text-[#001F5D] underline font-bold' : 'text-gray-400'}`} onClick={() => setActiveTab('short')}>Quần short</span>
          <span className={`cursor-pointer ${activeTab === 'jeans' ? 'text-[#001F5D] underline font-bold' : 'text-gray-400'}`} onClick={() => setActiveTab('jeans')}>Quần jeans</span>
        </div>

        <div className="flex gap-2">
          <button onClick={() => handleScroll('prev')} className="w-9 h-9 rounded-md bg-gray-200 hover:bg-gray-300 text-base flex items-center justify-center">
            <i className="fa-solid fa-chevron-left text-black"></i>
          </button>
          <button onClick={() => handleScroll('next')} className="w-9 h-9 rounded-md bg-gray-200 hover:bg-gray-300 text-base flex items-center justify-center">
            <i className="fa-solid fa-chevron-right text-black"></i>
          </button>
        </div>
      </div>

      <div className="row-3 relative flex gap-4 flex-nowrap items-stretch">
        <div ref={scrollRef} className="flex gap-4 overflow-hidden no-scrollbar transition-all" style={{ scrollSnapType: 'x mandatory' }}>
          {current.map(renderProduct)}
        </div>

        <div className="col-5-sp" style={{ flexShrink: 0 }}>
          <div className="T-shirt relative">
            <img
              src={activeTab === 'short' ? '/images/quan_short.jpg' : '/images/quan-jean.jpg'}
              alt="Xem ngay"
              className="rounded shadow"
            />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <h1 className="text-white text-lg font-bold">{activeTab === 'short' ? 'QUẦN SHORT' : 'QUẦN JEANS'}</h1>
              <Link
                href={`/user/products?category=${activeTab === 'short' ? 'quan-shorts' : 'quan-jeans'}`}
                className="inline-block mt-2 px-3 py-1 rounded transition duration-200 hover:text-white"
                style={{ backgroundColor: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#001F5D' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white' }}
              >
                Xem ngay
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
