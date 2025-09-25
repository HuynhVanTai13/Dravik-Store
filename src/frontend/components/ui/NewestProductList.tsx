'use client'

import { useEffect, useState } from 'react'
import axios from '@/utils/axiosConfig'
import HeartLikeBtn from '@/components/ui/HeartLikeBtn'

interface Product {
  _id: string
  name: string
  price: number
  discount: number
  variants: {
    image: string
  }[]
  slug: string
}

export default function NewestProductList() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get('/api/products?sort=newest&limit=5')
        setProducts(res.data.products)
      } catch (error) {
        console.error('Lỗi tải sản phẩm mới:', error)
      }
    }

    fetchProducts()
  }, [])

  return (
    <div className="row-3">
      {products.map((product, index) => (
        <div className="col-5-sp" key={product._id}>
          <div className="img-sp">
            <img src={product.variants[0]?.image} alt={product.name} />
          </div>
          <div className="text-sp">
            <div className="left-sp">
              <p className="name-sp">{product.name}</p>
              <p
                style={{
                  color: '#cd1919',
                  fontSize: 16,
                  fontWeight: 550,
                  marginBottom: 7
                }}
              >
                {product.discount.toLocaleString()}₫{' '}
                <del style={{ color: '#979797', fontSize: 14 }}>
                  {product.price.toLocaleString()} ₫
                </del>
              </p>
              <a href={`/san-pham/${product.slug}`}>Mua ngay</a>
            </div>
            <div className="right-sp">
              <HeartLikeBtn itemKey={product._id} />
              <button>
                <i className="fa-solid fa-cart-plus" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
