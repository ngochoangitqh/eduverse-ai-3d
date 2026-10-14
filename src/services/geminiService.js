import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || '';

export const getAIClient = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
  if (!key) {
    throw new Error('Vui lòng nhập Gemini API Key ở góc trên màn hình hoặc trong file .env!');
  }
  return new GoogleGenAI({ apiKey: key });
};

export async function generateText(prompt, systemInstruction = '', imagePart = null) {
  const ai = getAIClient();
  const contents = imagePart ? [imagePart, prompt] : prompt;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: systemInstruction ? { systemInstruction } : undefined,
  });
  return response.text;
}

export async function generateJSON(prompt, schema, systemInstruction = '') {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });
  return JSON.parse(response.text);
}