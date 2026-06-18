"use client";

import Link from "next/link";
import { ArrowRight, Clock, Target, BarChart2, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface TestData {
  testId: string;
  title: string;
}

export default function Home() {
  const [recentTests, setRecentTests] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "tests"));
        const testsData: TestData[] = [];
        querySnapshot.forEach((doc) => {
          testsData.push({ testId: doc.id, title: doc.data().title });
        });
        setRecentTests(testsData);
      } catch (error) {
        console.error("Error fetching tests:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTests();
  }, []);

  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center animate-fade-in" style={{ textAlign: 'center', marginBottom: '6rem' }}>
        <div className="badge" style={{ marginBottom: '1.5rem' }}>🔥 Phiên bản thử nghiệm (Beta)</div>
        <h1 className="h1" style={{ marginBottom: '1.5rem', maxWidth: '800px' }}>
          Chinh phục điểm tuyệt đối <br/>
          <span className="text-gradient">IELTS Reading</span>
        </h1>
        <p className="text-muted" style={{ fontSize: '1.25rem', marginBottom: '2.5rem', maxWidth: '600px' }}>
          Hệ thống thi thử mô phỏng 100% giao diện thi thật. Chấm điểm tự động và phân tích lỗi sai bằng AI để tối ưu hóa điểm số của bạn.
        </p>
        <div className="flex gap-4">
          <Link href="/practice" className="btn btn-primary">
            Bắt đầu thi thử <ArrowRight size={20} />
          </Link>
          <Link href="/analytics" className="btn btn-outline">
            Xem lịch sử
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid lg:grid-cols-3 gap-6 animate-fade-in delay-100" style={{ marginBottom: '6rem' }}>
        <Link href="/practice?mode=full" style={{ display: 'block' }}>
          <div className="card" style={{ height: '100%' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-full)', width: 'fit-content', marginBottom: '1.5rem' }}>
              <Target size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="h3" style={{ marginBottom: '1rem' }}>Mô Phỏng Thực Tế</h3>
            <p className="text-muted">Trải nghiệm giao diện thi máy tính chính xác như kỳ thi thật từ Hội đồng Anh & IDP.</p>
          </div>
        </Link>
        <Link href="/analytics" style={{ display: 'block' }}>
          <div className="card" style={{ height: '100%' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-full)', width: 'fit-content', marginBottom: '1.5rem' }}>
              <BarChart2 size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="h3" style={{ marginBottom: '1rem' }}>Phân Tích Chi Tiết</h3>
            <p className="text-muted">Hệ thống tự động thống kê dạng câu hỏi bạn làm sai nhiều nhất và gợi ý cải thiện.</p>
          </div>
        </Link>
        <Link href="/practice?mode=partial" style={{ display: 'block' }}>
          <div className="card" style={{ height: '100%' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-full)', width: 'fit-content', marginBottom: '1.5rem' }}>
              <Clock size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="h3" style={{ marginBottom: '1rem' }}>Luyện Tập Linh Hoạt</h3>
            <p className="text-muted">Cắt nhỏ đề thi để luyện từng Passage riêng biệt, tối ưu thời gian học tập.</p>
          </div>
        </Link>
      </section>

      {/* Tests List */}
      <section className="animate-fade-in delay-200">
        <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
          <h2 className="h2">Đề thi mới nhất</h2>
          <Link href="/practice" style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Xem tất cả <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 flex justify-center py-10">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : recentTests.length > 0 ? (
            recentTests.map((test) => (
              <div key={test.testId} className="card">
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                  <span className="badge">Academic</span>
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>Mới</span>
                </div>
                <h3 className="h3" style={{ marginBottom: '1.5rem' }}>{test.title}</h3>
                <div className="flex justify-between items-center" style={{ marginTop: 'auto' }}>
                  <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                    Full 3 Passages
                  </div>
                  <Link href={`/test/${test.testId}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                    Làm bài
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center text-muted py-10">
              Chưa có đề thi nào trong hệ thống. Hãy vào Admin để thêm đề thi.
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
