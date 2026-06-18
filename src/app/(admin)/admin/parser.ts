export interface QuestionGroup {
  start: number;
  end: number;
  type: string;
  html: string;
}

export interface ParsedPassage {
  id: number;
  title: string;
  startQ: number;
  endQ: number;
  content: string; // The HTML of the passage text (without questions)
  questionGroups: QuestionGroup[];
  rawHtml: string; // The full HTML of the passage (text + questions)
  transcript?: string; // Optional transcript for listening
}

export function parseIeltsDocxHtml(html: string, testType: 'READING' | 'LISTENING' = 'READING'): ParsedPassage[] {
  // Use DOMParser which is available in browser environments
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const passages: ParsedPassage[] = [];
  const seenPassages = new Set<number>();
  
  let currentPassage: ParsedPassage | null = null;
  let currentGroup: QuestionGroup | null = null;
  
  let mode: 'PASSAGE_TEXT' | 'QUESTIONS' = 'PASSAGE_TEXT';
  
  const childNodes = Array.from(doc.body.childNodes);
  
  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    // We only care about Element nodes or text nodes with content
    const text = node.textContent?.trim() || '';
    if (!text && node.nodeType !== 1) continue; // Skip empty text nodes
    
    // Detect Passage Start
    let passageMatch = null;
    let pId = 0;
    
    if (testType === 'READING') {
      passageMatch = text.match(/^(?:READING\s+)?PASSAGE\s+([1-3])/i);
      pId = passageMatch ? parseInt(passageMatch[1]) : 0;
      
      // Fallback: Sometimes it might just contain "PASSAGE X" but we want to avoid matching "in passage 1" inside a question.
      if (!pId) {
          const looseMatch = text.match(/PASSAGE\s+([1-3])/i);
          if (looseMatch && text.length < 100) {
              const isQuestionRef = text.toLowerCase().match(/(according to|in|read|from)\s+passage/i);
              if (!isQuestionRef) pId = parseInt(looseMatch[1]);
          }
      }
    } else {
      passageMatch = text.match(/^(?:SECTION|PART)\s+([1-4])/i);
      pId = passageMatch ? parseInt(passageMatch[1]) : 0;
      
      if (!pId) {
          const looseMatch = text.match(/(?:SECTION|PART)\s+([1-4])/i);
          if (looseMatch && text.length < 100) {
              const isQuestionRef = text.toLowerCase().match(/(in|from)\s+(section|part)/i);
              if (!isQuestionRef) pId = parseInt(looseMatch[1]);
          }
      }
    }
    
    if (pId > 0 && !seenPassages.has(pId)) {
      if (currentPassage) {
         if (currentGroup) currentPassage.questionGroups.push(currentGroup);
         passages.push(currentPassage);
      }
      seenPassages.add(pId);
      currentPassage = {
        id: pId,
        title: testType === 'READING' ? `Passage ${pId}` : `Recording ${pId}`,
        startQ: 1, 
        endQ: 40,
        content: '',
        questionGroups: [],
        rawHtml: ''
      };
      currentGroup = null;
      mode = 'PASSAGE_TEXT';
    }
    
    if (!currentPassage) continue; // Skip anything before the first passage
    
    // Detect Question Group Start
    const qMatch = text.match(/^Questions\s+(\d+)[\s\-–]+(\d+)/i);
    if (qMatch && text.length < 100) {
      mode = 'QUESTIONS';
      if (currentGroup) {
        currentPassage.questionGroups.push(currentGroup);
      }
      currentGroup = {
        start: parseInt(qMatch[1]),
        end: parseInt(qMatch[2]),
        type: 'UNKNOWN',
        html: ''
      };
    }
    
    // Accumulate HTML
    let nodeHtml = '';
    if (node.nodeType === 1) {
      nodeHtml = (node as HTMLElement).outerHTML;
    } else if (node.nodeType === 3) {
      nodeHtml = node.textContent || '';
    }
    
    currentPassage.rawHtml += nodeHtml;
    
    if (mode === 'PASSAGE_TEXT') {
       currentPassage.content += nodeHtml;
    } else if (mode === 'QUESTIONS' && currentGroup) {
       currentGroup.html += nodeHtml;
       
       // Try to infer type from text if unknown
       if (currentGroup.type === 'UNKNOWN') {
         const upperText = text.toUpperCase();
         if (upperText.includes('TRUE') && upperText.includes('FALSE')) currentGroup.type = 'TRUE_FALSE_NOT_GIVEN';
         else if (upperText.includes('YES') && upperText.includes('NO')) currentGroup.type = 'YES_NO_NOT_GIVEN';
         else if (upperText.includes('WHICH PARAGRAPH CONTAINS')) currentGroup.type = 'MATCHING_PARAGRAPHS';
         else if (upperText.includes('MATCH EACH') || upperText.includes('MATCHING') || upperText.includes('MATCH ')) currentGroup.type = 'MATCHING_FEATURES';
         else if (upperText.includes('CHOOSE THE CORRECT LETTER') || (upperText.includes('CHOOSE') && upperText.includes('ANSWER'))) currentGroup.type = 'MULTIPLE_CHOICE';
         else if (upperText.includes('COMPLETE THE') || upperText.includes('NO MORE THAN')) currentGroup.type = 'COMPLETION';
         else if (upperText.includes('CHOOSE THE CORRECT HEADING')) currentGroup.type = 'MATCHING_HEADINGS';
       }
    }
  }
  
  if (currentPassage) {
    if (currentGroup) currentPassage.questionGroups.push(currentGroup);
    passages.push(currentPassage);
  }
  
  // Post-process passages to fix startQ and endQ based on groups
  passages.forEach(p => {
    if (p.questionGroups.length > 0) {
      p.startQ = p.questionGroups[0].start;
      p.endQ = p.questionGroups[p.questionGroups.length - 1].end;
    }
  });
  
  return passages;
}
