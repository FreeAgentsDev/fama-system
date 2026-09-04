import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fama-atmosphere fama-atmosphere-plain min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
