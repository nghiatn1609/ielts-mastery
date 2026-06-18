"use client";

import Link from "next/link";
import { BookOpen, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

export default function Header() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="glass">
      <div className="container flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen size={28} style={{ color: 'var(--primary)' }} />
          <span className="h3 text-gradient" style={{ margin: 0 }}>IELTS Mastery</span>
        </Link>
        
        <nav className="flex items-center gap-6">
          <Link href="/practice" className="nav-link">Luyện tập</Link>
          <Link href="/analytics" className="nav-link">Phân tích</Link>
          <Link href="/vocabulary" className="nav-link">Sổ tay</Link>
          {user && (
            <Link href="/admin" className="nav-link" style={{ color: 'var(--primary)', fontWeight: 600 }}>Quản trị Admin</Link>
          )}
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }}></div>
          
          {loading ? (
            <div style={{ width: '100px', height: '40px' }}></div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <Image 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    width={32} 
                    height={32} 
                    style={{ borderRadius: '50%' }}
                  />
                )}
                <span className="text-muted" style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                  {user.displayName?.split(' ')[0]}
                </span>
              </div>
              <button 
                onClick={signOut}
                className="btn btn-outline flex items-center gap-2" 
                style={{ padding: '0.5rem 1rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="btn btn-primary flex items-center gap-2" 
              style={{ padding: '0.5rem 1rem' }}
            >
              <LogIn size={18} /> Đăng nhập
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
