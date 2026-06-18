"use client";

import { useAuth } from "@/context/AuthContext";
import { Loader2, Lock, LogIn } from "lucide-react";
import Link from "next/link";
import React from "react";

interface RequireAuthProps {
  children: React.ReactNode;
  title?: string;
  message?: string;
}

export default function RequireAuth({ 
  children, 
  title = "Đăng nhập để tiếp tục", 
  message = "Bạn cần đăng nhập để truy cập trang này và lưu trữ tiến trình học tập." 
}: RequireAuthProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div className="glass" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '450px', width: '100%', borderRadius: 'var(--radius-xl)' }}>
          <Lock size={64} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }} />
          <h2 className="h2 mb-4">{title}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            {message}
          </p>
          <Link href="/" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogIn size={20} /> Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
