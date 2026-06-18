"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { Loader2, TrendingUp, BookOpen, Target } from "lucide-react";
import Link from "next/link";
import RequireAuth from "@/components/auth/RequireAuth";

interface TestResult {
  id: string;
  testId: string;
  testTitle: string;
  score: number;
  total: number;
  timestamp: string;
  stats?: { type: string; correct: number; total: number }[];
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    console.log("AnalyticsPage: useEffect triggered, user=", user?.uid);

    const fetchResults = async () => {
      if (!user) {
        console.log("AnalyticsPage: No user, setting loading to false");
        if (isMounted) setLoading(false);
        return;
      }

      try {
        console.log("AnalyticsPage: Fetching results for user:", user.uid);
        const q = query(
          collection(db, "results"),
          where("userId", "==", user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        console.log("AnalyticsPage: Fetched documents count:", querySnapshot.size);
        
        const data: TestResult[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            testId: docData.testId,
            testTitle: docData.testTitle || "IELTS Reading Test",
            score: docData.score,
            total: docData.total,
            timestamp: docData.timestamp,
            stats: docData.stats || []
          });
        });

        // Sort descending by timestamp
        data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (isMounted) setResults(data);
      } catch (error) {
        console.error("AnalyticsPage: Error fetching results:", error);
      } finally {
        if (isMounted) {
          console.log("AnalyticsPage: Setting loading to false in finally block");
          setLoading(false);
        }
      }
    };

    fetchResults();
    return () => { isMounted = false; };
  }, [user]);



  const totalTests = results.length;
  const averageScore = totalTests > 0 
    ? Math.round(results.reduce((acc, curr) => acc + (curr.score / curr.total) * 100, 0) / totalTests) 
    : 0;

  const typeStatsMap = new Map<string, { correct: number; total: number }>();
  results.forEach(result => {
    (result.stats || []).forEach(stat => {
      const current = typeStatsMap.get(stat.type) || { correct: 0, total: 0 };
      typeStatsMap.set(stat.type, {
        correct: current.correct + stat.correct,
        total: current.total + stat.total
      });
    });
  });

  const aggregatedStats = Array.from(typeStatsMap.entries()).map(([type, data]) => ({
    type,
    correct: data.correct,
    total: data.total,
    percentage: Math.round((data.correct / data.total) * 100)
  })).sort((a, b) => a.percentage - b.percentage); // Lowest percentage first

  return (
    <RequireAuth title="Đăng nhập để xem thống kê" message="Bạn cần đăng nhập để lưu trữ và phân tích kết quả học tập của mình.">
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 className="h1 mb-2">Phân Tích Kết Quả</h1>
          <p style={{ color: 'var(--text-muted)' }}>Xin chào, {user?.displayName}!</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="analytics-grid">
        <div className="card glass" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexDirection: 'row' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '1rem', borderRadius: '50%', color: 'var(--primary)' }}>
            <BookOpen size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Tổng số đề đã làm</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 700 }}>{totalTests}</p>
          </div>
        </div>

        <div className="card glass" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexDirection: 'row' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--success)' }}>
            <Target size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Tỉ lệ đúng trung bình</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 700 }}>{averageScore}%</p>
          </div>
        </div>

        <div className="card glass" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexDirection: 'row' }}>
          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--warning)' }}>
            <TrendingUp size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Band Score ước lượng</p>
            <p style={{ fontSize: '1.875rem', fontWeight: 700 }}>
              {averageScore >= 95 ? '8.5+' : 
               averageScore >= 85 ? '7.5 - 8.0' : 
               averageScore >= 75 ? '6.5 - 7.0' : 
               averageScore >= 60 ? '5.5 - 6.0' : 
               averageScore > 0 ? '< 5.0' : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Type Analysis */}
      {aggregatedStats.length > 0 && (
        <>
          <h2 className="h2 mb-6" style={{ marginTop: '3rem' }}>Phân Tích Dạng Bài (Điểm Yếu)</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {aggregatedStats.map((stat) => (
              <div key={stat.type} className="card glass" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{stat.type.replace(/_/g, ' ')}</span>
                  <span style={{ fontWeight: 700, color: stat.percentage >= 80 ? 'var(--success)' : stat.percentage >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                    {stat.percentage}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${stat.percentage}%`, 
                    backgroundColor: stat.percentage >= 80 ? 'var(--success)' : stat.percentage >= 50 ? 'var(--warning)' : 'var(--danger)' 
                  }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Đúng {stat.correct}/{stat.total} câu
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* History List */}
      <h2 className="h2 mb-6" style={{ marginTop: '3rem' }}>Lịch sử làm bài</h2>
      
      {results.length > 0 ? (
        <div className="glass" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-base)' }}>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Tên Đề Thi</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Ngày Làm Bài</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Kết Quả</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const date = new Date(result.timestamp).toLocaleDateString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                const percentage = Math.round((result.score / result.total) * 100);
                
                return (
                  <tr key={result.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }} className="analytics-table-row">
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{result.testTitle}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{date}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 600, color: percentage >= 80 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                          {result.score}/{result.total}
                        </span>
                        <div style={{ flex: 1, maxWidth: '100px', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${percentage}%`, 
                            backgroundColor: percentage >= 80 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--danger)' 
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <Link href={`/test/${result.testId}`} style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.875rem', textDecoration: 'none' }} className="analytics-link">
                        Làm lại
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass" style={{ padding: '2.5rem', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Bạn chưa làm bài thi nào cả.</p>
          <Link href="/practice" className="btn btn-primary">
            Luyện tập ngay
          </Link>
        </div>
      )}
    </div>
    </RequireAuth>
  );
}
