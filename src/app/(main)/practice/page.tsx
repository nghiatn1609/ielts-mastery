"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { 
  Filter, Search, BookOpen, Headphones, PenTool, 
  Clock, Users, MessageSquare, ChevronDown, Loader2
} from "lucide-react";
import RequireAuth from "@/components/auth/RequireAuth";

interface PassageItem {
  id: string; // "testId_passageIndex"
  testId: string;
  testTitle: string;
  passageIndex: number;
  type: string;
  image: string;
  title: string;
}

export default function PracticePage() {
  const [passages, setPassages] = useState<PassageItem[]>([]);
  const [fullTests, setFullTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [skillFilter, setSkillFilter] = useState("ALL");
  const [testTypeFilter, setTestTypeFilter] = useState("PARTIAL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get("mode");
      if (mode === "full") {
        setTestTypeFilter("FULL");
      } else if (mode === "partial") {
        setTestTypeFilter("PARTIAL");
      }
    }
  }, []);

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [timeMinutes, setTimeMinutes] = useState(20);

  const router = useRouter();

  // Mock static images for beautiful UI
  const thumbnails = [
    "/images/ielts_roman_ruins_1781720914801.png",
    "/images/ielts_farm_roots_1781720929334.png",
    "/images/ielts_baby_nursery_1781720941326.png"
  ];

  useEffect(() => {
    const fetchPassages = async () => {
      try {
        const q = query(collection(db, "tests"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const data: PassageItem[] = [];
        const fullTestsData: any[] = [];
        
        querySnapshot.forEach((doc) => {
          const testData = doc.data();
          const testId = doc.id;
          const testTitle = testData.title || "IELTS Reading Test";
          
          if (testData.passages && Array.isArray(testData.passages)) {
            fullTestsData.push({
              id: testId,
              testId: testId,
              testTitle: testTitle,
              type: testData.type || "READING",
              image: thumbnails[0],
              title: testTitle,
              passageCount: testData.passages.length
            });

            testData.passages.forEach((passage: any, index: number) => {
              data.push({
                id: `${testId}_${index}`,
                testId: testId,
                testTitle: testTitle,
                passageIndex: index + 1,
                type: testData.type || "READING",
                image: thumbnails[index % thumbnails.length], // Rotate mock thumbnails
                title: passage.title || `Passage ${index + 1}`
              });
            });
          }
        });
        
        setFullTests(fullTestsData);
        setPassages(data);
      } catch (error) {
        console.error("Error fetching practice items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPassages();
  }, []);

  const displayedItems = (testTypeFilter === "PARTIAL" ? passages : fullTests).filter((item) => {
    if (skillFilter !== "ALL" && item.type !== skillFilter) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.testTitle.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <RequireAuth title="Đăng nhập để luyện tập" message="Bạn cần đăng nhập để chọn bài và lưu lịch sử làm bài.">
      <div className="practice-layout flex h-screen bg-base">
        {/* Sidebar */}
        <aside className="practice-sidebar glass">
          <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-muted">
              <Filter size={20} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Bộ lọc</span>
            </div>
            <span className="text-xs text-muted" style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '4px' }}>
              {displayedItems.length} kết quả
            </span>
          </div>

          <div>
            {/* Kỹ năng */}
            <div className="practice-filter-group">
              <div className="practice-filter-title">
                Kỹ năng <ChevronDown size={16} />
              </div>
              <div className="practice-filter-options">
                <button 
                  className={`practice-filter-btn ${skillFilter === 'ALL' ? 'active' : 'glass text-muted'}`}
                  onClick={() => setSkillFilter('ALL')}
                >
                  <BookOpen size={20} />
                  <span className="text-xs">Tất cả</span>
                </button>
                <button 
                  className={`practice-filter-btn ${skillFilter === 'READING' ? 'active' : 'glass text-muted'}`}
                  onClick={() => setSkillFilter('READING')}
                >
                  <BookOpen size={20} />
                  <span className="text-xs">Reading</span>
                </button>
                <button 
                  className={`practice-filter-btn ${skillFilter === 'LISTENING' ? 'active' : 'glass text-muted'}`}
                  onClick={() => setSkillFilter('LISTENING')}
                >
                  <Headphones size={20} />
                  <span className="text-xs">Listening</span>
                </button>
                <button 
                  className={`practice-filter-btn ${skillFilter === 'WRITING' ? 'active' : 'glass text-muted'}`}
                  onClick={() => setSkillFilter('WRITING')}
                >
                  <PenTool size={20} />
                  <span className="text-xs">Writing</span>
                </button>
              </div>
            </div>

            <hr style={{ borderTop: '1px solid var(--border)', borderBottom: 'none', margin: '1.5rem 0' }} />

            {/* Dạng bài */}
            <div className="practice-filter-group">
              <div className="practice-filter-title">
                Dạng bài <ChevronDown size={16} />
              </div>
              <div className="practice-filter-list">
                <label className="practice-radio-item" onClick={() => setTestTypeFilter('FULL')}>
                  <div className={`practice-radio-box ${testTypeFilter === 'FULL' ? 'active' : ''}`}>
                    {testTypeFilter === 'FULL' && <div className="practice-radio-inner"></div>}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: testTypeFilter === 'FULL' ? 'var(--primary)' : 'inherit' }}>Chỉ hiện Full Test</div>
                    <div className="text-xs text-muted mt-1">Các phòng luyện đủ kỹ năng theo từng part/section.</div>
                  </div>
                </label>
                <label className="practice-radio-item" onClick={() => setTestTypeFilter('PARTIAL')}>
                  <div className={`practice-radio-box ${testTypeFilter === 'PARTIAL' ? 'active' : ''}`}>
                    {testTypeFilter === 'PARTIAL' && <div className="practice-radio-inner"></div>}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: testTypeFilter === 'PARTIAL' ? 'var(--primary)' : 'inherit' }}>Chỉ hiện Test lẻ</div>
                    <div className="text-xs text-muted mt-1">Các phòng luyện một passage hoặc một section.</div>
                  </div>
                </label>
              </div>
            </div>

            <hr style={{ borderTop: '1px solid var(--border)', borderBottom: 'none', margin: '1.5rem 0' }} />

            {/* Nguồn tài liệu */}
            <div className="practice-filter-group">
              <div className="practice-filter-title">
                Nguồn tài liệu <ChevronDown size={16} />
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <button 
                  onClick={() => setSourceFilter('ALL')}
                  className={`glass p-2 text-xs ${sourceFilter === 'ALL' ? '' : 'text-muted'}`} 
                  style={{ borderRadius: '8px', color: sourceFilter === 'ALL' ? 'var(--primary)' : '', borderColor: sourceFilter === 'ALL' ? 'var(--primary)' : '', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sourceFilter === 'ALL' ? 'var(--primary)' : 'var(--text-muted)' }}></span> Tất cả
                </button>
                <button 
                  onClick={() => setSourceFilter('VOL')}
                  className={`glass p-2 text-xs ${sourceFilter === 'VOL' ? '' : 'text-muted'}`} 
                  style={{ borderRadius: '8px', color: sourceFilter === 'VOL' ? 'var(--primary)' : '', borderColor: sourceFilter === 'VOL' ? 'var(--primary)' : '', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sourceFilter === 'VOL' ? 'var(--primary)' : 'var(--text-muted)' }}></span> VOL
                </button>
                <button 
                  onClick={() => setSourceFilter('CAMB')}
                  className={`glass p-2 text-xs ${sourceFilter === 'CAMB' ? '' : 'text-muted'}`} 
                  style={{ borderRadius: '8px', color: sourceFilter === 'CAMB' ? 'var(--primary)' : '', borderColor: sourceFilter === 'CAMB' ? 'var(--primary)' : '', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sourceFilter === 'CAMB' ? 'var(--primary)' : 'var(--text-muted)' }}></span> CAMB
                </button>
                <button 
                  onClick={() => setSourceFilter('OTHER')}
                  className={`glass p-2 text-xs ${sourceFilter === 'OTHER' ? '' : 'text-muted'}`} 
                  style={{ borderRadius: '8px', color: sourceFilter === 'OTHER' ? 'var(--primary)' : '', borderColor: sourceFilter === 'OTHER' ? 'var(--primary)' : '', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sourceFilter === 'OTHER' ? 'var(--primary)' : 'var(--text-muted)' }}></span> Khác
                </button>
              </div>
            </div>

          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="practice-main">
        {/* Search Bar */}
        <div className="glass practice-search">
          <Search size={20} className="text-muted" style={{ marginRight: '0.5rem' }} />
          <input 
            type="text" 
            placeholder={`Tìm kiếm từ ${displayedItems.length > 0 ? displayedItems.length : '...'} phòng học...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Grid Cards */}
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: '200px' }}>
            <Loader2 className="text-primary" size={48} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="glass p-6 text-center card">
            <BookOpen size={48} className="text-muted" style={{ margin: '0 auto 1rem' }} />
            <h3 className="h3 mb-2">Không tìm thấy bài tập nào</h3>
            <p className="text-muted">Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác.</p>
          </div>
        ) : (
          <div className="practice-grid">
            {displayedItems.map((item) => (
              <div key={item.id} className="glass card practice-card">
                
                {/* Image Section */}
                <div className="practice-card-img-wrapper">
                  <Image 
                    src={item.image} 
                    alt={item.title}
                    fill
                    className="practice-card-img"
                  />
                  <div className="practice-card-overlay"></div>
                  
                  {/* Badges */}
                  <div className="practice-card-badge" style={{ left: '12px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span> LIVE
                  </div>
                  
                  <div className="practice-card-badge" style={{ right: '12px', background: 'rgba(255,255,255,0.15)' }}>
                    <BookOpen size={12} /> {item.type}
                  </div>

                  {/* Tags Bottom Image */}
                  <div className="practice-card-tags">
                    <span className="practice-card-tag" style={{ color: 'var(--primary-light)' }}>
                      <BookOpen size={10} /> {item.testTitle.replace('IELTS Reading Test ', '')}
                    </span>
                    {testTypeFilter === 'PARTIAL' && (
                      <span className="practice-card-tag" style={{ color: 'white' }}>
                        <Filter size={10} /> Passage {item.passageIndex}
                      </span>
                    )}
                    {testTypeFilter === 'FULL' && (
                      <span className="practice-card-tag" style={{ color: 'white' }}>
                        <Filter size={10} /> Full Test ({item.passageCount} Passages)
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div className="practice-card-content">
                  <div className="practice-card-title text-white">
                    {testTypeFilter === 'PARTIAL' ? `${item.testTitle.replace('IELTS Reading Test ', '')} - ${item.title}` : item.title}
                  </div>
                  
                  <div className="practice-card-stats text-muted">
                    <div className="practice-card-stat">
                      <MessageSquare size={14} /> Chat nhóm
                    </div>
                    <div className="practice-card-stat" style={{ color: 'var(--warning)' }}>
                      <Clock size={14} /> {testTypeFilter === 'FULL' ? '60' : '20'}
                    </div>
                    <div className="practice-card-stat">
                      <Users size={14} /> {Math.floor(Math.random() * 50)}/50
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center gap-2 mb-4 text-xs text-muted">
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)' }}></span> Đang chờ tin nhắn đầu tiên
                    </div>
                    {testTypeFilter === 'FULL' ? (
                      <button 
                        onClick={() => {
                          setSelectedItem(item);
                          setTimeMinutes(60);
                          setShowTimeModal(true);
                        }}
                        className="btn btn-primary w-full text-center"
                      >
                        Làm bài
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setSelectedItem(item);
                          setTimeMinutes(20);
                          setShowTimeModal(true);
                        }}
                        className="btn btn-primary w-full text-center"
                      >
                        Làm bài
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>

      {/* Time Settings Modal */}
      {showTimeModal && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-base)', padding: '2rem', borderRadius: 'var(--radius-md)', maxWidth: '400px', width: '90%', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)' }}>
            <h3 className="h3" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Thiết lập bài thi</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              Bạn muốn làm <strong>{selectedItem.title}</strong> trong bao nhiêu phút?
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <input 
                type="number" 
                min="1"
                max="180"
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(parseInt(e.target.value) || 20)}
                className="input"
                style={{ width: '100%', fontSize: '1.25rem', textAlign: 'center', padding: '0.75rem' }}
              />
            </div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', cursor: 'pointer', padding: '1rem', backgroundColor: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
              <input 
                type="checkbox" 
                id="strictModeToggle"
                style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Chế độ phòng thi (Strict Mode)</span>
                <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Chặn Copy/Paste, tự động thu bài khi hết giờ.</span>
              </div>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowTimeModal(false)}
              >
                Hủy
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowTimeModal(false);
                  const isStrict = (document.getElementById('strictModeToggle') as HTMLInputElement)?.checked;
                  let targetUrl = `/test/${selectedItem.testId}?time=${timeMinutes}`;
                  if (testTypeFilter === 'PARTIAL') {
                    targetUrl += `&passage=${selectedItem.passageIndex - 1}`;
                  }
                  if (isStrict) {
                    targetUrl += `&strict=true`;
                  }
                  router.push(targetUrl);
                }}
              >
                Bắt đầu làm bài
              </button>
            </div>
          </div>
        </div>
      )}
    </RequireAuth>
  );
}
