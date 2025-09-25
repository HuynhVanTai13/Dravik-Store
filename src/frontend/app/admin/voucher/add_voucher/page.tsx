'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/utils/axiosConfig'
import type { AxiosError } from 'axios'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

type DiscountType = 'percent' | 'fixed'

interface AddForm {
  code: string
  description: string
  type: DiscountType
  value: string
  minOrder: string
  usageLimit: string
  perUserLimit: string
  startTime: string
  endTime: string
}

const getErr = (e: unknown) => {
  const err = e as AxiosError<{ message?: string }>
  return err?.response?.data?.message ?? err?.message ?? 'Đã có lỗi xảy ra'
}

export default function AddVoucherPage() {
  const router = useRouter()
  const [f, setF] = useState<AddForm>({
    code: '', description: '', type: 'percent',
    value: '', minOrder: '', usageLimit: '', perUserLimit: '',
    startTime: '', endTime: '',
  })
  const set = <K extends keyof AddForm>(k: K, v: AddForm[K]) => setF(s => ({ ...s, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!f.code || !f.startTime || !f.endTime) { toast.error('Nhập mã & thời gian'); return }
      const payload = {
        code: f.code,
        description: f.description,
        type: f.type,
        value: f.value ? Number(f.value) : 0,
        minOrder: f.minOrder ? Number(f.minOrder) : 0,
        usageLimit: f.usageLimit ? Number(f.usageLimit) : 0,
        perUserLimit: f.perUserLimit ? Number(f.perUserLimit) : 0,
        startTime: new Date(f.startTime).toISOString(),
        endTime: new Date(f.endTime).toISOString(),
        isActive: true,
      }
      await axios.post('/api/promotion', payload)
      toast.success('Tạo voucher thành công')
      setTimeout(() => router.push('/admin/voucher'), 600)
    } catch (e) { toast.error(getErr(e)) }
  }

  return (
    <main className="main main-content">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-2xl font-bold mb-4 text-center text-[#0c2d57]">Thêm Voucher</div>

        <form onSubmit={submit} className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow">
          <div>
            <label className="block mb-1">Mã Voucher</label>
            <input placeholder="VD: SALE2025" value={f.code} onChange={(e)=>set('code', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
            <p className="text-xs text-gray-500 mt-1">Mã này sẽ được khách hàng nhập.</p>
          </div>

          <div>
            <label className="block mb-1">Loại giảm giá</label>
            <select value={f.type} onChange={(e)=>set('type', e.target.value as DiscountType)} className="border rounded-xl px-3 py-2 w-full">
              <option value="percent">Phần trăm (%)</option>
              <option value="fixed">Số tiền cố định (VND)</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Giá trị giảm giá</label>
            <input type="number" placeholder="VD: 10 hoặc 50000" value={f.value} onChange={(e)=>set('value', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Đơn hàng tối thiểu (VND)</label>
            <input type="number" placeholder="Để trống nếu không có" value={f.minOrder} onChange={(e)=>set('minOrder', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Số lượng voucher</label>
            <input type="number" placeholder="VD: 100 voucher" value={f.usageLimit} onChange={(e)=>set('usageLimit', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Giới hạn sử dụng (Mỗi khách)</label>
            <input type="number" placeholder="VD: 5 (mỗi khách tối đa 5 lần)" value={f.perUserLimit} onChange={(e)=>set('perUserLimit', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Ngày bắt đầu</label>
            <input type="datetime-local" value={f.startTime} onChange={(e)=>set('startTime', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div>
            <label className="block mb-1">Ngày kết thúc</label>
            <input type="datetime-local" value={f.endTime} onChange={(e)=>set('endTime', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div className="col-span-2">
            <label className="block mb-1">Mô tả</label>
            <textarea placeholder="Mô tả ngắn…" value={f.description} onChange={(e)=>set('description', e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
          </div>

          <div className="col-span-2 flex justify-end">
            <button className="rounded-full bg-blue-600 text-white px-5 py-2">+ Tạo Voucher</button>
          </div>
        </form>
      </div>
      <ToastContainer position="top-right" autoClose={1800} />
    </main>
  )
}
