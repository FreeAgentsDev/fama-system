import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
