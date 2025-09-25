import type { ReactNode } from "react";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import { LikeProvider } from "../../components/ui/LikeContext";
import LikePopup from "../../components/ui/LikePopup";
import { VariantModalProvider } from "@/components/providers/VariantModalProvider";

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="vi">
      <body>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
        />
        <Header />
        <LikeProvider>
          {/* Bọc Provider để mọi component bên trong dùng chung popup */}
          <VariantModalProvider>
            <LikePopup />
            {children}
          </VariantModalProvider>
        </LikeProvider>
        <Footer />
      </body>
    </html>
  );
}
