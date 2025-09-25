"use client";

import { useEffect, useState } from "react";
import "../../public/css/home.css";
import "../../public/css/blog-mobile.css";
import BannerSlider from "../../components/ui/BannerSlider";
import CategoryCarousel from "../../components/ui/CategoryCarousel";
import HeartLikeBtn from "../../components/ui/HeartLikeBtn";
import HotDealBanner from "../../components/ui/HotDealBanner";
import NewestProductList from '../../components/ui/NewestProductList';
import NewAndHotProduct from '@/components/ui/NewAndHotProduct';
import CategoryProductTabs from '@/components/ui/TshirtPoloTabs';
import CategoryTabsBottom from '@/components/ui/ShortJeansTabs';
import VoucherCarousel from "@/components/ui/VoucherCarousel";
import BlogList from "@/components/ui/BlogList";
import axios from "axios";

export default function Home() {
  
  return (
    <>
  <BannerSlider />
  <main>
    <div className="row-1 mgtb-10">
      <div className="col-4">
        <div className="icon-ship">
          <img src="images/icon-ship1.webp" alt="" />
        </div>
        <div className="text-ship">
          <p>Miễn phí vận chuyển</p>
          <span style={{ fontSize: 15, fontWeight: 400 }}>
            Đơn hàng từ 250k
          </span>
        </div>
      </div>
      <div className="col-4">
        <div className="icon-ship">
          <img src="images/icon-ship2.webp" alt="" />
        </div>
        <div className="text-ship">
          <p>Miễn phí vận chuyển</p>
          <span style={{ fontSize: 15, fontWeight: 400 }}>
            Đơn hàng từ 250k
          </span>
        </div>
      </div>
      <div className="col-4">
        <div className="icon-ship">
          <img src="images/icon-ship3.webp" alt="" />
        </div>
        <div className="text-ship">
          <p>Miễn phí vận chuyển</p>
          <span style={{ fontSize: 15, fontWeight: 400 }}>
            Đơn hàng từ 250k
          </span>
        </div>
      </div>
      <div className="col-4">
        <div className="icon-ship ship" style={{ width: 60, height: 60 }}>
          <i className="fa-solid fa-phone-volume" />
        </div>
        <div className="text-ship">
          <p>Miễn phí vận chuyển</p>
          <span style={{ fontSize: 15, fontWeight: 400 }}>
            Đơn hàng từ 250k
          </span>
        </div>
      </div>
    </div>

    <h1 className="title">
      DANH MỤC SẢN PHẨM
    </h1>
    <CategoryCarousel />
 </main>

 <section className="banner2">
    <img src="images/banner-2.1.jpg" alt="" />
  </section>
    <section className="new-sp">
   <VoucherCarousel />
    
    <HotDealBanner />
    </section>

  <section className="banner2">
    <img src="images/banner2.png" alt="" />
  </section>

  <NewAndHotProduct />
  <div className="banner-3">
    <img src="images/banner3.png" alt="" />
  </div>
  {/* áo thun */}
  <CategoryProductTabs />
  {/* quần short */}
  <CategoryTabsBottom />
  <div className="banner-4">
    <img src="images/banner4.png" alt="" />
  </div>

   <BlogList />
</>

  );
}
