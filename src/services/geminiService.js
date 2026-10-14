import { GoogleGenAI } from '@google/genai';

export const getGeminiApiKey = () => {
  const localKey = (localStorage.getItem('GEMINI_API_KEY') || '').trim();
  // Bỏ qua nếu người dùng lỡ dán key Firebase vào ô Gemini
  if (localKey && !localKey.startsWith('AIzaSyAbDr7qB_SfVZHLT1qfnN0PnBjGTicOPGg')) {
    return localKey;
  }
  return (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
};

export const getAIClient = () => {
  const key = getGeminiApiKey();
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

export const getActiveThinkingMode = () => {
  return localStorage.getItem('GEMINI_THINKING_MODE') || 'deep';
};

export const setActiveThinkingMode = (mode) => {
  localStorage.setItem('GEMINI_THINKING_MODE', mode);
};

/**
 * Xây dựng cấu hình Thinking Budget tương thích theo từng dòng mô hình:
 * - Gemini 3.x (3.8-flash, 3.5-flash-lite): Dùng thinkingLevel ('high' cho bài khó, 'low' cho bài nhanh)
 * - Gemini 2.5: Dùng thinkingBudget (8192 tokens cho bài khó, 1024 cho bài nhanh)
 */
export function buildThinkingConfig(model, explicitMode = null) {
  const mode = explicitMode || getActiveThinkingMode();
  const isDeep = mode === 'deep' || mode === 'high';

  if (model && model.includes('2.5')) {
    return {
      thinkingBudget: isDeep ? 8192 : 1024,
    };
  }

  return {
    thinkingLevel: isDeep ? 'high' : 'low',
  };
}

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

export async function generateText(prompt, systemInstruction = '', imagePart = null, thinkingMode = null) {
  const ai = getAIClient();
  const contents = imagePart ? [imagePart, prompt] : prompt;

  return await executeWithFallback(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemInstruction || undefined,
        thinkingConfig: buildThinkingConfig(model, thinkingMode),
      },
    });
    return response.text;
  });
}

export async function generateStream(prompt, onChunk, systemInstruction = '', imagePart = null, thinkingMode = null) {
  const ai = getAIClient();
  const contents = imagePart ? [imagePart, prompt] : prompt;

  return await executeWithFallback(async (model) => {
    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: systemInstruction || undefined,
        thinkingConfig: buildThinkingConfig(model, thinkingMode),
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

export async function generateJSON(prompt, schema, systemInstruction = '', thinkingMode = null) {
  const ai = getAIClient();

  return await executeWithFallback(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || undefined,
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: buildThinkingConfig(model, thinkingMode),
      },
    });
    return JSON.parse(response.text);
  });
}

function buildValidContents(historyMessages, currentTurn) {
  const turns = [];

  let hasStarted = false;
  for (const m of historyMessages) {
    if (!m.text && !m.base64) continue;
    if (m.text && (m.text.startsWith('⚠️') || m.text.startsWith('Lỗi'))) continue;

    const role = m.role === 'ai' ? 'model' : 'user';

    // Must start with user
    if (!hasStarted && role !== 'user') continue;
    hasStarted = true;

    const parts = [];
    if (m.base64 && m.mimeType) {
      parts.push({
        inlineData: {
          data: m.base64,
          mimeType: m.mimeType,
        },
      });
    }
    if (m.text) {
      parts.push({ text: m.text });
    }

    if (parts.length === 0) continue;

    const last = turns[turns.length - 1];
    if (last && last.role === role) {
      last.parts.push(...parts);
    } else {
      turns.push({ role, parts });
    }
  }

  // Append current turn
  const last = turns[turns.length - 1];
  if (last && last.role === currentTurn.role) {
    last.parts.push(...currentTurn.parts);
  } else {
    turns.push(currentTurn);
  }

  // Ensure starts with user
  while (turns.length > 0 && turns[0].role !== 'user') {
    turns.shift();
  }

  return turns;
}

export async function generateChatStream({
  messages = [],
  newPrompt = '',
  imagePart = null,
  systemInstruction = '',
  onChunk,
  thinkingMode = null,
}) {
  const ai = getAIClient();

  const currentParts = [];
  if (imagePart) currentParts.push(imagePart);
  if (newPrompt) currentParts.push({ text: newPrompt });

  const currentTurn = {
    role: 'user',
    parts: currentParts,
  };

  // Keep last 16 turns of chat history to provide deep context without token overflow
  const recentHistory = messages.slice(-16);
  const contents = buildValidContents(recentHistory, currentTurn);

  return await executeWithFallback(async (model) => {
    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: systemInstruction || undefined,
        thinkingConfig: buildThinkingConfig(model, thinkingMode),
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