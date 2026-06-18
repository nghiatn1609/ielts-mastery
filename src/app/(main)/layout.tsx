import Link from "next/link";
import { BookOpen, LogIn } from "lucide-react";
import Header from "@/components/layout/Header";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="hero-bg"></div>
      <Header />
      <main>
        {children}
      </main>
    </>
  );
}
