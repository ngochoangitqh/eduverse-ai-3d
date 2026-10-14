import React, { useState } from 'react';
import { Type } from '@google/genai';
import { marked } from 'marked';
import { generateText, generateJSON } from '../../services/geminiService';
import { speakText, createSpeechRecognizer } from '../../services/speechService';

// 9. AI CHẤM ĐIỂM PHÁT ÂM
export function SpeakingCoachView({ englishMode }) {
  const [targetSentence, setTargetSentence] = useState(
    'Artificial intelligence is transforming modern education around the world.'
  );
  const [spokenText, setSpokenText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const startRecord = () => {
    const rec = createSpeechRecognizer('en-US', false);
    if (!rec) return alert('Trình duyệt không hỗ trợ nhận diện giọng nói!');
    setIsListening(true);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setSpokenText(transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  const evaluatePronunciation = async () => {
    if (!spokenText) return;
    setLoading(true);
    try {
      const res = await generateText(
        `Chế độ luyện thi: ${englishMode}. Câu mẫu: "${targetSentence}". Người học đọc được nhận diện là: "${spokenText}". Hãy chấm điểm phát âm trên thang 100%, chỉ ra các từ phát âm lệch và hướng dẫn cách đặt khẩu hình miệng/trọng âm bằng tiếng Việt.`
      );
      setFeedback(res);
    } catch (e) {
      setFeedback('Lỗi: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
          Chế độ: {englishMode}
        </span>
        <h2 className="text-xl font-bold">🎙️ AI Nhận Diện Giọng Nói & Chấm Phát Âm</h2>
        <textarea
          rows={3}
          value={targetSentence}
          onChange={(e) => setTargetSentence(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-base font-medium text-cyan-300"
        />
        <div className="flex gap-3">
          <button onClick={() => speakText(targetSentence)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold">
            🔊 Nghe Câu Mẫu
          </button>
          <button onClick={startRecord} className={`px-5 py-2.5 rounded-xl text-xs font-bold ${isListening ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'}`}>
            {isListening ? '🔴 Đang nghe bạn đọc...' : '🎤 Bấm Để Đọc'}
          </button>
        </div>

        {spokenText && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-3">
            <p className="text-xs text-slate-400">Giọng đọc AI nhận diện được:</p>
            <p className="text-base font-semibold text-white">"{spokenText}"</p>
            <button onClick={evaluatePronunciation} disabled={loading} className="w-full py-2.5 bg-indigo-600 rounded-xl text-xs font-bold">
              {loading ? 'AI đang phân tích...' : 'Chấm Điểm & Sửa Khẩu Hình'}
            </button>
          </div>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-6 overflow-y-auto max-h-[75vh]">
        <h3 className="font-bold text-emerald-400 mb-3">Nhận Xét Phát Âm Từ AI Coach:</h3>
        {feedback && <div className="prose prose-invert text-sm max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(feedback) }} />}
      </div>
    </div>
  );
}

// 10. TỪ VỰNG 3D THEO CHỦ ĐỀ
export function Vocab3DView({ englishMode }) {
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState({});
  const [loading, setLoading] = useState(false);

  const generateVocab = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            ipa: { type: Type.STRING },
            meaning: { type: Type.STRING },
            example: { type: Type.STRING }
          },
          required: ['word', 'ipa', 'meaning', 'example']
        }
      };
      const data = await generateJSON(
        `Tạo 6 từ vựng tiếng Anh chất lượng cao theo chuẩn ${englishMode} về chủ đề "${topic}".`,
        schema
      );
      setCards(data);
      setFlipped({});
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 flex gap-4">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={`Nhập chủ đề từ vựng (${englishMode}) - VD: Environment, Technology, Business...`}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm"
        />
        <button onClick={generateVocab} disabled={loading} className="px-6 py-3 bg-emerald-600 rounded-xl font-bold text-sm">
          {loading ? 'Đang tạo Flashcard 3D...' : 'Tạo Flashcard 3D'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c, i) => (
          <div
            key={i}
            onClick={() => setFlipped({ ...flipped, [i]: !flipped[i] })}
            className="h-56 perspective-1000 cursor-pointer"
          >
            <div className={`relative w-full h-full transform-style-3d ${flipped[i] ? 'rotate-y-180' : ''}`}>
              <div className="absolute inset-0 glass-panel rounded-2xl p-6 backface-hidden flex flex-col justify-between border border-emerald-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-400 font-bold">{englishMode}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); speakText(c.word); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs"
                  >
                    🔊 Phát âm
                  </button>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white">{c.word}</h3>
                  <p className="text-sm text-cyan-400 mt-1">{c.ipa}</p>
                </div>
                <p className="text-[11px] text-center text-slate-400">👆 Bấm để lật thẻ 3D xem nghĩa</p>
              </div>

              <div className="absolute inset-0 glass-panel rounded-2xl p-6 backface-hidden rotate-y-180 flex flex-col justify-center bg-indigo-950/80 border border-indigo-400/40">
                <p className="text-lg font-bold text-emerald-300 mb-2">{c.meaning}</p>
                <p className="text-xs text-slate-200 italic">"{c.example}"</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 11. AI CHẤM ĐIỂM VIẾT (WRITING)
export function WritingGraderView({ englishMode }) {
  const [essay, setEssay] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const gradeEssay = async () => {
    if (!essay.trim()) return;
    setLoading(true);
    try {
      const res = await generateText(
        `Bạn là giám khảo chấm thi ${englishMode} Writing. Hãy chấm bài viết sau theo 4 tiêu chí chuẩn, chỉ rõ từng lỗi sai ngữ pháp/từ vựng và viết lại 1 phiên bản nâng cấp đạt điểm tối đa:
${essay}`
      );
      setResult(res);
    } catch (e) {
      setResult('Lỗi: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">✍️ AI Chấm Điểm Writing ({englishMode})</h2>
        <textarea
          rows={10}
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder="Dán bài luận IELTS Writing Task 1/2, Email TOEIC hoặc đoạn văn tiếng Anh vào đây..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm"
        />
        <button onClick={gradeEssay} disabled={loading} className="w-full py-3 bg-emerald-600 rounded-xl font-bold">
          {loading ? 'Đang chấm bài...' : 'Chấm Điểm & Sửa Bài Chi Tiết'}
        </button>
      </div>
      <div className="glass-panel rounded-2xl p-6 overflow-y-auto max-h-[75vh]">
        <h3 className="font-bold text-emerald-400 mb-3">Báo Cáo Chấm Điểm Từ Giám Khảo AI:</h3>
        {result && <div className="prose prose-invert text-sm max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(result) }} />}
      </div>
    </div>
  );
}

// 12. GIẢI THÍCH NGỮ PHÁP
export function GrammarView({ englishMode }) {
  const [query, setQuery] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const explainGrammar = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await generateText(
        `Giải thích chi tiết chủ điểm ngữ pháp hoặc phân tích cấu trúc câu sau theo định hướng ${englishMode} (Gồm: Công thức, Cách dùng, Ví dụ thực tế, Lỗi hay sai):
${query}`
      );
      setExplanation(res);
    } catch (e) {
      setExplanation('Lỗi: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">✨ Giải Thích Ngữ Pháp Chuyên Sâu ({englishMode})</h2>
        <textarea
          rows={6}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập cấu trúc ngữ pháp (VD: Đảo ngữ, Mệnh đề quan hệ rút gọn) hoặc câu tiếng Anh bất kỳ..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm"
        />
        <button onClick={explainGrammar} disabled={loading} className="w-full py-3 bg-emerald-600 rounded-xl font-bold">
          {loading ? 'Đang phân tích...' : 'Phân Tích Ngữ Pháp'}
        </button>
      </div>
      <div className="glass-panel rounded-2xl p-6 overflow-y-auto max-h-[75vh]">
        <h3 className="font-bold text-emerald-400 mb-3">Bài Giảng Ngữ Pháp AI:</h3>
        {explanation && <div className="prose prose-invert text-sm max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(explanation) }} />}
      </div>
    </div>
  );
}