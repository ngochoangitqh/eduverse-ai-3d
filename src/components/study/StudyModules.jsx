import React, { useState, useRef } from 'react';
import { Type } from '@google/genai';
import { renderMarkdownWithMath } from '../../utils/mathRenderer';
import { Image as ImageIcon, X, Paperclip, Upload, RotateCcw } from 'lucide-react';
import { generateText, generateStream, generateChatStream, generateJSON, formatAIError } from '../../services/geminiService';
import { CHATBOT_SYSTEM_INSTRUCTION, SOLVER_SYSTEM_INSTRUCTION } from '../../config/systemInstructions';
import { createSpeechRecognizer } from '../../services/speechService';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      resolve({ base64, mimeType: file.type || 'image/png', url: result });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 1. CHATBOT GIA SƯ
export function ChatbotView() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Xin chào! Mình là Gia sư AI. Bạn có thể gõ câu hỏi hoặc dán trực tiếp ảnh chụp màn hình (Ctrl+V) vào đây nhé!' }
  ]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const imgData = await fileToBase64(file);
          setAttachedImage(imgData);
          break;
        }
      }
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const imgData = await fileToBase64(file);
      setAttachedImage(imgData);
    }
    e.target.value = '';
  };

  const sendMessage = async () => {
    if ((!input.trim() && !attachedImage) || loading) return;
    const userMsg = input.trim();
    const currentImg = attachedImage;

    setInput('');
    setAttachedImage(null);

    const newMsgObj = {
      role: 'user',
      text: userMsg || '(Đã gửi ảnh chụp màn hình)',
      image: currentImg?.url,
      base64: currentImg?.base64,
      mimeType: currentImg?.mimeType,
    };

    setMessages((prev) => [...prev, newMsgObj]);
    setLoading(true);

    const imagePart = currentImg
      ? {
          inlineData: {
            data: currentImg.base64,
            mimeType: currentImg.mimeType,
          },
        }
      : null;

    const promptText = userMsg || 'Hãy phân tích, giải thích hoặc giải chi tiết đề bài/nội dung trong hình ảnh này giúp mình.';

    let streamed = false;
    try {
      await generateChatStream({
        messages, // Gửi kèm toàn bộ lịch sử các câu chat trước để nhớ ngữ cảnh
        newPrompt: promptText,
        imagePart,
        systemInstruction: CHATBOT_SYSTEM_INSTRUCTION,
        onChunk: (currentText) => {
          if (!streamed) {
            streamed = true;
            setLoading(false);
            setMessages((prev) => [...prev, { role: 'ai', text: currentText }]);
          } else {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'ai', text: currentText };
              return updated;
            });
          }
        },
      });
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'ai', text: '⚠️ ' + formatAIError(err) }]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    if (confirm('Bắt đầu cuộc trò chuyện mới và làm mới bộ nhớ ngữ cảnh?')) {
      setMessages([
        { role: 'ai', text: 'Xin chào! Mình đã làm mới bộ nhớ ngữ cảnh. Bạn cần giải đáp bài tập hay lý thuyết môn nào?' }
      ]);
      setAttachedImage(null);
    }
  };

  const userTurnCount = messages.filter((m) => m.role === 'user').length;

  return (
    <div
      onPaste={handlePaste}
      className="glass-panel rounded-2xl p-6 flex flex-col h-[calc(100vh-7rem)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">🤖 AI Chatbot Gia Sư 24/7</h2>
          <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            🧠 Nhớ ngữ cảnh: {userTurnCount} lượt trao đổi
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            className="text-xs text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
            title="Làm mới cuộc trò chuyện để bắt đầu chủ đề mới"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Đoạn chat mới</span>
          </button>
          <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700">
            📋 Hỗ trợ dán ảnh (Ctrl+V)
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800/90 border border-slate-700'}`}>
              {m.image && (
                <img
                  src={m.image}
                  alt="Ảnh người dùng gửi"
                  className="max-w-xs max-h-60 rounded-xl mb-3 object-contain bg-black/40 border border-white/20 cursor-pointer"
                  onClick={() => window.open(m.image, '_blank')}
                  title="Bấm để xem ảnh phóng to"
                />
              )}
              {m.text && <div dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(m.text) }} />}
            </div>
          </div>
        ))}
        {loading && <div className="text-cyan-400 text-sm animate-pulse">AI đang suy nghĩ...</div>}
      </div>

      {/* Thumbnail ảnh đã dán hoặc chọn trước khi gửi */}
      {attachedImage && (
        <div className="mt-3 flex items-center gap-3 p-2.5 bg-slate-900/90 border border-indigo-500/40 rounded-xl w-fit animate-fadeIn">
          <img
            src={attachedImage.url}
            alt="Preview"
            className="w-14 h-14 object-cover rounded-lg border border-indigo-400/50"
          />
          <div className="text-xs">
            <p className="text-cyan-300 font-semibold flex items-center gap-1">
              📸 Đã đính kèm ảnh
            </p>
            <p className="text-slate-400 text-[11px]">Sẵn sàng gửi (nhập thêm câu hỏi hoặc bấm Gửi)</p>
          </div>
          <button
            onClick={() => setAttachedImage(null)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors ml-2"
            title="Xóa ảnh này"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mt-4 flex gap-3 items-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-cyan-400 transition-all flex items-center justify-center shrink-0"
          title="Tải ảnh lên hoặc bấm Ctrl+V để dán ảnh màn hình"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Nhập câu hỏi hoặc dán trực tiếp ảnh màn hình (Ctrl+V)..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={sendMessage}
          disabled={loading || (!input.trim() && !attachedImage)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm shrink-0"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

// 2. GIẢI BÀI TẬP AI
export function SolverView() {
  const [problem, setProblem] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [solution, setSolution] = useState('');
  const [loading, setLoading] = useState(false);
  const solverFileInputRef = useRef(null);

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const imgData = await fileToBase64(file);
          setAttachedImage(imgData);
          break;
        }
      }
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const imgData = await fileToBase64(file);
      setAttachedImage(imgData);
    }
    e.target.value = '';
  };

  const handleSolve = async () => {
    if ((!problem.trim() && !attachedImage) || loading) return;
    setLoading(true);
    setSolution('');

    const imagePart = attachedImage
      ? {
          inlineData: {
            data: attachedImage.base64,
            mimeType: attachedImage.mimeType,
          },
        }
      : null;

    const promptText = `Giải chi tiết bài tập sau từng bước (Phương pháp, Lời giải, Đáp số): \n${problem || 'Đề bài nằm trong hình ảnh đính kèm.'}`;

    try {
      await generateStream(
        promptText,
        (text) => setSolution(text),
        SOLVER_SYSTEM_INSTRUCTION,
        imagePart
      );
    } catch (e) {
      setSolution('⚠️ ' + formatAIError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" onPaste={handlePaste}>
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">📐 Giải Bài Tập Đa Môn</h2>
          <span className="text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700">
            Dán ảnh đề bài (Ctrl+V)
          </span>
        </div>

        {attachedImage && (
          <div className="flex items-center gap-3 p-3 bg-slate-900/90 border border-emerald-500/40 rounded-xl">
            <img
              src={attachedImage.url}
              alt="Problem preview"
              className="w-16 h-16 object-cover rounded-lg border border-slate-700"
            />
            <div className="flex-1 text-xs">
              <p className="text-emerald-400 font-semibold">📸 Đã đính kèm ảnh đề bài</p>
              <p className="text-slate-400 text-[11px]">AI sẽ đọc và giải trực tiếp từ ảnh này</p>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
              title="Xóa ảnh"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <textarea
          rows={7}
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Dán đề bài văn bản hoặc bấm Ctrl+V để dán trực tiếp ảnh chụp đề bài vào đây..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500"
        />

        <div className="flex gap-3">
          <input
            type="file"
            ref={solverFileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => solverFileInputRef.current?.click()}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <span>Tải ảnh đề</span>
          </button>
          <button
            onClick={handleSolve}
            disabled={loading || (!problem.trim() && !attachedImage)}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm"
          >
            {loading ? 'Đang giải bài...' : 'Giải Chi Tiết Từng Bước'}
          </button>
        </div>
      </div>
      <div className="glass-panel rounded-2xl p-6 overflow-y-auto max-h-[75vh]">
        <h3 className="font-bold text-cyan-400 mb-3">Lời Giải Từ AI:</h3>
        {solution ? <div className="prose prose-invert text-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(solution) }} /> : <p className="text-slate-500 text-sm">Kết quả lời giải sẽ hiển thị tại đây.</p>}
      </div>
    </div>
  );
}

// 3. TẠO SLIDE THUYẾT TRÌNH
export function SlideGenView() {
  const [topic, setTopic] = useState('');
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  const createSlides = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            speakerNotes: { type: Type.STRING }
          },
          required: ['title', 'bullets', 'speakerNotes']
        }
      };
      const data = await generateJSON(`Tạo 6 slide thuyết trình chuyên nghiệp về chủ đề: "${topic}" bằng tiếng Việt.`, schema);
      setSlides(data);
      setCurrent(0);
    } catch (e) {
      alert(formatAIError(e));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 flex gap-4">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Nhập chủ đề thuyết trình (VD: Trí tuệ nhân tạo trong Y tế)..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm"
        />
        <button onClick={createSlides} disabled={loading} className="px-6 py-3 bg-indigo-600 rounded-xl font-bold text-sm">
          {loading ? 'Đang thiết kế...' : 'Tạo Bộ Slide'}
        </button>
      </div>

      {slides.length > 0 && (
        <div className="glass-panel rounded-3xl p-8 border border-indigo-500/40 min-h-[380px] flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase">Slide {current + 1} / {slides.length}</span>
            <h2 className="text-3xl font-bold mt-2 mb-6 text-white">{slides[current].title}</h2>
            <ul className="space-y-3">
              {slides[current].bullets.map((b, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 mt-2" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-400 italic">🎙️ Ghi chú thuyết trình: {slides[current].speakerNotes}</p>
            <div className="flex gap-2">
              <button onClick={() => setCurrent(Math.max(0, current - 1))} className="px-4 py-2 bg-slate-800 rounded-lg text-xs">Trước</button>
              <button onClick={() => setCurrent(Math.min(slides.length - 1, current + 1))} className="px-4 py-2 bg-indigo-600 rounded-lg text-xs">Tiếp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 4. TÓM TẮT TÀI LIỆU / SLIDE
export function SummarizerView() {
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await generateText(`Tóm tắt tài liệu/slide sau thành: 1. Tóm lược cốt lõi, 2. Các ý chính, 3. Thuật ngữ quan trọng, 4. Câu hỏi ôn tập:
${content}`);
      setSummary(res);
    } catch (e) {
      setSummary('⚠️ ' + formatAIError(e));
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">📄 Tóm Tắt Tài Liệu & Slide</h2>
        <textarea
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Dán nội dung giáo trình, bài báo hoặc slide vào đây..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm"
        />
        <button onClick={handleSummarize} disabled={loading} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">
          {loading ? 'Đang tóm tắt...' : 'Tóm Tắt Ngay'}
        </button>
      </div>
      <div className="glass-panel rounded-2xl p-6 overflow-y-auto max-h-[75vh]">
        <h3 className="font-bold text-cyan-400 mb-3">Bản Tóm Tắt Thông Minh:</h3>
        {summary && <div className="prose prose-invert text-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(summary) }} />}
      </div>
    </div>
  );
}

// 5. THEO DÕI & TÓM TẮT CUỘC HỌP
export function MeetingTrackerView() {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMic = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    const rec = createSpeechRecognizer('vi-VN', true);
    if (!rec) return alert('Trình duyệt không hỗ trợ Web Speech API');
    setIsRecording(true);
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + ' ';
      setTranscript(text);
    };
    rec.onend = () => setIsRecording(false);
    rec.start();
  };

  const summarizeMeeting = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    try {
      const res = await generateText(`Phân tích biên bản cuộc họp sau và xuất ra: 1. Tóm tắt nội dung, 2. Các quyết định đã chốt, 3. Action Items (Danh sách việc cần làm & người phụ trách):
${transcript}`);
      setMinutes(res);
    } catch (e) {
      setMinutes('⚠️ ' + formatAIError(e));
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">🎙️ Theo Dõi & Tóm Tắt Cuộc Họp</h2>
          <button onClick={toggleMic} className={`px-4 py-2 rounded-xl text-xs font-bold ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'}`}>
            {isRecording ? '🔴 Đang ghi âm...' : '🎤 Bắt đầu thu âm'}
          </button>
        </div>
        <textarea
          rows={9}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Bấm thu âm trực tiếp hoặc dán nội dung cuộc họp nhóm vào đây..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm"
        />
        <button onClick={summarizeMeeting} disabled={loading} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">
          {loading ? 'Đang xuất biên bản...' : 'Xuất Biên Bản & Action Items'}
        </button>
      </div>
      <div className="glass-panel rounded-2xl p-6 overflow-y-auto max-h-[75vh]">
        <h3 className="font-bold text-cyan-400 mb-3">Biên Bản Cuộc Họp AI:</h3>
        {minutes && <div className="prose prose-invert text-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(minutes) }} />}
      </div>
    </div>
  );
}

// 6. TẠO QUIZ TRẮC NGHIỆM
export function QuizMakerView() {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);

  const createQuiz = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            answerIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ['question', 'options', 'answerIndex', 'explanation']
        }
      };
      const data = await generateJSON(`Tạo 5 câu hỏi trắc nghiệm khách quan (4 đáp án) về chủ đề: "${topic}".`, schema);
      setQuestions(data);
      setSelected({});
    } catch (e) {
      alert(formatAIError(e));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 flex gap-4">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Nhập chủ đề tạo Quiz (VD: Mạng máy tính OSI, Lập trình OOP)..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm"
        />
        <button onClick={createQuiz} disabled={loading} className="px-6 py-3 bg-indigo-600 rounded-xl font-bold text-sm">
          {loading ? 'Đang tạo đề...' : 'Tạo Đề Quiz'}
        </button>
      </div>
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={idx} className="glass-panel rounded-2xl p-6 space-y-3">
            <p className="font-bold text-white">Câu {idx + 1}: {q.question}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {q.options.map((opt, oIdx) => {
                const isPicked = selected[idx] === oIdx;
                const isCorrect = q.answerIndex === oIdx;
                let bg = 'bg-slate-900 border-slate-700';
                if (selected[idx] !== undefined) {
                  if (isCorrect) bg = 'bg-emerald-600/30 border-emerald-500 text-emerald-200';
                  else if (isPicked) bg = 'bg-red-600/30 border-red-500 text-red-200';
                }
                return (
                  <button
                    key={oIdx}
                    onClick={() => setSelected({ ...selected, [idx]: oIdx })}
                    className={`p-3 rounded-xl border text-left text-sm transition-all ${bg}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {selected[idx] !== undefined && (
              <p className="text-xs text-cyan-300 bg-slate-900/70 p-3 rounded-xl">💡 Giải thích: {q.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 7. SƠ ĐỒ TƯ DUY (MINDMAP)
export function MindmapView() {
  const [topic, setTopic] = useState('');
  const [mindmap, setMindmap] = useState(null);
  const [loading, setLoading] = useState(false);

  const createMindmap = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const schema = {
        type: Type.OBJECT,
        properties: {
          root: { type: Type.STRING },
          branches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                items: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['title', 'items']
            }
          }
        },
        required: ['root', 'branches']
      };
      const data = await generateJSON(`Tạo sơ đồ tư duy phân nhánh chi tiết cho chủ đề: "${topic}"`, schema);
      setMindmap(data);
    } catch (e) {
      alert(formatAIError(e));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 flex gap-4">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Nhập chủ đề cần vẽ Sơ đồ tư duy..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm"
        />
        <button onClick={createMindmap} disabled={loading} className="px-6 py-3 bg-indigo-600 rounded-xl font-bold text-sm">
          {loading ? 'Đang vẽ...' : 'Vẽ Mindmap'}
        </button>
      </div>

      {mindmap && (
        <div className="glass-panel rounded-2xl p-8 space-y-8">
          <div className="flex justify-center">
            <div className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 font-bold text-xl shadow-xl">
              🌟 {mindmap.root}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mindmap.branches.map((b, i) => (
              <div key={i} className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-cyan-400 text-base">{b.title}</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  {b.items.map((it, idx) => (
                    <li key={idx} className="pl-3 border-l-2 border-indigo-500/50">{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 8. LỘ TRÌNH HỌC TẬP
export function RoadmapView() {
  const [goal, setGoal] = useState('');
  const [roadmap, setRoadmap] = useState([]);
  const [loading, setLoading] = useState(false);

  const createRoadmap = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    try {
      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            phase: { type: Type.STRING },
            duration: { type: Type.STRING },
            topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            outcome: { type: Type.STRING }
          },
          required: ['phase', 'duration', 'topics', 'outcome']
        }
      };
      const data = await generateJSON(`Thiết kế lộ trình học tập từng giai đoạn cho mục tiêu: "${goal}"`, schema);
      setRoadmap(data);
    } catch (e) {
      alert(formatAIError(e));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 flex gap-4">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Nhập mục tiêu học tập (VD: Đạt IELTS 7.0 trong 3 tháng, Fullstack Developer)..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm"
        />
        <button onClick={createRoadmap} disabled={loading} className="px-6 py-3 bg-indigo-600 rounded-xl font-bold text-sm">
          {loading ? 'Đang lập lộ trình...' : 'Tạo Lộ Trình'}
        </button>
      </div>
      <div className="space-y-4">
        {roadmap.map((step, i) => (
          <div key={i} className="glass-panel rounded-2xl p-6 border-l-4 border-l-cyan-400">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg text-white">{step.phase}</h3>
              <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300">{step.duration}</span>
            </div>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1 mb-3">
              {step.topics.map((t, idx) => <li key={idx}>{t}</li>)}
            </ul>
            <p className="text-xs text-emerald-400 font-semibold">🎯 Đầu ra: {step.outcome}</p>
          </div>
        ))}
      </div>
    </div>
  );
}