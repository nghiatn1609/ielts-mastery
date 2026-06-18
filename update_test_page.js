const fs = require('fs');
const file = '/Users/nghia/.gemini/antigravity/scratch/ielts-platform/src/app/(test)/test/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the right pane and add bottom tracker
const newUI = `      {/* Right Pane - Questions & Inputs */}
      <div className="test-pane test-pane-right" style={{ paddingBottom: '100px' }}>
        <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-pane)', zIndex: 10, paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
          <h2 className="h2 text-center" style={{ color: 'var(--primary)' }}>Questions</h2>
          <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Read the questions and enter your answers.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {testData.passages.map((passage: any, pIndex: number) => (
            <div key={\`pq-\${pIndex}\`}>
              <h3 className="h3" style={{ marginBottom: '1rem', color: 'var(--primary)' }}>{passage.title} Questions</h3>
              
              {passage.questionGroups && passage.questionGroups.length > 0 ? (
                // Split UI Render
                passage.questionGroups.map((group: any, gIndex: number) => (
                  <div key={\`g-\${pIndex}-\${gIndex}\`} style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    {/* Render Question HTML */}
                    <div 
                      className="question-html-content"
                      style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '1.5rem' }}
                      dangerouslySetInnerHTML={{ __html: group.html }}
                    />
                    
                    {/* Render Inputs for this group */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', borderTop: '1px dashed var(--border)', paddingTop: '1.5rem' }}>
                      {passage.questions.filter((q: any) => q.number >= group.startQ && q.number <= group.endQ).map((q: any) => {
                        const expectedAnswer = (q.correctAnswer || q.answer || "").trim().toLowerCase();
                        const possibleAnswers = expectedAnswer.split(/[/|]/).map((a: string) => a.trim());
                        const userAnswer = answers[q.id]?.trim().toLowerCase() || "";
                        const isCorrect = possibleAnswers.includes(userAnswer) && expectedAnswer !== "";
                        
                        return (
                          <div key={q.id} id={\`q-box-\${q.number}\`} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ 
                              fontWeight: 700, 
                              color: 'var(--text-primary)',
                              backgroundColor: 'var(--bg-elevated)',
                              width: '36px',
                              height: '36px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              border: '2px solid var(--primary)',
                              flexShrink: 0
                            }}>
                              {q.number}
                            </span>
                            <input 
                              type="text" 
                              value={answers[q.id] || ''}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              disabled={submitted}
                              placeholder="Your answer"
                              style={{ flex: 1, maxWidth: '300px', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-pane)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', 
                                       borderColor: submitted ? (isCorrect ? 'var(--success)' : 'var(--danger)') : 'var(--border)' }} 
                            />
                            {submitted && (
                              <div style={{ fontSize: '0.9rem', color: isCorrect ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {isCorrect ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                {!isCorrect && \`Answer: \${q.correctAnswer || q.answer}\`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                // Fallback Grid UI (For old tests without questionGroups)
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  {passage.questions.map((q: any) => {
                    const expectedAnswer = (q.correctAnswer || q.answer || "").trim().toLowerCase();
                    const possibleAnswers = expectedAnswer.split(/[/|]/).map((a: string) => a.trim());
                    const userAnswer = answers[q.id]?.trim().toLowerCase() || "";
                    const isCorrect = possibleAnswers.includes(userAnswer) && expectedAnswer !== "";
                    return (
                      <div key={q.id} id={\`q-box-\${q.number}\`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
          ))}
        </div>
      </div>

      {/* Bottom Navigation Tracker */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: '0.5rem', paddingBottom: '0.5rem', flex: 1, marginRight: '2rem' }}>
          {testData.passages.map((p: any) => p.questions).flat().map((q: any) => {
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
                key={\`nav-\${q.id}\`}
                onClick={() => {
                  const el = document.getElementById(\`q-box-\${q.number}\`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                style={{
                  minWidth: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  border: \`1px solid \${borderColor}\`,
                  backgroundColor: bgColor,
                  color: (hasAnswer || submitted) ? 'white' : 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s'
                }}
              >
                {q.number}
              </button>
            );
          })}
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
            onClick={handleSubmit}
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
    </>
  );
}`;

const startIndex = content.indexOf('{/* Right Pane - Answer Sheet */}');
const newContent = content.substring(0, startIndex) + newUI + '\n}\n';

fs.writeFileSync(file, newContent, 'utf8');
