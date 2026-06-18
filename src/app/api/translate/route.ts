import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// Requires process.env.GEMINI_API_KEY to be set
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: {
      type: Type.STRING,
      description: "The base form (lemma) of the word requested",
    },
    pos: {
      type: Type.STRING,
      description: "The part of speech of the word in this context (e.g., noun, verb, adjective)",
    },
    phonetic: {
      type: Type.STRING,
      description: "IPA phonetic transcription of the word",
    },
    translation: {
      type: Type.STRING,
      description: "A short, concise Vietnamese translation that fits the context",
    },
    definition: {
      type: Type.STRING,
      description: "A concise English definition that fits the context",
    }
  },
  required: ["word", "pos", "phonetic", "translation", "definition"],
};

export async function POST(req: Request) {
  try {
    const { word, context } = await req.json();

    if (!word || !context) {
      return NextResponse.json({ error: 'Missing word or context' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. Returning mock response for development.");
      return NextResponse.json({
        word: word,
        pos: "noun/verb",
        phonetic: "/mɒk/",
        translation: "(Nghĩa mô phỏng do thiếu API Key)",
        definition: "A simulated definition because the API key is missing."
      });
    }

    const prompt = `You are a helpful bilingual dictionary (English-Vietnamese) for IELTS students.
The user wants to look up the word "${word}" in the following context:
"${context}"

Provide the translation and definition of the word exactly as it is used in the provided context. Ensure the response is in JSON format matching the schema.`;

    let data;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No text returned from Gemini");
      }
      data = JSON.parse(text);
    } catch (apiError: any) {
      console.warn("Translation API failed (possibly due to quota/API Key error). Returning fallback:", apiError.message);
      data = {
        word: word,
        pos: "N/A",
        phonetic: "/.../",
        translation: "(Tính năng tra từ bằng AI đang bị lỗi. Vui lòng kiểm tra lại API Key)",
        definition: "Failed to connect to AI server. Please check your API key quota."
      };
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("Translation route error:", error);
    return NextResponse.json({ error: 'Failed to process translation request' }, { status: 500 });
  }
}
