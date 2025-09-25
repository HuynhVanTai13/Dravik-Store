export interface ProductSize {
  size: string;
  stock: number;
}

export interface Product {
  _id?: string;
  name: string;
  price: number;
  discountPrice: number;
  categoryId: string;
  brandId: string;
  description: string;
  images: string[];
  sizes: ProductSize[];
  status: "active" | "inactive";
}
