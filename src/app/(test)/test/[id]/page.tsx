"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Loader2, AlertCircle, CheckCircle2, X, Bold, Clock, ChevronLeft, Book, Bookmark } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import React from "react";

// --- MEMOIZED PASSAGE CONTENT TO PREVENT REACT RE-RENDERS FROM DESTROYING DOM MUTATIONS ---
const MemoizedPassageContent = React.memo(({ html }: { html: string }) => {
  return (
    <div 
      className="passage-html-content"
      style={{ fontSize: '1.125rem', lineHeight: 1.8, color: 'var(--text-primary)' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}, (prevProps, nextProps) => prevProps.html === nextProps.html);

export default function TestPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const testId = params?.id;
  const singlePassageIndex = searchParams?.get('passage');
  const { user } = useAuth();

  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  
  const [activePassage, setActivePassage] = useState(0);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [typeStats, setTypeStats] = useState<any[]>([]);
  
  // Dictionary Modal State
  const [dictModal, setDictModal] = useState<{open: boolean; word: string; contextStr: string; translation: string; saving?: boolean; success?: boolean}>({ open: false, word: "", contextStr: "", translation: "" });

  // Use refs instead of state for everything related to highlighting 
  // to COMPLETELY avoid triggering React re-renders which wipe out manual DOM changes
  const currentRangeRef = useRef<Range | null>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const timeParam = searchParams?.get('time');
  const strictParam = searchParams?.get('strict') === 'true';
  const initialTime = timeParam && !isNaN(parseInt(timeParam)) ? parseInt(timeParam) * 60 : 3600;
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!testId) return;
    const fetchTest = async () => {
      try {
        const docSnap = await getDoc(doc(db, "tests", testId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (singlePassageIndex !== null && data.passages) {
            const pIndex = parseInt(singlePassageIndex);
            if (!isNaN(pIndex) && data.passages[pIndex]) {
              data.passages = [data.passages[pIndex]];
            }
          }
          setTestData(data);
        } else {
          console.error("Test not found");
        }
      } catch (error) {
        console.error("Error fetching test:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId, singlePassageIndex]);

  const handleAnswerChange = (questionId: string, value: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (force: boolean = false) => {
    if (!testData || submitted) return;
    
    const totalQuestions = testData.passages.reduce((acc: number, p: any) => acc + p.questions.length, 0);
    const answeredCount = Object.values(answers).filter(v => v.trim() !== "").length;
    const unanswered = totalQuestions - answeredCount;

    if (unanswered > 0 && !force) {
      setUnansweredCount(unanswered);
      setShowConfirmModal(true);
      return;
    }

    if (showConfirmModal) setShowConfirmModal(false);
    
    let correctCount = 0;
    const stats: Record<string, { correct: number, total: number }> = {};

    testData.passages.forEach((p: any) => {
      // Pre-initialize stats for all groups to ensure they show up even if 0 questions are matched somehow
      p.questionGroups?.forEach((g: any) => {
         const type = g.type || 'UNKNOWN';
         if (!stats[type]) stats[type] = { correct: 0, total: 0 };
      });
      
      p.questions.forEach((q: any) => {
        // Find which group this question belongs to
        const group = p.questionGroups?.find((g: any) => q.number >= g.start && q.number <= g.end);
        const qType = group?.type || 'UNKNOWN';
        if (!stats[qType]) stats[qType] = { correct: 0, total: 0 };

        stats[qType].total++;

        const userAnswer = answers[q.id]?.trim().toLowerCase() || "";
        const expectedAnswer = (q.correctAnswer || q.answer || "").trim().toLowerCase();
        const possibleAnswers = expectedAnswer.split(/[/|]/).map((a: string) => a.trim());
        if (possibleAnswers.includes(userAnswer) && expectedAnswer !== "") {
          correctCount++;
          stats[qType].correct++;
        }
      });
    });

    setScore(correctCount);
    
    const statsArray = Object.keys(stats).map(type => ({
       type,
       correct: stats[type].correct,
       total: stats[type].total
    }));
    setTypeStats(statsArray);
    
    setSubmitted(true);
    setShowResultModal(true);

    try {
      const resultRef = doc(collection(db, "results"));
      await setDoc(resultRef, {
        testId: testId,
        testTitle: testData.title || "IELTS Reading Test",
        userId: user ? user.uid : "anonymous",
        userEmail: user ? user.email : null,
        userName: user ? user.displayName : "Anonymous",
        score: correctCount,
        total: totalQuestions,
        stats: statsArray,
        answers: answers,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error saving result", err);
    }
  };

  // ─── HIGHLIGHT / BOLD LOGIC ────────────────────────────────────────────────

  // Strict Mode Logic
  useEffect(() => {
    if (strictParam && timeLeft === 0 && !submitted) {
      // Auto submit when time runs out in strict mode
      alert("Hết thời gian làm bài! Bài của bạn sẽ tự động được thu.");
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  useEffect(() => {
    if (!strictParam) return;
    
    const blockEvent = (e: Event) => e.preventDefault();
    
    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('paste', blockEvent);
    
    return () => {
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('paste', blockEvent);
    };
  }, [strictParam]);

  const hideToolbar = () => {
    currentRangeRef.current = null;
    if (toolbarRef.current) {
      toolbarRef.current.style.display = 'none';
    }
  };

  const handleMouseUp = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        hideToolbar();
        return;
      }
      
      const anchorNode = selection.anchorNode;
      if (!anchorNode) return;
      
      const parentEl = anchorNode.nodeType === Node.ELEMENT_NODE 
        ? anchorNode as Element 
        : anchorNode.parentElement;
        
      if (parentEl && parentEl.closest('.test-pane')) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        currentRangeRef.current = range.cloneRange();
        
        // Show toolbar via direct DOM manipulation to prevent React re-render
        if (toolbarRef.current) {
          toolbarRef.current.style.display = 'flex';
          toolbarRef.current.style.top = `${rect.top}px`;
          toolbarRef.current.style.left = `${rect.left + rect.width / 2}px`;
        }
      } else {
        hideToolbar();
      }
    }, 10);
  };

  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.highlight-toolbar') && !target.closest('.test-pane')) {
        hideToolbar();
      }
    };
    document.addEventListener('mousedown', handleGlobalMouseDown);
    return () => document.removeEventListener('mousedown', handleGlobalMouseDown);
  }, []);

  const getTextNodesInRange = (range: Range): Node[] => {
    try {
      const nodes: Node[] = [];
      const ancestor = range.commonAncestorContainer;

      if (ancestor.nodeType === Node.TEXT_NODE) {
        nodes.push(ancestor);
        return nodes;
      }

      const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT, null);
      let n = walker.nextNode();
      while (n) {
        // More robust intersection check for Safari
        let intersects = false;
        try {
          if (range.intersectsNode(n)) {
            intersects = true;
          } else {
            const nodeRange = document.createRange();
            nodeRange.selectNodeContents(n);
            const startBeforeNodeEnd = range.compareBoundaryPoints(Range.END_TO_START, nodeRange) === -1;
            const endAfterNodeStart = range.compareBoundaryPoints(Range.START_TO_END, nodeRange) === 1;
            intersects = startBeforeNodeEnd && endAfterNodeStart;
          }
        } catch (e) {
          // Fallback if compareBoundaryPoints fails
        }
        
        if (intersects) {
            nodes.push(n);
        }
        n = walker.nextNode();
      }
      
      if (nodes.length === 0) {
          console.warn("No text nodes found to highlight in the selected range.");
      }
      return nodes;
    } catch (e: any) {
      alert("Error in getTextNodesInRange: " + e.message);
      return [];
    }
  };

  const wrapTextNode = (node: Node, range: Range, format: 'bold' | 'highlight', colorCode?: string) => {
    try {
      let start = 0;
      let end = node.nodeValue?.length ?? 0;
      if (node === range.startContainer) start = range.startOffset;
      if (node === range.endContainer) end = range.endOffset;
      if (start >= end) return;
      
      const text = node.nodeValue || '';
      
      const el = document.createElement(format === 'bold' ? 'b' : 'mark');
      
      if (format === 'bold') {
        el.className = 'custom-bold';
        el.setAttribute('data-fmt', 'bold');
        el.setAttribute('style', 'font-weight: 800 !important; color: inherit !important; background-color: transparent;');
      } else {
        el.className = 'custom-hl';
        el.setAttribute('data-fmt', 'highlight');
        el.setAttribute('style', `background-color: ${colorCode} !important; border-radius: 2px; color: inherit !important; font-weight: inherit !important;`);
      }
      el.appendChild(document.createTextNode(text.substring(start, end)));
      const parent = node.parentNode!;
      parent.insertBefore(document.createTextNode(text.substring(0, start)), node);
      parent.insertBefore(el, node);
      parent.insertBefore(document.createTextNode(text.substring(end)), node);
      parent.removeChild(node);
    } catch (e: any) {
      alert("Error in wrapTextNode: " + e.message);
    }
  };

  const applyHighlight = (colorCode: string) => {
    try {
      const range = currentRangeRef.current;
      if (!range) { alert("No range selected!"); return; }
      const nodes = getTextNodesInRange(range);
      if (nodes.length === 0) { console.warn("No text nodes found to highlight!"); return; }
      nodes.forEach(node => wrapTextNode(node, range, 'highlight', colorCode));
      window.getSelection()?.removeAllRanges();
      hideToolbar();
    } catch (e: any) {
      alert("Error in applyHighlight: " + e.message);
    }
  };

  const applyBold = () => {
    try {
      const range = currentRangeRef.current;
      if (!range) { alert("No range selected!"); return; }
      const nodes = getTextNodesInRange(range);
      if (nodes.length === 0) { console.warn("No text nodes found to bold!"); return; }
      nodes.forEach(node => wrapTextNode(node, range, 'bold'));
      window.getSelection()?.removeAllRanges();
      hideToolbar();
    } catch (e: any) {
      alert("Error in applyBold: " + e.message);
    }
  };

  const clearFormatting = () => {
    const range = currentRangeRef.current;
    if (!range) return;
    try {
      const elsToRemove = Array.from(
        document.querySelectorAll('mark.custom-hl, b.custom-bold, .custom-hl, .custom-bold')
      ).filter(el => range.intersectsNode(el));
      elsToRemove.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
      });
    } catch (err) {
      console.error('Clear formatting error:', err);
    }
    window.getSelection()?.removeAllRanges();
    hideToolbar();
  };

  const handleOpenNotebook = () => {
    const text = window.getSelection()?.toString().trim();
    if (!text) return;
    hideToolbar();
    
    let contextStr = text;
    const selection = window.getSelection();

    if (selection && selection.anchorNode) {
      let node: Node | null = selection.anchorNode;
      let blockText = "";

      // Traverse up to find a block container
      while (node && node.nodeType !== Node.DOCUMENT_NODE) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          
          if (el.className && typeof el.className === 'string' && el.className.includes('-html-content')) {
            // Reached the root container, stop traversing
            break;
          }

          if (['p', 'div', 'li', 'td', 'blockquote'].includes(tag)) {
            blockText = el.textContent || "";
            break;
          }
        }
        node = node.parentNode;
      }

      // Fallback to immediate parent if no block element is found
      if (!blockText && selection.anchorNode.parentNode) {
        blockText = selection.anchorNode.parentNode.textContent || "";
      }

      if (blockText) {
        // Try to extract just the sentence containing the word
        const cleanBlockText = blockText.replace(/\s+/g, ' ');
        // Split by sentence delimiters (. ! ?)
        const sentences = cleanBlockText.match(/[^.!?]+[.!?]+/g) || [cleanBlockText];
        const matchingSentence = sentences.find(s => s.toLowerCase().includes(text.toLowerCase()));
        
        if (matchingSentence) {
          contextStr = matchingSentence.trim();
        } else {
          contextStr = cleanBlockText.trim();
        }
      }
    }

    // Limit context length just in case it's still too long
    if (contextStr.length > 300) {
      const idx = contextStr.toLowerCase().indexOf(text.toLowerCase());
      if (idx !== -1) {
        const start = Math.max(0, idx - 100);
        const end = Math.min(contextStr.length, idx + text.length + 100);
        contextStr = (start > 0 ? "..." : "") + contextStr.substring(start, end) + (end < contextStr.length ? "..." : "");
      }
    }

    setDictModal({ open: true, word: text, contextStr, translation: "" });
  };

  const handleSaveNotebook = async () => {
    if (!dictModal.translation.trim()) {
      alert("Vui lòng nhập nghĩa của từ!");
      return;
    }
    if (!user) {
      alert("Vui lòng đăng nhập để lưu từ vựng!");
      return;
    }

    setDictModal(prev => ({ ...prev, saving: true }));

    try {
      await addDoc(collection(db, "vocabulary"), {
        userId: user.uid,
        word: dictModal.word,
        pos: "",
        phonetic: "",
        translation: dictModal.translation,
        definition: "",
        context: dictModal.contextStr,
        timestamp: new Date().toISOString()
      });
      
      setDictModal(prev => ({ ...prev, saving: false, success: true }));
      
      // Auto close after 1.5s
      setTimeout(() => {
        setDictModal({ open: false, word: "", contextStr: "", translation: "" });
      }, 1500);
      
    } catch (error) {
      console.error("Error saving vocab:", error);
      alert("Lỗi khi lưu từ vựng. Vui lòng thử lại.");
      setDictModal(prev => ({ ...prev, saving: false }));
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-danger">
        <AlertCircle size={48} />
        <h2 className="h2 ml-4">Không tìm thấy đề thi</h2>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <header className="test-header">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: 'var(--radius-full)' }}>
            <ChevronLeft size={20} />
          </Link>
          <span className="h3" style={{ margin: 0, fontSize: '1.25rem' }}>{testData.title || (testData.type === 'LISTENING' ? 'IELTS Listening Test' : 'IELTS Reading Test')}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2" style={{ color: timeLeft < 300 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 600, fontSize: '1.25rem' }}>
            <Clock size={20} />
            {formatTime(timeLeft)}
          </div>
          <button className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', gap: '0.5rem' }} onClick={() => handleSubmit(false)} disabled={submitted}>
            <CheckCircle2 size={18} /> {submitted ? "Đã Nộp Bài" : "Nộp bài"}
          </button>
        </div>
      </header>

      {!singlePassageIndex && testData.passages.length > 1 && (
        <div className="test-tabs-container">
          {testData.passages.map((p: any, i: number) => (
            <button 
              key={`tab-${i}`}
              className={`test-tab-btn ${activePassage === i ? 'active' : ''}`}
              onClick={() => {
                setActivePassage(i);
                document.querySelector('.test-pane-left')?.scrollTo(0,0);
                document.querySelector('.test-pane-right')?.scrollTo(0,0);
              }}
            >
              {p.title || `Passage ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <div
        ref={toolbarRef}
        className="highlight-toolbar"
        style={{ display: 'none' }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <button className="highlight-color-btn yellow" title="Highlight Yellow" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyHighlight('rgba(255, 235, 59, 0.6)'); }} />
        <button className="highlight-color-btn green" title="Highlight Green" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyHighlight('rgba(76, 175, 80, 0.5)'); }} />
        <button className="highlight-color-btn blue" title="Highlight Blue" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyHighlight('rgba(33, 150, 243, 0.5)'); }} />
        <button className="highlight-color-btn pink" title="Highlight Pink" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyHighlight('rgba(233, 30, 99, 0.5)'); }} />
        <div style={{ width: '1px', backgroundColor: 'var(--border)', margin: '0 4px' }} />
        <button className="highlight-bold-btn" title="Lưu từ vựng" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenNotebook(); }} style={{ color: 'var(--primary)' }}>
          <Book size={14} />
        </button>
        <button className="highlight-bold-btn" title="Bold" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyBold(); }}>
          <Bold size={14} />
        </button>
        <div style={{ width: '1px', backgroundColor: 'var(--border)', margin: '0 4px' }} />
        <button className="highlight-clear-btn" title="Remove formatting" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); clearFormatting(); }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingBottom: '70px' }}>
        <div className="test-pane test-pane-left" ref={leftPaneRef} onMouseUp={handleMouseUp}>
          <div style={{ marginBottom: '4rem' }}>
            <h2 className="h2" style={{ marginBottom: '1.5rem', textAlign: 'center', color: 'var(--primary)' }}>
              {testData.type === 'LISTENING' ? 'LISTENING TEST' : 'READING TEST'}
            </h2>
            <h3 className="h3" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              {testData.passages[activePassage]?.title}
            </h3>
            
            {testData.type === 'LISTENING' && testData.audioUrl && (
              <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <audio 
                  controls 
                  src={testData.audioUrl} 
                  style={{ width: '100%' }} 
                  controlsList={strictParam ? "nodownload noplaybackrate" : ""}
                />
              </div>
            )}

            <MemoizedPassageContent 
              html={testData.type === 'LISTENING' 
                ? (submitted ? (testData.passages[activePassage]?.transcript || "<p>Chưa có transcript cho phần này.</p>") : "<div style='text-align: center; padding: 2rem; color: var(--text-muted);'>Nghe audio phía trên và trả lời câu hỏi bên cột phải.<br/><br/><i>Transcript sẽ hiển thị sau khi nộp bài.</i></div>")
                : (testData.passages[activePassage]?.content || "")
              } 
            />
          </div>
        </div>

        <div className="test-pane test-pane-right" style={{ paddingBottom: '250px' }} onMouseUp={handleMouseUp}>
          <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-base)', zIndex: 10, paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
            <h2 className="h2 text-center" style={{ color: 'var(--primary)' }}>Questions</h2>
            <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Read the questions and enter your answers.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {(() => {
              const passage = testData.passages[activePassage];
              const pIndex = activePassage;
              if (!passage) return null;
              return (
              <div key={`pq-${pIndex}`}>
                <h3 className="h3" style={{ marginBottom: '1rem', color: 'var(--primary)' }}>{passage.title} Questions</h3>
                {passage.questionGroups && passage.questionGroups.length > 0 ? (
                  passage.questionGroups.map((group: any, gIndex: number) => (
                    <div key={`g-${pIndex}-${gIndex}`} style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div 
                        className="question-html-content"
                        style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '1.5rem' }}
                        dangerouslySetInnerHTML={{ __html: group.html }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', borderTop: '1px dashed var(--border)', paddingTop: '1.5rem' }}>
                        {passage.questions.filter((q: any) => q.number >= group.start && q.number <= group.end).map((q: any) => {
                          const expectedAnswer = (q.correctAnswer || q.answer || "").trim().toLowerCase();
                          const possibleAnswers = expectedAnswer.split(/[/|]/).map((a: string) => a.trim());
                          const userAnswer = answers[q.id]?.trim().toLowerCase() || "";
                          const isCorrect = possibleAnswers.includes(userAnswer) && expectedAnswer !== "";
                          const isTFNG = ['true', 'false', 'not given', 'yes', 'no'].some(opt => possibleAnswers.includes(opt));
                          const isMCQ = possibleAnswers.every((a: string) => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].includes(a)) && possibleAnswers.length > 0 && possibleAnswers[0].length === 1;

                          return (
                            <div key={q.id} id={`q-box-${q.number}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '2px solid var(--primary)', flexShrink: 0 }}>
                                {q.number}
                              </span>
                              {isTFNG && !submitted ? (
                                <select 
                                  value={answers[q.id] || ""}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  style={{ flex: 1, maxWidth: '300px', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-pane)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                                >
                                  <option value="">Select...</option>
                                  {['true', 'false', 'not given'].some(opt => possibleAnswers.includes(opt)) ? (
                                    <>
                                      <option value="TRUE">TRUE</option>
                                      <option value="FALSE">FALSE</option>
                                      <option value="NOT GIVEN">NOT GIVEN</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="YES">YES</option>
                                      <option value="NO">NO</option>
                                      <option value="NOT GIVEN">NOT GIVEN</option>
                                    </>
                                  )}
                                </select>
                              ) : isMCQ && !submitted ? (
                                (() => {
                                  let maxLetter = 'D';
                                  const textContent = group.html.replace(/<[^>]+>/g, '');
                                  const rangeMatch = textContent.match(/[A-Z]\s*[-–]\s*([A-Z])/i);
                                  const olMatch = group.html.match(/<(ol|ul)[^>]*>([\s\S]*?)<\/\1>/i);
                                  let listItemsCount = 0;
                                  if (olMatch) {
                                    listItemsCount = (olMatch[2].match(/<li[^>]*>/gi) || []).length;
                                  }
                                  if (rangeMatch && rangeMatch[1]) {
                                    maxLetter = rangeMatch[1].toUpperCase();
                                  } else if (listItemsCount > 0) {
                                    maxLetter = String.fromCharCode(64 + listItemsCount);
                                  } else {
                                    const maxAns = possibleAnswers.reduce((max: string, curr: string) => curr > max ? curr : max, 'D');
                                    if (maxAns.toUpperCase() > maxLetter) maxLetter = maxAns.toUpperCase();
                                  }
                                  const options = [];
                                  for (let charCode = 65; charCode <= maxLetter.charCodeAt(0); charCode++) {
                                    options.push(String.fromCharCode(charCode));
                                  }
                                  if (options.length > 5) {
                                    return (
                                      <select 
                                        value={answers[q.id] || ""}
                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                        style={{ flex: 1, maxWidth: '300px', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-pane)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                                      >
                                        <option value="">Select...</option>
                                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                    );
                                  }
                                  return (
                                    <div style={{ display: 'flex', gap: '0.25rem', flex: 1, maxWidth: '300px' }}>
                                      {options.map(opt => (
                                        <label key={opt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0.4rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: answers[q.id] === opt ? 'var(--primary-light)' : 'var(--bg-base)' }}>
                                          <input 
                                            type="radio" 
                                            name={q.id} 
                                            value={opt}
                                            checked={answers[q.id] === opt}
                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            style={{ display: 'none' }}
                                          />
                                          {opt}
                                        </label>
                                      ))}
                                    </div>
                                  );
                                })()
                              ) : (
                                <input 
                                  type="text" 
                                  value={answers[q.id] || ''}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  disabled={submitted}
                                  placeholder="Your answer"
                                  style={{ flex: 1, maxWidth: '300px', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-pane)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', 
                                           borderColor: submitted ? (isCorrect ? 'var(--success)' : 'var(--danger)') : 'var(--border)' }} 
                                />
                              )}
                              {submitted && (
                                <div style={{ fontSize: '0.9rem', color: isCorrect ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  {isCorrect ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                  {!isCorrect && `Answer: ${q.correctAnswer || q.answer}`}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    {passage.questions.map((q: any) => {
                      return (
                        <div key={q.id} id={`q-box-${q.number}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontWeight: 700, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                              {q.number}
                            </span>
                            <input 
                              type="text" 
                              value={answers[q.id] || ''}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              disabled={submitted}
                              placeholder="Your answer"
                              style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              );
            })()}
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: '0.5rem', paddingBottom: '0.5rem', flex: 1, marginRight: '2rem' }}>
          {testData.passages.map((p: any, pIdx: number) => 
            p.questions.map((q: any) => {
              const hasAnswer = !!answers[q.id]?.trim();
              let bgColor = 'var(--bg-base)';
              let borderColor = 'var(--border)';
              if (hasAnswer) {
                bgColor = 'var(--primary-light)';
                borderColor = 'var(--primary)';
              }
              if (submitted) {
                const expectedAnswer = (q.correctAnswer || q.answer || "").trim().toLowerCase();
                const possibleAnswers = expectedAnswer.split(/[/|]/).map((a: string) => a.trim());
                const userAnswer = answers[q.id]?.trim().toLowerCase() || "";
                const isCorrect = possibleAnswers.includes(userAnswer) && expectedAnswer !== "";
                bgColor = isCorrect ? 'var(--success)' : 'var(--danger)';
                borderColor = bgColor;
              }
              return (
                <button
                  key={`nav-${q.id}`}
                  onClick={() => {
                    if (activePassage !== pIdx) setActivePassage(pIdx);
                    setTimeout(() => {
                      const el = document.getElementById(`q-box-${q.number}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                  }}
                  style={{
                    minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)',
                    border: activePassage === pIdx ? `2px solid var(--primary)` : `1px solid ${borderColor}`,
                    backgroundColor: bgColor, color: (hasAnswer || submitted) ? 'white' : 'var(--text-primary)',
                    fontWeight: activePassage === pIdx ? 700 : 500, fontSize: '0.9rem', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', opacity: activePassage === pIdx ? 1 : 0.6
                  }}
                >
                {q.number}
              </button>
            );
          })).flat()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {submitted && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Your Score</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                {score} / {testData.passages.reduce((acc: number, p: any) => acc + p.questions.length, 0)}
              </p>
            </div>
          )}
          <button 
            onClick={() => handleSubmit(false)}
            disabled={submitted}
            className="btn btn-primary"
            style={{ 
              padding: '1rem 2.5rem', 
              fontSize: '1.1rem',
              opacity: submitted ? 0.5 : 1,
              cursor: submitted ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {submitted ? "Đã Nộp Bài" : "Nộp bài"}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-base)', padding: '2rem', borderRadius: 'var(--radius-md)', maxWidth: '400px', width: '90%', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)' }}>
            <h3 className="h3" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Xác nhận nộp bài</h3>
            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
              Bạn còn <strong style={{ color: 'var(--danger)' }}>{unansweredCount}</strong> câu chưa điền đáp án. Bạn có chắc chắn muốn nộp bài không?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowConfirmModal(false)}
              >
                Quay lại làm tiếp
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleSubmit(true)}
              >
                Vẫn nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-base)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', maxWidth: '600px', width: '90%', boxShadow: 'var(--shadow-2xl)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <CheckCircle2 size={64} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
              <h2 className="h2" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Chúc mừng bạn đã hoàn thành bài thi!</h2>
              <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                Điểm số: <strong style={{ fontSize: '2rem', color: 'var(--primary)' }}>{score}</strong> / {testData.passages.reduce((acc: number, p: any) => acc + p.questions.length, 0)}
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Thống kê theo dạng bài</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {typeStats.map((stat, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-pane)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{stat.type.replace(/_/g, ' ')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ color: stat.correct === stat.total ? 'var(--success)' : (stat.correct === 0 ? 'var(--danger)' : 'var(--warning)'), fontWeight: 600 }}>
                        {stat.correct} / {stat.total} đúng
                      </span>
                      <div style={{ width: '100px', height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${(stat.correct / stat.total) * 100}%`, height: '100%', backgroundColor: stat.correct === stat.total ? 'var(--success)' : (stat.correct === 0 ? 'var(--danger)' : 'var(--warning)') }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
                onClick={() => setShowResultModal(false)}
              >
                Xem đáp án chi tiết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dictionary / Notebook Modal */}
      {dictModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDictModal(prev => ({ ...prev, open: false }))}>
          <div style={{ backgroundColor: 'var(--bg-base)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '500px', width: '90%', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="h3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary)' }}>
                <Book size={24} />
                Lưu vào Sổ tay từ vựng
              </h3>
              <button onClick={() => setDictModal(prev => ({ ...prev, open: false }))} className="btn" style={{ padding: '0.5rem' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Từ vựng</label>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', padding: '0.75rem', backgroundColor: 'var(--bg-pane)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  {dictModal.word}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ngữ cảnh (Câu chứa từ)</label>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontStyle: 'italic', padding: '0.75rem', backgroundColor: 'var(--bg-pane)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  "{dictModal.contextStr}"
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>Nghĩa Tiếng Việt / Ghi chú của bạn *</label>
                <textarea 
                  value={dictModal.translation}
                  onChange={(e) => setDictModal(prev => ({ ...prev, translation: e.target.value }))}
                  placeholder="Nhập nghĩa của từ hoặc ghi chú..."
                  style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', border: '2px solid var(--primary-light)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setDictModal(prev => ({ ...prev, open: false }))} disabled={dictModal.saving || dictModal.success}>
                  Hủy
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveNotebook}
                  disabled={dictModal.saving || dictModal.success}
                  style={{ 
                    backgroundColor: dictModal.success ? 'var(--success)' : 'var(--primary)',
                    minWidth: '150px'
                  }}
                >
                  {dictModal.saving ? (
                    <><Loader2 className="animate-spin" size={18} /> Đang lưu...</>
                  ) : dictModal.success ? (
                    <><CheckCircle2 size={18} /> Đã lưu thành công!</>
                  ) : (
                    "Lưu vào Sổ tay"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
