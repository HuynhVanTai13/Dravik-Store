'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import axios from '@/utils/axiosConfig'
import type { AxiosError } from 'axios'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Pagination from '@/components/common/Pagination'
import { fmtMoney } from './_utils'

interface Voucher {
  _id: string
  code: string
  description?: string
  type: 'percent' | 'fixed'
  value: number
  minOrder: number
  usageLimit: number
  usedCount: number
  startTime: string
  endTime: string
  isActive: boolean
  perUserLimit?: number
}

const NAVY = '#001F5D'

const getErr = (e: unknown) => {
  const err = e as AxiosError<{ message?: string }>
  return err?.response?.data?.message ?? err?.message ?? 'Đã có lỗi xảy ra'
}

const fmtDay = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
const fmtTime = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default function VoucherListPage() {
  const [items, setItems] = useState<Voucher[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 10
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('') // '', 'active', 'inactive'

  const load = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit }
      if (q) params.q = q
      if (status) params.status = status
      const res = await axios.get<{ items: Voucher[]; total: number }>('/api/promotion', { params })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (e) {
      toast.error(getErr(e))
    }
  }, [page, limit, q, status])

  useEffect(() => { load() }, [load])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  // Popup xác nhận xoá
  const [confirm, setConfirm] = useState<{ open: boolean; code?: string }>({ open: false })
  const onDelete = (code: string) => setConfirm({ open: true, code })
  const doDelete = async () => {
    if (!confirm.code) return
    try {
      await axios.delete(`/api/promotion/code/${encodeURIComponent(confirm.code)}`)
      toast.success('Đã xoá')
      setConfirm({ open: false })
      load()
    } catch (err) {
      toast.error(getErr(err))
    }
  }

  const toggleStatus = async (code: string) => {
    try {
      await axios.patch(`/api/promotion/code/${encodeURIComponent(code)}/toggle`)
      load()
    } catch (e) {
      toast.error(getErr(e))
    }
  }

  return (
    <main className="main main-content">
      <div className="px-6 py-4">
        {/* Popup xác nhận */}
        {confirm.open && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-5 shadow" style={{ borderRadius: 5, width: 420 }}>
              <div className="text-lg font-semibold mb-3" style={{ color: NAVY }}>
                Xác nhận xoá voucher
              </div>
              <div className="text-sm text-gray-600 mb-5">
                Bạn có chắc muốn xoá voucher <b>{confirm.code}</b>?
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirm({ open: false })} className="px-4 py-2 border" style={{ borderRadius: 5 }}>
                  Hủy
                </button>
                <button onClick={doDelete} className="px-4 py-2 text-white" style={{ background: '#e11d48', borderRadius: 5 }}>
                  Xoá
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Danh sách voucher</h1>

          <form onSubmit={onSearch} className="flex items-center gap-3">
            <div className="flex items-stretch">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nhập voucher cần tìm kiếm..."
                className="border px-3 py-2 w-[350px] focus:outline-none"
                style={{ borderRadius: 5, borderRight: 'none' }}
              />
              <button type="submit" className="px-3 text-white" style={{ background: NAVY, borderRadius: '0 5px 5px 0' }} aria-label="Tìm kiếm">
                <i className="fa-solid fa-magnifying-glass" />
              </button>
            </div>

            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border px-4 py-2" style={{ borderRadius: 5 }}>
              <option value="">Trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đang ẩn</option>
            </select>

            <Link href="/admin/voucher/add_voucher" className="text-white px-4 py-2" style={{ background: NAVY, borderRadius: 5 }}>
              + Thêm voucher
            </Link>
          </form>
        </div>

        <div className="overflow-x-auto" style={{ borderRadius: 5, border: '1px solid #e5e7eb' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: NAVY, color: '#fff', fontSize: '0.79rem'}}>
                <th className="p-3 text-left">STT</th>
                <th className="p-3 text-left">MÃ</th>
                <th className="p-3 text-left">LOẠI</th>
                <th className="p-3 text-left">GIÁ TRỊ</th>
                <th className="p-3 text-left">ĐƠN TỐI THIỂU</th>
                <th className="p-3 text-left">SỐ LƯỢNG</th>
                <th className="p-3 text-left">GIỚI HẠN/NGƯỜI</th>
                <th className="p-3 text-left">BẮT ĐẦU</th>
                <th className="p-3 text-left">KẾT THÚC</th>
                <th className="p-3 text-left">TRẠNG THÁI</th>
                <th className="p-3 text-left">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v, i) => {
                const soldOut = v.usageLimit > 0 && v.usedCount >= v.usageLimit
                return (
                  <tr key={v._id} className="border-t">
                    <td className="p-3">{(page - 1) * limit + i + 1}</td>
                    <td className="p-3 font-semibold" style={{ color: NAVY }}>{v.code}</td>
                    <td className="p-3">{v.type === 'percent' ? 'Phần trăm' : 'Cố định'}</td>
                    <td className="p-3">{v.type === 'percent' ? `${v.value}%` : fmtMoney(v.value)}</td>
                    <td className="p-3">{fmtMoney(v.minOrder)}</td>
                    <td className="p-3">
                      {v.usedCount} / {v.usageLimit || '∞'}
                      {soldOut && <div className="text-red-600 text-xs mt-1">Đã hết</div>}
                    </td>
                    <td className="p-3">{v.perUserLimit ?? 0}</td>
                    <td className="p-3"><div className="font-medium">{fmtDay(v.startTime)}</div><div className="text-xs text-gray-600">{fmtTime(v.startTime)}</div></td>
                    <td className="p-3"><div className="font-medium">{fmtDay(v.endTime)}</div><div className="text-xs text-gray-600">{fmtTime(v.endTime)}</div></td>
                    <td className="p-3">
                      <button onClick={() => toggleStatus(v.code)} className="px-3 py-1 text-white" style={{ background: v.isActive ? '#16a34a' : '#6b7280', borderRadius: 5 }}>
                        {v.isActive ? 'Đang hoạt động' : 'Đang ẩn'}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Link href={`/admin/voucher/edit_voucher/${encodeURIComponent(v.code)}`} className="px-3 py-1" style={{ background: '#facc15', color: '#2a2a2a', borderRadius: 5 }}>
                          Sửa
                        </Link>
                        <button onClick={() => onDelete(v.code)} className="px-3 py-1 text-white" style={{ background: '#ef4444', borderRadius: 5 }}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-gray-500">Không có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-center">
          <Pagination page={page} setPage={setPage} totalPages={totalPages} />
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={1800} />
    </main>
  )
}
