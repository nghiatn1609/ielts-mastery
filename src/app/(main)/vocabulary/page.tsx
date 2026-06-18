"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { Loader2, LogIn, BookOpen, Trash2, Volume2 } from "lucide-react";
import Link from "next/link";

interface VocabItem {
  id: string;
  word: string;
  pos: string;
  phonetic: string;
  translation: string;
  definition: string;
  context: string;
  timestamp: string;
}

export default function VocabularyPage() {
  const { user, loading: authLoading } = useAuth();
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Flashcard States
  const [studyMode, setStudyMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchVocab = async () => {
      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "vocabulary"),
          where("userId", "==", user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const data: VocabItem[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            word: docData.word,
            pos: docData.pos,
            phonetic: docData.phonetic,
            translation: docData.translation,
            definition: docData.definition,
            context: docData.context,
            timestamp: docData.timestamp
          });
        });

        // Sort descending by timestamp locally
        data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (isMounted) setVocabList(data);
      } catch (error) {
        console.error("Error fetching vocabulary:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVocab();
    return () => { isMounted = false; };
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa từ này khỏi sổ tay?")) return;
    try {
      await deleteDoc(doc(db, "vocabulary", id));
      setVocabList(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error("Lỗi khi xóa từ vựng", err);
      alert("Không thể xóa từ vựng.");
    }
  };

  const playAudio = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  if (authLoading || loading) {
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
          <BookOpen size={64} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }} />
          <h2 className="h2 mb-4">Đăng nhập để xem sổ tay</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Bạn cần đăng nhập để lưu trữ và ôn tập từ vựng của mình.
          </p>
          <Link href="/" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogIn size={20} /> Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 className="h1 mb-2">Sổ Tay Từ Vựng</h1>
          <p style={{ color: 'var(--text-muted)' }}>Bạn đã lưu {vocabList.length} từ vựng mới.</p>
        </div>
        {vocabList.length > 0 && (
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => {
              setStudyMode(true);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
          >
            <BookOpen size={18} /> Ôn tập bằng Flashcard
          </button>
        )}
      </div>

      {vocabList.length === 0 ? (
        <div className="glass" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Sổ tay của bạn đang trống.</p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Hãy bôi đen và bấm biểu tượng "Quyển sách" trong lúc luyện đề để lưu từ mới nhé!
          </p>
          <Link href="/practice" className="btn btn-primary mt-6 inline-block">
            Đến phòng luyện thi
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vocabList.map((item) => (
            <div key={item.id} className="card glass flex flex-col" style={{ position: 'relative' }}>
              <button 
                onClick={() => handleDelete(item.id)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                title="Xóa"
              >
                <Trash2 size={16} className="hover:text-red-500 transition-colors" />
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <h3 className="h3" style={{ margin: 0, color: 'var(--primary)' }}>{item.word}</h3>
                <button 
                  onClick={() => playAudio(item.word)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', opacity: 0.7 }}
                  title="Nghe phát âm"
                >
                  <Volume2 size={18} />
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{item.pos}</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.phonetic}</span>
              </div>
              
              <div style={{ marginBottom: '1.5rem', flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.5rem' }}>{item.translation}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.definition}</p>
              </div>
              
              <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ngữ cảnh (Context)</p>
                <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  "...{item.context}..."
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Flashcard Study Mode Overlay */}
      {studyMode && vocabList.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          
          <button 
            style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}
            onClick={() => setStudyMode(false)}
          >
            Đóng <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>&times;</span>
          </button>

          <div style={{ color: 'white', marginBottom: '2rem', fontSize: '1.2rem', fontWeight: 500, opacity: 0.8 }}>
            Flashcard {currentIndex + 1} / {vocabList.length}
          </div>

          <div 
            style={{ 
              width: '100%', 
              maxWidth: '600px', 
              height: '400px', 
              perspective: '1000px',
              cursor: 'pointer'
            }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'
            }}>
              
              {/* Front Side */}
              <div className="glass" style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                padding: '2rem'
              }}>
                <h2 style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem', textAlign: 'center', wordBreak: 'break-word' }}>
                  {vocabList[currentIndex].word}
                </h2>
                <button 
                  className="btn btn-outline"
                  style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem' }}
                  onClick={(e) => playAudio(vocabList[currentIndex].word, e)}
                  title="Nghe phát âm"
                >
                  <Volume2 size={24} />
                </button>
                <p style={{ position: 'absolute', bottom: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chạm để lật thẻ</p>
              </div>

              {/* Back Side */}
              <div className="glass" style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                padding: '3rem'
              }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.5rem', textAlign: 'center' }}>
                    {vocabList[currentIndex].translation}
                  </h3>
                  
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Ngữ cảnh</p>
                    <p style={{ fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      "...{vocabList[currentIndex].context}..."
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem' }}>
            <button 
              className="btn btn-outline"
              style={{ padding: '0.75rem 2rem', fontSize: '1.1rem', backgroundColor: 'var(--bg-elevated)' }}
              disabled={currentIndex === 0}
              onClick={() => {
                setIsFlipped(false);
                setTimeout(() => setCurrentIndex(prev => prev - 1), 150); // delay content change until flipping back
              }}
            >
              &larr; Quay lại
            </button>
            <button 
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
              onClick={() => {
                if (currentIndex < vocabList.length - 1) {
                  setIsFlipped(false);
                  setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
                } else {
                  setStudyMode(false);
                  alert("Chúc mừng! Bạn đã ôn tập xong toàn bộ từ vựng.");
                }
              }}
            >
              {currentIndex < vocabList.length - 1 ? "Tiếp theo \u2192" : "Hoàn thành!"}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
