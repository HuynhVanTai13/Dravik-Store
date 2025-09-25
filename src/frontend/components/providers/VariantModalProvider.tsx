'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import VariantPickerModal from '@/components/ui/VariantPickerModal'

type OpenInput = {
  productSlug: string
  productNameFallback: string
  productImageFallback: string
  dealPercent?: number | null
}

type Ctx = {
  openBuyNow: (input: OpenInput) => void
  openAddToCart: (input: OpenInput) => void
  close: () => void
}

const VariantModalContext = createContext<Ctx>({
  openBuyNow: () => {},
  openAddToCart: () => {},
  close: () => {},
})

type State = OpenInput & { mode: 'buy' | 'cart'; open: boolean }

export function VariantModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({
    open: false,
    mode: 'buy',
    productSlug: '',
    productNameFallback: '',
    productImageFallback: '',
    dealPercent: null,
  })

  const openBuyNow = useCallback((input: OpenInput) => {
    setState({ ...input, mode: 'buy', open: true })
  }, [])

  const openAddToCart = useCallback((input: OpenInput) => {
    setState({ ...input, mode: 'cart', open: true })
  }, [])

  const close = useCallback(() => {
    setState(s => ({ ...s, open: false }))
  }, [])

  return (
    <VariantModalContext.Provider value={{ openBuyNow, openAddToCart, close }}>
      {children}
      <VariantPickerModal
        open={state.open}
        onClose={close}
        productSlug={state.productSlug}
        productNameFallback={state.productNameFallback}
        productImageFallback={state.productImageFallback}
        dealPercent={state.dealPercent}
        mode={state.mode}
      />
    </VariantModalContext.Provider>
  )
}

export const useVariantModal = () => useContext(VariantModalContext)
