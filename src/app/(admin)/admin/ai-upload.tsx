"use client";

import { useState } from "react";
import * as mammoth from "mammoth";
import { getGenerativeModel } from "firebase/ai";
import { ai, db } from "@/lib/firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { Loader2, Upload, FileText, CheckCircle2, Headphones, BookOpen } from "lucide-react";

export default function AIUploadComponent() {
  const [testType, setTestType] = useState<'READING' | 'LISTENING'>('READING');
  const [readingFile, setReadingFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [testTitle, setTestTitle] = useState("Vol9 Test 2");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  
  const handleUploadAI = async () => {
    if (!readingFile || !keyFile) return alert("Vui lòng chọn cả 2 file Đề và Đáp án/Transcript");
    if (testType === 'LISTENING' && !audioFile) return alert("Vui lòng chọn file Audio cho đề Listening");
    
    setLoading(true);
    try {
      let audioUrl = "";
      if (testType === 'LISTENING' && audioFile) {
        setStatus("Đang upload file Audio lên Cloudinary...");
        try {
          const formData = new FormData();
          formData.append("file", audioFile);
          formData.append("upload_preset", "ielts_upload");
          
          const uploadRes = await fetch("https://api.cloudinary.com/v1_1/duhmfjuxm/video/upload", {
            method: "POST",
            body: formData,
          });
          
          if (!uploadRes.ok) {
            throw new Error(`Cloudinary upload failed: ${uploadRes.statusText}`);
          }
          
          const uploadData = await uploadRes.json();
          audioUrl = uploadData.secure_url;
          
        } catch (uploadErr) {
           console.error(uploadErr);
           alert("Lỗi upload Audio. Sẽ bỏ qua Audio.");
        }
      }

      setStatus(`Đang đọc file Word (${testType === 'READING' ? 'Reading' : 'Questions'})...`);
      const readingHtml = (await mammoth.convertToHtml({ arrayBuffer: await readingFile.arrayBuffer() })).value;
      
      setStatus("Đang đọc file Word (Key/Transcript)...");
      // Use convertToHtml to keep paragraphs formatting for transcript
      const keyHtml = (await mammoth.convertToHtml({ arrayBuffer: await keyFile.arrayBuffer() })).value;

      setStatus("Đang gửi cho AI xử lý (Gemini)... (siêu tốc)");
      
      let prompt = "";
      if (testType === 'READING') {
        prompt = `
          Trích xuất đáp án từ đoạn text HTML sau và trả về định dạng JSON thuần túy (không bọc trong markdown \`\`\`json).
          Key phải là chuỗi số câu hỏi (từ "1" đến "40"), Value là nội dung đáp án.
          Ví dụ: {"1": "A", "2": "TRUE", "3": "water"}
          
          Nội dung đáp án:
          ${keyHtml}
        `;
      } else {
        prompt = `
          Trích xuất đáp án và transcript từ đoạn văn bản HTML sau. Trả về định dạng JSON thuần túy (không bọc trong markdown \`\`\`json).
          Cấu trúc JSON yêu cầu:
          {
            "answers": {
              "1": "đáp án câu 1",
              "2": "đáp án câu 2"
            },
            "transcripts": {
              "1": "transcript HTML cho section 1/recording 1",
              "2": "transcript HTML cho section 2/recording 2",
              "3": "transcript HTML cho section 3/recording 3",
              "4": "transcript HTML cho section 4/recording 4"
            }
          }
          Lưu ý: Đối với transcripts, hãy giữ nguyên định dạng HTML (<p>, <strong>...) nếu có để dễ đọc. 
          Nội dung đáp án và transcript:
          ${keyHtml}
        `;
      }

      let text = "";
      let retries = 3;
      while (retries > 0) {
        try {
          const res = await fetch("/api/parse-test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, testType })
          });
          
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || `HTTP ${res.status}`);
          }
          
          const data = await res.json();
          text = data.result.trim();
          break;
        } catch (err: any) {
          retries--;
          if (retries === 0) throw err;
          setStatus(`Lỗi kết nối AI (còn ${retries} lần thử lại)...`);
          await new Promise(res => setTimeout(res, 3000));
        }
      }
      
      if (text.startsWith("```json")) text = text.substring(7, text.length - 3).trim();
      else if (text.startsWith("```")) text = text.substring(3, text.length - 3).trim();
      
      let aiAnswers: any = {};
      let aiTranscripts: any = {};
      
      try {
        const parsedJson = JSON.parse(text);
        if (testType === 'READING') {
          aiAnswers = parsedJson;
        } else {
          aiAnswers = parsedJson.answers || {};
          aiTranscripts = parsedJson.transcripts || {};
        }
      } catch(e) {
        throw new Error("AI trả về kết quả không phải là JSON hợp lệ.");
      }
      
      setStatus("Đang phân tích cấu trúc đề (JS Parser)...");
      const { parseIeltsDocxHtml } = await import("./parser");
      const parsedPassages = parseIeltsDocxHtml(readingHtml, testType);
      
      // Merge AI answers (and transcripts) with passages
      const finalPassages = parsedPassages.map(p => {
        const questions = [];
        for (let i = p.startQ; i <= p.endQ; i++) {
          questions.push({
            id: `q${i}`,
            number: i,
            type: "FILL_IN_THE_BLANK",
            text: `Question ${i}`,
            options: [],
            correctAnswer: aiAnswers[i] || aiAnswers[i.toString()] || ""
          });
        }
        return {
          title: p.title,
          content: p.content,
          startQ: p.startQ,
          endQ: p.endQ,
          questionGroups: p.questionGroups,
          questions: questions,
          transcript: testType === 'LISTENING' ? (aiTranscripts[p.id.toString()] || "") : ""
        };
      });

      setStatus("Đang lưu vào Database...");
      const payload: any = {
        title: testTitle,
        type: testType,
        passages: finalPassages,
        createdAt: new Date().toISOString()
      };
      
      if (testType === 'LISTENING' && audioUrl) {
        payload.audioUrl = audioUrl;
      }
      
      await addDoc(collection(db, "tests"), payload);
      setStatus("Upload thành công! Đã lưu vào Firebase.");
      setReadingFile(null);
      setKeyFile(null);
      setAudioFile(null);
    } catch (e: any) {
      console.error(e);
      setStatus("Lỗi: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
      marginBottom: '2rem',
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Upload size={24} style={{ color: 'var(--primary)' }} /> Upload Test Bằng AI (Gemini)
        </h2>
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-full)', padding: '0.25rem' }}>
          <button
            onClick={() => setTestType('READING')}
            style={{
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem',
              backgroundColor: testType === 'READING' ? 'var(--primary)' : 'transparent',
              color: testType === 'READING' ? 'white' : 'var(--text-muted)',
              fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <BookOpen size={16} /> Reading
          </button>
          <button
            onClick={() => setTestType('LISTENING')}
            style={{
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem',
              backgroundColor: testType === 'LISTENING' ? 'var(--primary)' : 'transparent',
              color: testType === 'LISTENING' ? 'white' : 'var(--text-muted)',
              fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Headphones size={16} /> Listening
          </button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Tên Test (VD: Vol 9 Test 2)
          </label>
          <input 
            type="text" 
            value={testTitle} 
            onChange={e => setTestTitle(e.target.value)} 
            style={{
              width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white', outline: 'none'
            }} 
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {testType === 'LISTENING' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                File Audio (.mp3, .mp4)
              </label>
              <input 
                type="file" accept="audio/*,video/mp4" 
                onChange={e => setAudioFile(e.target.files?.[0] || null)} 
                style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }} 
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              File Đề Bài ({testType === 'READING' ? 'Reading' : 'Questions'} .docx)
            </label>
            <input 
              type="file" accept=".docx" 
              onChange={e => setReadingFile(e.target.files?.[0] || null)} 
              style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              File Đáp Án ({testType === 'READING' ? 'Key' : 'Key & Transcript'} .docx)
            </label>
            <input 
              type="file" accept=".docx" 
              onChange={e => setKeyFile(e.target.files?.[0] || null)} 
              style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }} 
            />
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={handleUploadAI} 
          disabled={loading || !readingFile || !keyFile || (testType === 'LISTENING' && !audioFile)}
          className="btn"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            backgroundColor: (loading || !readingFile || !keyFile || (testType === 'LISTENING' && !audioFile)) ? 'var(--border)' : 'var(--primary)',
            color: 'white', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)',
            fontWeight: 600, transition: 'all 0.2s', cursor: (loading || !readingFile || !keyFile || (testType === 'LISTENING' && !audioFile)) ? 'not-allowed' : 'pointer',
            opacity: (loading || !readingFile || !keyFile || (testType === 'LISTENING' && !audioFile)) ? 0.7 : 1
          }}
        >
          {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={18} />}
          {loading ? "Đang xử lý..." : "Tiến hành Trích xuất & Upload"}
        </button>
        {status && (
          <span style={{ 
            fontSize: '0.875rem', 
            color: status.includes('Lỗi') ? 'var(--danger)' : 'var(--success)' 
          }}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
