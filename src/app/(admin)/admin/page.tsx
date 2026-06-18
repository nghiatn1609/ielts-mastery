"use client";

import { useState, useRef } from "react";
import { Loader2, Save, FileText, CheckCircle2, Upload, GripHorizontal, Plus, Trash2 } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import * as mammoth from "mammoth";
import { parseIeltsDocxHtml } from "./parser";
import AIUploadComponent from "./ai-upload";

interface PassageInput {
  title: string;
  content: string;
  startQ: number;
  endQ: number;
  questionGroups: any[];
}

export default function AdminUploadPage() {
  const [testTitle, setTestTitle] = useState("IELTS Reading Test");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [extractingWord, setExtractingWord] = useState(false);
  
  // Passages State
  const [passages, setPassages] = useState<PassageInput[]>([{title: "Passage 1", content: "", startQ: 1, endQ: 40, questionGroups: []}]);
  const [activeTab, setActiveTab] = useState(0);

  // Manual Builder State
  const [numQuestions, setNumQuestions] = useState(40);
  const [manualAnswers, setManualAnswers] = useState<Record<number, string>>({});

  const passageFileInput = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtractingWord(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Chuyển đổi sang HTML để giữ nguyên định dạng Bảng (Tables), In đậm, v.v.
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const htmlContent = result.value;

      // Sử dụng Advanced Parser
      const parsedPassages = parseIeltsDocxHtml(htmlContent);

      if (parsedPassages.length > 0) {
        const newPassages = parsedPassages.map(p => ({
          title: p.title,
          content: p.content, // Now strictly the passage text without questions
          startQ: p.startQ || 1,
          endQ: p.endQ || 13,
          questionGroups: p.questionGroups || []
        }));
        
        // Đảm bảo kết thúc ở câu 40 nếu có 3 passage
        if (newPassages.length === 3) {
          newPassages[2].endQ = 40;
        }

        setPassages(newPassages);
        setActiveTab(0);
        setNumQuestions(newPassages[newPassages.length - 1].endQ);
      } else {
        // Fallback if no "PASSAGE X" is found
        setPassages([{title: "Passage 1", content: htmlContent, startQ: 1, endQ: 40, questionGroups: []}]);
        setActiveTab(0);
        setNumQuestions(40);
      }
    } catch (error) {
      console.error("Lỗi khi đọc file Word:", error);
      alert("Không thể đọc file Word. Vui lòng đảm bảo file không bị lỗi định dạng.");
    } finally {
      setExtractingWord(false);
      e.target.value = '';
    }
  };

  const handleAnswerChange = (qNum: number, val: string) => {
    setManualAnswers(prev => ({
      ...prev,
      [qNum]: val
    }));
  };

  const handleUpdatePassage = (index: number, field: keyof PassageInput, value: any) => {
    const newP = [...passages];
    newP[index] = { ...newP[index], [field]: value };
    setPassages(newP);
  };

  const handleSaveToDatabase = async () => {
    if (passages.length === 0 || !passages[0].content.trim()) {
      alert("Vui lòng nhập hoặc upload nội dung đề thi!");
      return;
    }
    
    setIsSaving(true);
    try {
      const payloadPassages = passages.map((p) => {
        const pQuestions = [];
        for (let i = p.startQ; i <= p.endQ; i++) {
          pQuestions.push({
            id: `q${i}`,
            number: i,
            type: "FILL_IN_THE_BLANK",
            text: `Question ${i}`,
            options: [],
            correctAnswer: manualAnswers[i] || ""
          });
        }
        return {
          title: p.title,
          content: p.content,
          questionGroups: p.questionGroups || [],
          questions: pQuestions
        };
      });

      const payload = {
        title: testTitle,
        passages: payloadPassages,
        createdAt: new Date().toISOString()
      };

      const savePromise = addDoc(collection(db, "tests"), payload);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: Database connection failed")), 5000)
      );

      await Promise.race([savePromise, timeoutPromise]);
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setPassages([{title: "Passage 1", content: "", startQ: 1, endQ: 40, questionGroups: []}]);
        setManualAnswers({});
        setTestTitle("IELTS Reading Test");
        setActiveTab(0);
      }, 3000);
    } catch (error: any) {
      console.error("Lỗi khi lưu đề thi:", error);
      alert(`Không thể lưu vào Database: ${error.message}. Vui lòng đảm bảo bạn đã tạo Firestore Database trong Firebase Console.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.025em', color: 'var(--success)' }}>
            Tạo Đề Thi (BẢN MỚI V2)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            Upload file Word, hệ thống tự động cắt bài thành 3 Passage và gán ô đáp án cho bạn nhập.
          </p>
        </div>
        
        <button 
          onClick={handleSaveToDatabase}
          disabled={isSaving || saveSuccess || passages.length === 0 || !passages[0].content.trim()}
          className="btn"
          style={{
            backgroundColor: saveSuccess ? 'var(--success)' : 'var(--primary)',
            color: 'white',
            padding: '1rem 2rem',
            fontSize: '1.125rem',
            opacity: (isSaving || saveSuccess || passages.length === 0 || !passages[0].content.trim()) ? 0.8 : 1,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            boxShadow: '0 0 20px rgba(67, 97, 238, 0.4)'
          }}
        >
          {isSaving ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={24} /> : 
           saveSuccess ? <CheckCircle2 size={24} /> : <Save size={24} />}
          {saveSuccess ? "Đã Lưu Đề Thi Thành Công!" : "Lưu Đề Thi Mới"}
        </button>
      </div>

      <AIUploadComponent />

      <div className="flex flex-col gap-6" style={{ marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Tên bộ đề (VD: Cambridge 18 Test 1)"
          value={testTitle}
          onChange={(e) => setTestTitle(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
        />
      </div>

      <div className="admin-upload-grid">
        {/* Khu vực 1: Đề thi (Passages) */}
        <div className="admin-box" style={{ height: '700px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2" style={{ color: 'var(--primary)' }}>
              <FileText size={20} />
              <h3 style={{ fontWeight: 600, color: 'white', fontSize: '1.1rem' }}>Bài Đọc (Passages)</h3>
            </div>
            
            <input 
              type="file" 
              accept=".docx" 
              ref={passageFileInput} 
              className="hidden" 
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => passageFileInput.current?.click()}
              disabled={extractingWord}
              className="btn btn-outline" 
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderColor: 'rgba(255,255,255,0.2)', color: '#e2e8f0' }}
            >
              {extractingWord ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Upload Word (.docx)
            </button>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginBottom: '1.5rem', 
            flexWrap: 'wrap', 
            background: 'rgba(255,255,255,0.05)', 
            padding: '0.75rem', 
            borderRadius: 'var(--radius-md)',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>Các phần thi:</span>
            {passages.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', background: activeTab === i ? 'var(--primary)' : 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <button 
                  onClick={() => setActiveTab(i)}
                  style={{
                    padding: '0.5rem 1rem',
                    color: 'white',
                    fontWeight: activeTab === i ? 600 : 400,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p.title}
                </button>
                {passages.length > 1 && (
                  <button 
                    onClick={() => {
                      const newP = passages.filter((_, idx) => idx !== i);
                      setPassages(newP);
                      if (activeTab >= newP.length) setActiveTab(newP.length - 1);
                    }}
                    style={{ padding: '0.5rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', background: 'rgba(0,0,0,0.2)' }}
                    title="Xoá Passage này"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                const startQ = passages.length > 0 ? passages[passages.length - 1].endQ + 1 : 1;
                const endQ = Math.min(startQ + 12, 40);
                setPassages([...passages, { title: `Passage ${passages.length + 1}`, content: '', startQ, endQ, questionGroups: [] }]);
                setActiveTab(passages.length);
              }}
              style={{ 
                padding: '0.5rem 1rem', 
                color: 'white', 
                background: 'var(--success)', 
                borderRadius: 'var(--radius-sm)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem',
                fontWeight: 600,
                marginLeft: 'auto'
              }}
            >
              <Plus size={16} /> Thêm Passage (Thủ công)
            </button>
          </div>

          {passages.length > 0 && passages[activeTab] && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={passages[activeTab].title}
                  onChange={(e) => handleUpdatePassage(activeTab, 'title', e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <span>Câu hỏi từ:</span>
                  <input 
                    type="number" 
                    value={passages[activeTab].startQ}
                    onChange={(e) => handleUpdatePassage(activeTab, 'startQ', parseInt(e.target.value) || 1)}
                    style={{ width: '60px', padding: '0.25rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white', textAlign: 'center' }}
                  />
                  <span>đến</span>
                  <input 
                    type="number" 
                    value={passages[activeTab].endQ}
                    onChange={(e) => handleUpdatePassage(activeTab, 'endQ', parseInt(e.target.value) || 1)}
                    style={{ width: '60px', padding: '0.25rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white', textAlign: 'center' }}
                  />
                </div>
              </div>
              <div 
                contentEditable
                className="admin-textarea passage-html-content"
                style={{ flex: 1, minHeight: 0, overflowY: 'auto', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', color: 'white', outline: 'none' }}
                dangerouslySetInnerHTML={{ __html: passages[activeTab].content || '<p style="color: gray;">Nội dung đoạn văn sẽ xuất hiện ở đây...</p>' }}
                onBlur={(e) => handleUpdatePassage(activeTab, 'content', e.currentTarget.innerHTML)}
              />
            </div>
          )}
        </div>

        {/* Khu vực 2: Answer Key Grid */}
        <div className="admin-box" style={{ height: '700px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2" style={{ color: 'var(--warning)' }}>
              <GripHorizontal size={20} />
              <h3 style={{ fontWeight: 600, color: 'white', fontSize: '1.1rem' }}>Answer Sheet</h3>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Tổng số câu:</span>
              <input 
                type="number" 
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 0)}
                style={{ width: '60px', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', textAlign: 'center' }}
              />
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
            {passages.map((p, pIdx) => (
              <div key={pIdx} style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  {p.title} (Câu {p.startQ} - {p.endQ})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                  {Array.from({ length: p.endQ - p.startQ + 1 }).map((_, i) => {
                    const qNum = p.startQ + i;
                    // Don't render inputs that are completely out of bounds of numQuestions
                    if (qNum > numQuestions) return null;
                    return (
                      <div key={qNum} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '24px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{qNum}.</span>
                        <input 
                          type="text" 
                          value={manualAnswers[qNum] || ''}
                          onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                          placeholder="Đáp án..."
                          style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s' }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
