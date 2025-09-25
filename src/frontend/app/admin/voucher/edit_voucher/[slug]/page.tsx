'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from '@/utils/axiosConfig'
import type { AxiosError } from 'axios'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { toLocalInputValue } from '../../_utils'

type DiscountType = 'percent' | 'fixed'

interface VoucherDTO {
  code: string
  description?: string
  type: DiscountType
  value?: number
  minOrder?: number
  usageLimit?: number
  perUserLimit?: number
  startTime: string
  endTime: string
  isActive: boolean
}

interface EditForm {
  code: string
  description: string
  type: DiscountType
  value: string
  minOrder: string
  usageLimit: string
  perUserLimit: string
  startTime: string
  endTime: string
  isActive: boolean
}

const getErr = (e: unknown) => {
  const err = e as AxiosError<{ message?: string }>
  return err?.response?.data?.message ?? err?.message ?? 'Đã có lỗi xảy ra'
}

export default function EditVoucherPage() {
  const { slug } = useParams() as { slug: string }
  const codeParam = slug
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [f, setF] = useState<EditForm>({
    code: '', description: '', type: 'percent', value: '', minOrder: '',
    usageLimit: '', perUserLimit: '', startTime: '', endTime: '', isActive: true,
  })

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setF((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get<VoucherDTO>(`/api/promotion/code/${encodeURIComponent(codeParam)}`)
        const v = res.data
        setF({
          code: v.code,
          description: v.description ?? '',
          type: v.type,
          value: v.value !== undefined ? String(v.value) : '',
          minOrder: v.minOrder !== undefined ? String(v.minOrder) : '',
          usageLimit: v.usageLimit !== undefined ? String(v.usageLimit) : '',
          perUserLimit: v.perUserLimit !== undefined ? String(v.perUserLimit) : '',
          startTime: toLocalInputValue(v.startTime),
          endTime: toLocalInputValue(v.endTime),
          isActive: !!v.isActive,
        })
      } catch (e) { toast.error(getErr(e)) }
      finally { setLoading(false) }
    }
    if (codeParam) load()
  }, [codeParam])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        code: f.code.trim(),
        description: f.description,
        type: f.type,
        value: f.value ? Number(f.value) : 0,
        minOrder: f.minOrder ? Number(f.minOrder) : 0,
        usageLimit: f.usageLimit ? Number(f.usageLimit) : 0,
        perUserLimit: f.perUserLimit ? Number(f.perUserLimit) : 0,
        startTime: new Date(f.startTime).toISOString(),
        endTime: new Date(f.endTime).toISOString(),
        isActive: f.isActive,
      }
      await axios.put(`/api/promotion/code/${encodeURIComponent(codeParam)}`, payload)
      toast.success('Cập nhật thành công')
      setTimeout(() => router.push('/admin/voucher'), 600)
    } catch (e) { toast.error(getErr(e)) }
  }

  const toggleActive = async () => {
    try {
      const newVal = !f.isActive
      await axios.put(`/api/promotion/code/${encodeURIComponent(codeParam)}`, { isActive: newVal })
      setF((s) => ({ ...s, isActive: newVal }))
      toast.success('Đã cập nhật trạng thái')
    } catch (e) { toast.error(getErr(e)) }
  }

  if (loading) return <div className="p-6">Đang tải…</div>

  return (
    <main className="main main-content">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#0c2d57]">Sửa Voucher</h1>
          <button onClick={toggleActive} className={`rounded-full px-4 py-2 ${f.isActive ? 'bg-green-600' : 'bg-gray-400'} text-white`}>
            {f.isActive ? 'Đang hoạt động' : 'Đang ẩn'} — Bật/Tắt
          </button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow">
          <div>
            <label className="block mb-1">Mã Voucher</label>
            <input value={f.code} onChange={(e) => set('code', e.target.value)} placeholder="VD: SALE2025" className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Loại giảm giá</label>
            <select value={f.type} onChange={(e) => set('type', e.target.value as DiscountType)} className="border rounded-xl px-3 py-2 w-full">
              <option value="percent">Phần trăm (%)</option>
              <option value="fixed">Số tiền cố định (VND)</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Giá trị giảm giá</label>
            <input type="number" value={f.value} placeholder="VD: 10 hoặc 50000" onChange={(e) => set('value', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Đơn hàng tối thiểu (VND)</label>
            <input type="number" value={f.minOrder} placeholder="Để trống nếu không có" onChange={(e) => set('minOrder', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Số lượng voucher</label>
            <input type="number" value={f.usageLimit} placeholder="VD: 100 voucher" onChange={(e) => set('usageLimit', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Giới hạn sử dụng (Mỗi khách)</label>
            <input type="number" value={f.perUserLimit} placeholder="VD: 1" onChange={(e) => set('perUserLimit', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Ngày bắt đầu</label>
            <input type="datetime-local" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Ngày kết thúc</label>
            <input type="datetime-local" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div className="col-span-2">
            <label className="block mb-1">Mô tả</label>
            <textarea value={f.description} placeholder="Mô tả ngắn…" onChange={(e) => set('description', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div className="col-span-2 flex justify-end">
            <button className="rounded-full bg-blue-600 text-white px-5 py-2">Lưu</button>
          </div>
        </form>
      </div>
      <ToastContainer position="top-right" autoClose={1800} />
    </main>
  )
}
