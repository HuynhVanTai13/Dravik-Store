
// src/frontend/app/admin/layout.tsx
import "../../styles/hmf.css";
// src/frontend/app/admin/layout.tsx
import AdminHeader from "@/components/admin/AdminHeader";
import AdminFooter from "@/components/admin/AdminFooter";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <> 
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.3/dist/tailwind.min.css" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
      <AdminHeader />
      <main className="min-h-screen bg-gray-100 p-4">{children}</main>
      <AdminFooter />
    </>
  );
}

