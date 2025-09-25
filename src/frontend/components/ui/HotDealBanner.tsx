'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import Marquee from 'react-fast-marquee'
import { useVariantModal } from '@/components/providers/VariantModalProvider'
import "../../public/css/home.css"
import "@/public/css/hotdeal-mobile.css";

interface Product {
  _id: string
  name: string
  price: number
  discount: number
  slug: string
  variants: { image: string; sizes: { sold: number }[] }[]
}

type DealAPI = {
  startTime: string
  endTime: string
  productIds: Product[]
  discountPercent?: number
  programName?: string
  name?: string
  title?: string
}

const ITEM_WIDTH = 250
const NAVY = '#001F5D'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function HotDealBanner() {
  const { openBuyNow, openAddToCart } = useVariantModal()

  const [hotProducts, setHotProducts] = useState<Product[]>([])
  const [programName, setProgramName] = useState<string>('')
  const [startTime, setStartTime] = useState<number>(0)
  const [endTime, setEndTime] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [mode, setMode] = useState<'waiting' | 'active' | 'expired'>('waiting')
  const [timesReady, setTimesReady] = useState(false)
  const [skewMs, setSkewMs] = useState(0)
  const [dealPercent, setDealPercent] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ===== YÊU THÍCH =====
  const [userId, setUserId] = useState<string>('')
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  const [busyFav, setBusyFav] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('userInfo')
      if (raw) {
        const u = JSON.parse(raw)
        if (u?._id) setUserId(u._id)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/favourites/${userId}`, { credentials: 'include' })
        const arr = await res.json()
        const ids = new Set<string>((Array.isArray(arr) ? arr : []).map((p: any) => p?._id).filter(Boolean))
        setFavSet(ids)
      } catch {
        setFavSet(new Set())
      }
    })()
  }, [userId])

  const markBusy = (pid: string, on: boolean) => {
    setBusyFav(prev => {
      const s = new Set(prev)
      on ? s.add(pid) : s.delete(pid)
      return s
    })
  }

  const toggleFavourite = async (p: Product) => {
    if (!userId) {
      alert('Bạn cần đăng nhập để dùng Yêu thích!')
      return
    }
    const pid = p._id
    try {
      markBusy(pid, true)
      if (!favSet.has(pid)) {
        const r = await fetch(`${API_BASE}/api/favourites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ users_id: userId, products_id: pid }),
        })
        if (r.ok) setFavSet(prev => new Set(prev).add(pid))
      } else {
        const r = await fetch(`${API_BASE}/api/favourites/${userId}/${pid}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (r.ok) {
          setFavSet(prev => {
            const s = new Set(prev)
            s.delete(pid)
            return s
          })
        }
      }
    } finally {
      markBusy(pid, false)
    }
  }

  // ===== DEAL TIMER =====
  const toMs = (val?: string) => (!val ? 0 : (Number.isFinite(new Date(val).getTime()) ? new Date(val).getTime() : 0))

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const res = await axios.get<DealAPI>(`${API_BASE}/api/deal`)
        const deal = res.data || ({} as DealAPI)
        const serverDateHeader = (res.headers?.date || res.headers?.Date) as string | undefined
        if (serverDateHeader) setSkewMs(new Date(serverDateHeader).getTime() - Date.now())

        setProgramName((deal.programName || deal.name || deal.title || 'Chương trình khuyến mãi').trim())
        const start = toMs(deal.startTime); const end = toMs(deal.endTime)
        setStartTime(start); setEndTime(end)

        const pct = Number(deal.discountPercent)
        setDealPercent(Number.isFinite(pct) && pct > 0 ? pct : null)

        const now = Date.now() + (serverDateHeader ? (new Date(serverDateHeader).getTime() - Date.now()) : 0)

        if (start > 0 && end > 0) {
          if (now < start) setMode('waiting')
          else if (now >= start && now <= end) { setMode('active'); setHotProducts(deal.productIds || []) }
          else setMode('expired')
          setTimesReady(true)
        } else { setMode('expired'); setTimesReady(false) }
      } catch {
        setMode('expired')
        setTimesReady(false)
      }
    }
    fetchDeal()
  }, [])

  useEffect(() => {
    if (!timesReady) return
    const update = async () => {
      const now = Date.now() + skewMs
      const distance = mode === 'waiting' ? startTime - now : mode === 'active' ? endTime - now : 0
      if (distance <= 0) {
        if (mode === 'waiting') { setMode('active'); return }
        else if (mode === 'active') { setMode('expired'); return }
      }
      const hours = Math.floor(distance / 3600000)
      const minutes = Math.floor((distance % 3600000) / 60000)
      const seconds = Math.floor((distance % 60000) / 1000)
      setTimeLeft({ hours, minutes, seconds })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [timesReady, mode, startTime, endTime, skewMs])

  // ===== SCROLL =====
  const handleScroll = (dir: 'next' | 'prev') => {
    if (!scrollRef.current || hotProducts.length === 0) return
    const el = scrollRef.current
    const max = el.scrollWidth - el.clientWidth
    if (dir === 'next') el.scrollTo({ left: el.scrollLeft + ITEM_WIDTH >= max ? 0 : el.scrollLeft + ITEM_WIDTH, behavior: 'smooth' })
    else el.scrollTo({ left: el.scrollLeft - ITEM_WIDTH <= 0 ? max : el.scrollLeft - ITEM_WIDTH, behavior: 'smooth' })
  }

  if (mode === 'expired') return null

  return (
    <section className="w-1300 h-auto relative" style={{ backgroundColor: '#ff3c00', padding: 20, borderRadius: 10, color: 'white', overflow: 'hidden' }}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="title-deal">
          {mode === 'active' ? (programName || 'Chương trình khuyến mãi') : 'Chương trình sắp diễn ra'}
        </h2>
        <div className="text-right text-white font-bold text-lg">
          {mode === 'waiting' ? 'Bắt đầu sau:' : 'Kết thúc sau:'}
          <span className="bg-blue-500 px-2 py-1 rounded ml-2">{timeLeft.hours} <small>giờ</small></span>{' '}
          <span className="bg-blue-500 px-2 py-1 rounded">{timeLeft.minutes} <small>phút</small></span>{' '}
          <span className="bg-blue-500 px-2 py-1 rounded">{timeLeft.seconds} <small>giây</small></span>
        </div>
      </div>

      <Marquee pauseOnHover speed={60} gradient={false}>
        <span style={{ fontSize: 16, fontWeight: 500, marginRight: 40 }}>
          🎉 Giảm {dealPercent ?? 8}% cho đơn hàng từ 499k | 🚛 Miễn phí vận chuyển toàn quốc | 🧨 Ưu đãi chỉ trong hôm nay!
        </span>
      </Marquee>

      {mode === 'active' && (
        <div className="relative mt-4 overflow-hidden">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto no-scrollbar transition-all"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {hotProducts.map(p => {
              const usingDeal = typeof dealPercent === 'number' && dealPercent > 0
              const dealPrice = usingDeal ? Math.max(0, Math.round(p.price * (1 - (dealPercent! / 100)))) : Math.max(0, p.price - (p.discount || 0))
              const showAsDiscount = usingDeal || p.discount > 0
              const ribbonPercent = usingDeal ? Math.round(dealPercent!) : (p.discount > 0 ? Math.round((p.discount / p.price) * 100) : 0)
              const img = p.variants?.[0]?.image ? `${API_BASE}${p.variants[0].image}` : '/images/no-image.png'
              const sold = p.variants?.reduce((s, v) => s + (v.sizes?.reduce((x, sz) => x + (sz?.sold || 0), 0) || 0), 0)
              const detailHref = `/user/products/${p.slug}`

              const isFav = favSet.has(p._id)
              const isBusy = busyFav.has(p._id)

              return (
                <div key={p._id} className="col-5-sp relative" style={{ minWidth: ITEM_WIDTH, maxWidth: ITEM_WIDTH, flexShrink: 0, scrollSnapAlign: 'start' }}>
                  {showAsDiscount && ribbonPercent > 0 && (
                    <span style={{ position: 'absolute', top: 0, left: 0, background: '#e60000', color: 'white', fontSize: 13, fontWeight: 'bold', padding: '4px 6px', borderBottomRightRadius: 8 }}>
                      -{ribbonPercent}%
                    </span>
                  )}

                  <div className="img-sp">
                    <Link href={detailHref} aria-label={p.name}><img src={img} alt={p.name} /></Link>
                  </div>

                  <div className="text-sp">
                    <div className="left-sp">
                      <p className="name-sp"><Link href={detailHref} className="hover:underline text-inherit">{p.name}</Link></p>
                      <p style={{ color: '#cd1919', fontSize: 16, fontWeight: 550, marginBottom: 4 }}>
                        <Link href={detailHref} className="text-inherit no-underline">
                          {showAsDiscount ? <>{dealPrice.toLocaleString()}₫ <del style={{ color: '#979797', fontSize: 14 }}>{p.price.toLocaleString()}₫</del></> : <>{p.price.toLocaleString()}₫</>}
                        </Link>
                      </p>
                      <p style={{ fontSize: 14, color: 'black' }}>
                        <Link href={detailHref} className="text-inherit hover:underline">Đã bán: <span style={{ color: 'red' }}>{sold || 0}</span></Link>
                      </p>
                      <button
                        className="w-full mt-1 inline-block px-3 py-2 rounded text-white text-sm font-semibold"
                        style={{ background: NAVY }}
                        onClick={() => openBuyNow({ productSlug: p.slug, productNameFallback: p.name, productImageFallback: img, dealPercent })}
                      >
                        Mua ngay
                      </button>
                    </div>

                    <div className="right-sp">
                      {/* ♥ mặc định xám (fill kín), click -> đỏ, hover hiện tooltip */}
                      <button
                        className="heart-btn"
                        aria-pressed={isFav}
                        aria-label={isFav ? 'Hủy yêu thích' : 'Yêu thích'}
                        title={isFav ? 'Hủy yêu thích' : 'Yêu thích'}
                        onClick={() => toggleFavourite(p)}
                        disabled={isBusy}
                      >
                        <i className="fa-solid fa-heart" aria-hidden="true" />
                      </button>

                      <button
                        onClick={() => openAddToCart({ productSlug: p.slug, productNameFallback: p.name, productImageFallback: img, dealPercent })}
                        title="Thêm vào giỏ"
                      >
                        <i className="fa-solid fa-cart-plus" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="absolute inset-y-0 left-0 flex items-center">
            <button onClick={() => handleScroll('prev')} className="w-9 h-9 rounded-md bg-gray-200 hover:bg-gray-300 text-base flex items-center justify-center">
              <i className="fa-solid fa-chevron-left text-black"></i>
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button onClick={() => handleScroll('next')} className="w-9 h-9 rounded-md bg-gray-200 hover:bg-gray-300 text-base flex items-center justify-center">
              <i className="fa-solid fa-chevron-right text-black"></i>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
