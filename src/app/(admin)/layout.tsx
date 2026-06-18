import { LayoutDashboard, FileUp, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import "../globals.css";

export const metadata = {
  title: "IELTS Mastery Admin",
  description: "Admin panel for IELTS platform",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Link href="/" className="flex items-center gap-2">
            <div style={{ backgroundColor: 'var(--primary)', padding: '0.375rem', borderRadius: 'var(--radius-md)' }}>
              <Settings size={24} style={{ color: 'white' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.025em' }}>Admin<span style={{ color: 'var(--primary)' }}>Panel</span></span>
          </Link>
        </div>
        
        <nav className="admin-sidebar-nav">
          <Link href="/admin" className="admin-nav-item active">
            <FileUp size={20} />
            <span>Upload Đề Thi</span>
          </Link>
          <Link href="/analytics" className="admin-nav-item">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
        </nav>
        
        <div className="admin-sidebar-footer">
          <Link href="/" className="admin-nav-item hover:text-danger">
            <LogOut size={20} />
            <span>Thoát Admin</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <div className="admin-bg-effect"></div>
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}
