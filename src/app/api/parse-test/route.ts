import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(request: NextRequest) {
  try {
    const { prompt, testType } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // --- SMART PARSER (Bypasses AI Quota completely for Listening and Reading!) ---
    // If we can parse the answers via regex directly from the HTML, we don't need AI.
    // The prompt contains the full HTML of the Key file.
    
    if (testType === 'LISTENING') {
        const json = { answers: {} as any, transcripts: {} as any };
        
        // 1. Extract Answers
        const answerRegex = /<p>C[aâ]u s[ốo] (\d+)(?:-(\d+))?:?<\/p><p><strong>(.*?)<\/strong><\/p>/ig;
        let match;
        let foundAnswers = 0;
        while ((match = answerRegex.exec(prompt)) !== null) {
          let startQ = parseInt(match[1]);
          let endQ = match[2] ? parseInt(match[2]) : startQ;
          let ans = match[3].replace(/<[^>]+>/g, '').trim();
          
          if (startQ !== endQ) {
              let parts = ans.split(',').map((s: string) => s.trim());
              let idx = 0;
              for (let i = startQ; i <= endQ; i++) {
                  json.answers[i.toString()] = parts[idx] || ans;
                  idx++;
                  foundAnswers++;
              }
          } else {
              json.answers[startQ.toString()] = ans;
              foundAnswers++;
          }
        }

        // 2. Extract Transcripts
        const sectionRegex = /<p><strong>Section (\d+)<\/strong><\/p>([\s\S]*?)(?=<p><strong>Section \d+<\/strong><\/p>|That is the end of the listening test)/ig;
        let foundTranscripts = 0;
        while ((match = sectionRegex.exec(prompt)) !== null) {
          let sec = match[1];
          let content = match[2].trim();
          json.transcripts[sec] = content;
          foundTranscripts++;
        }
        
        // If we found the answers successfully, return immediately without calling AI!
        if (foundAnswers > 0) {
            console.log(`Smart Parser succeeded: Found ${foundAnswers} answers and ${foundTranscripts} transcripts.`);
            return NextResponse.json({ result: JSON.stringify(json) });
        }
    }
    
    if (testType === 'READING') {
        const json = {} as any;
        let currentQuestion = 1;

        // Try to match <li> or <strong> ranges
        const listRegex = /<li>(.*?)<\/li>|<p><strong>(\d+)-(\d+)\.\s*<\/strong>(.*?)<\/p>/ig;
        let match;
        let foundAnswers = 0;
        
        while ((match = listRegex.exec(prompt)) !== null) {
            if (match[1]) {
                // it's an li
                let ans = match[1].replace(/<[^>]+>/g, '').trim();
                json[currentQuestion.toString()] = ans;
                currentQuestion++;
                foundAnswers++;
            } else if (match[2] && match[3] && match[4]) {
                // it's a range
                let startQ = parseInt(match[2]);
                let endQ = parseInt(match[3]);
                let ansText = match[4].replace(/<[^>]+>/g, '').trim();
                let parts = ansText.split(',').map((s: string) => s.trim());
                
                // If currentQuestion is out of sync, sync it to startQ
                if (currentQuestion < startQ) currentQuestion = startQ;

                let idx = 0;
                for (let i = startQ; i <= endQ; i++) {
                    json[i.toString()] = parts[idx] || ansText;
                    idx++;
                    currentQuestion++;
                    foundAnswers++;
                }
            }
        }
        if (foundAnswers > 0) {
            console.log(`Smart Parser succeeded: Found ${foundAnswers} reading answers.`);
            return NextResponse.json({ result: JSON.stringify(json) });
        }
    }
    // --- END SMART PARSER ---

    // Fallback to AI if parsing fails
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {}
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    return NextResponse.json({ result: text });
    
  } catch (error: any) {
    console.error('AI Parse Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process with AI' },
      { status: 500 }
    );
  }
}
