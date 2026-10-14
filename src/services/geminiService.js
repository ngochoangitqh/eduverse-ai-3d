import { GoogleGenAI } from '@google/genai';

export const getAIClient = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
  if (!key) {
    throw new Error('Vui lòng nhập Gemini API Key ở góc trên màn hình hoặc trong file .env!');
  }
  return new GoogleGenAI({ apiKey: key });
};

export const getActiveModel = () => {
  return localStorage.getItem('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
};

export const setActiveModel = (model) => {
  localStorage.setItem('GEMINI_MODEL', model);
};

// Danh sách model tương thích tốt nhất cho các dự án mới:
// gemini-3.5-flash-lite: Siêu nhanh, dung lượng máy chủ dồi dào, không bị 503
// gemini-3.8-flash: Mô hình tư duy sâu thế hệ mới
const ALL_SUPPORTED_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];

async function executeWithFallback(operation) {
  const preferred = getActiveModel();
  const modelsToTry = [preferred, ...ALL_SUPPORTED_MODELS.filter((m) => m !== preferred)];

  let lastError = null;
  for (const model of modelsToTry) {
    try {
      return await operation(model);
    } catch (err) {
      lastError = err;
      const errMsg = err?.message || '';
      const isOverloadedOrUnavailable =
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('404') ||
        errMsg.includes('NOT_FOUND');

      if (isOverloadedOrUnavailable) {
        console.warn(`Model ${model} không khả dụng hoặc đang quá tải. Đang tự động chuyển sang model dự phòng...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export function formatAIError(err) {
  const msg = err?.message || String(err);
  if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
    return 'Máy chủ Google AI đang trong thời điểm quá tải lượt truy cập (503). Hệ thống đã tự động chuyển sang chế độ dự phòng, bạn hãy bấm gửi lại nhé!';
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'Đã chạm giới hạn yêu cầu API miễn phí (Rate Limit 429). Vui lòng đợi 30 giây rồi thử lại!';
  }
  if (msg.includes('API_KEY_INVALID') || (msg.includes('400') && msg.includes('key'))) {
    return 'Gemini API Key không hợp lệ. Vui lòng kiểm tra lại API Key ở nút cài đặt!';
  }
  try {
    const jsonMatch = msg.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error?.message) {
        try {
          const inner = JSON.parse(parsed.error.message);
          if (inner?.error?.message) return inner.error.message;
        } catch (_) {
          return parsed.error.message;
        }
      }
    }
  } catch (_) {}
  return msg;
}

export async function generateText(prompt, systemInstruction = '', imagePart = null) {
  const ai = getAIClient();
  const contents = imagePart ? [imagePart, prompt] : prompt;

  return await executeWithFallback(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemInstruction || undefined,
        thinkingConfig: {
          thinkingLevel: 'low',
        },
      },
    });
    return response.text;
  });
}

export async function generateStream(prompt, onChunk, systemInstruction = '', imagePart = null) {
  const ai = getAIClient();
  const contents = imagePart ? [imagePart, prompt] : prompt;

  return await executeWithFallback(async (model) => {
    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: systemInstruction || undefined,
        thinkingConfig: {
          thinkingLevel: 'low',
        },
      },
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        onChunk(fullText);
      }
    }
    return fullText;
  });
}

export async function generateJSON(prompt, schema, systemInstruction = '') {
  const ai = getAIClient();

  return await executeWithFallback(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || undefined,
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: {
          thinkingLevel: 'low',
        },
      },
    });
    return JSON.parse(response.text);
  });
}