import React, { useState, useRef, useEffect } from 'react';
import { Type } from '@google/genai';
import { renderMarkdownWithMath } from '../../utils/mathRenderer';
import {
  Image as ImageIcon, X, Paperclip, Upload, RotateCcw, Cloud,
  Plus, Trash2, MessageSquare, History, ChevronLeft, ChevronRight, BookOpen, Brain,
  FileText, FileUp, Sparkles, Copy, Check, Download, Volume2, Presentation, Loader2,
  Layers, AlertCircle, FileCheck
} from 'lucide-react';
import { generateText, generateStream, generateChatStream, generateJSON, formatAIError, getActiveThinkingMode, setActiveThinkingMode } from '../../services/geminiService';
import { CHATBOT_SYSTEM_INSTRUCTION, SOLVER_SYSTEM_INSTRUCTION } from '../../config/systemInstructions';
import { createSpeechRecognizer, speakText } from '../../services/speechService';
import {
  saveSolutionToCloud,
  saveChatSessionToCloud,
  updateChatSessionInCloud,
  deleteChatSessionFromCloud,
  getCurrentUser,
  subscribeToAuthChanges,
  getSavedChatSessionsFromCloud
} from '../../services/firebaseService';
import {
  getStoredDocuments,
  getAllActiveChunks,
  searchRelevantChunks,
  buildRAGContextPrompt,
  extractTextFromFile
} from '../../services/ragService';
import {
  getCollectiveWisdomPrompt,
  distillInsightFromConversation,
  getStoredCollectiveInsights
} from '../../services/collectiveLearningService';
import CollectiveBrainModal from './CollectiveBrainModal';
import { GeneticExamGeneratorCSP, SAMPLE_QUESTION_BANK } from '../../services/aiAlgorithms/geneticExamGenerator';
import { createSampleSemanticNetwork } from '../../services/aiAlgorithms/expertSystemSemanticNet';

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

// 1. CHATBOT GIA SƯ (Multi-session, Per-User Private History, Collective Learning)
function getUserChatStorageKey(user) {
  return user?.uid ? `EDUVERSE_CHAT_SESSIONS_${user.uid}` : 'EDUVERSE_CHAT_SESSIONS_guest';
}

function createDefaultSession(title = 'Đoạn chat mới') {
  return {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      { role: 'ai', text: 'Xin chào! Mình là Gia sư AI. Bạn có thể gõ câu hỏi hoặc dán trực tiếp ảnh chụp màn hình (Ctrl+V) vào đây nhé!' }
    ]
  };
}

function loadSessionsForUser(user) {
  const key = getUserChatStorageKey(user);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Lỗi đọc lịch sử chat từ localStorage:', e);
  }
  return [createDefaultSession()];
}

export function ChatbotView() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const [sessions, setSessions] = useState(() => loadSessionsForUser(getCurrentUser()));
  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0]?.id || '');
  const [showHistory, setShowHistory] = useState(true);
  const [showCollectiveBrain, setShowCollectiveBrain] = useState(false);
  const [collectiveCount, setCollectiveCount] = useState(() => getStoredCollectiveInsights().length);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(getActiveThinkingMode());
  const [ragEnabled, setRagEnabled] = useState(true);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Lắng nghe đăng nhập/đổi tài khoản để nạp đúng lịch sử chat riêng của từng người dùng
  useEffect(() => {
    const unsub = subscribeToAuthChanges(async (user) => {
      setCurrentUser(user);
      const userSessions = loadSessionsForUser(user);
      setSessions(userSessions);
      setActiveSessionId(userSessions[0]?.id || '');

      // Nếu đã đăng nhập Firebase, tải thêm các phiên đã lưu từ Cloud của tài khoản đó
      if (user?.uid) {
        try {
          const cloudSessions = await getSavedChatSessionsFromCloud(15);
          if (cloudSessions && cloudSessions.length > 0) {
            setSessions((prev) => {
              const map = new Map();
              cloudSessions.forEach((cs) => {
                map.set(cs.id, {
                  id: cs.id,
                  title: cs.title || 'Đoạn chat',
                  createdAt: cs.updatedAt?.toMillis ? cs.updatedAt.toMillis() : Date.now(),
                  updatedAt: cs.updatedAt?.toMillis ? cs.updatedAt.toMillis() : Date.now(),
                  messages: cs.messages || [],
                });
              });
              prev.forEach((ls) => {
                if (!map.has(ls.id)) {
                  map.set(ls.id, ls);
                }
              });
              const merged = Array.from(map.values());
              try {
                localStorage.setItem(getUserChatStorageKey(user), JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
        } catch (err) {
          console.warn('Đồng bộ chat Firestore bị hoãn:', err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Lưu sessions vào localStorage theo đúng user
  useEffect(() => {
    try {
      const key = getUserChatStorageKey(currentUser);
      localStorage.setItem(key, JSON.stringify(sessions));
    } catch (e) {
      console.error('Lỗi ghi sessions vào localStorage:', e);
    }
  }, [sessions, currentUser]);

  // Đảm bảo activeSessionId luôn hợp lệ
  useEffect(() => {
    if (!sessions.some((s) => s.id === activeSessionId)) {
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      }
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || createDefaultSession();
  const messages = activeSession.messages || [];

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, loading]);

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

  // Tạo đoạn chat mới
  const handleCreateNewChat = () => {
    const newSession = createDefaultSession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setInput('');
    setAttachedImage(null);
  };

  // Xóa đoạn chat cũ
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    const targetSession = sessions.find((s) => s.id === sessionId);
    const title = targetSession?.title || 'đoạn chat này';
    if (!confirm(`Bạn có chắc chắn muốn xóa "${title}" không?`)) return;

    const remaining = sessions.filter((s) => s.id !== sessionId);

    if (remaining.length === 0) {
      const fresh = createDefaultSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
      }
    }

    // Xóa trên Firestore nếu đã đăng nhập
    try {
      await deleteChatSessionFromCloud(sessionId);
    } catch (err) {
      console.warn('Lỗi khi xóa trên Firestore (bỏ qua nếu chỉ lưu local):', err);
    }
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

    // Tự động đặt tên tiêu đề theo câu hỏi đầu tiên
    let updatedTitle = activeSession.title;
    if (updatedTitle === 'Đoạn chat mới' || !updatedTitle) {
      const rawText = userMsg || 'Ảnh bài tập';
      updatedTitle = rawText.length > 32 ? rawText.slice(0, 32) + '...' : rawText;
    }

    const updatedMessages = [...messages, newMsgObj];

    // Cập nhật state session với tin nhắn người dùng
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              title: updatedTitle,
              updatedAt: Date.now(),
              messages: updatedMessages,
            }
          : s
      )
    );

    setLoading(true);

    const imagePart = currentImg
      ? {
          inlineData: {
            data: currentImg.base64,
            mimeType: currentImg.mimeType,
          },
        }
      : null;

    // Tự động tìm kiếm trong Kho Sách RAG nếu tính năng đang bật
    let ragContext = '';
    if (ragEnabled && userMsg) {
      try {
        const docs = getStoredDocuments();
        const activeChunks = getAllActiveChunks(docs);
        if (activeChunks.length > 0) {
          const matched = searchRelevantChunks(userMsg, activeChunks, 3);
          if (matched.length > 0 && matched[0].score > 3) {
            ragContext = buildRAGContextPrompt(matched);
          }
        }
      } catch (err) {
        console.warn('Lỗi RAG search:', err);
      }
    }

    const basePrompt = userMsg || 'Hãy phân tích, giải thích hoặc giải chi tiết đề bài/nội dung trong hình ảnh này giúp mình.';
    const promptText = ragContext ? `${basePrompt}\n\n${ragContext}` : basePrompt;

    let streamed = false;
    let finalAiAnswer = '';
    try {
      // Kết hợp System Instruction chuẩn và Trí Tuệ Cộng Hưởng tích lũy từ tất cả học sinh
      const collectiveWisdom = getCollectiveWisdomPrompt(6);
      const dynamicSystemInstruction = CHATBOT_SYSTEM_INSTRUCTION + collectiveWisdom;

      await generateChatStream({
        messages: updatedMessages,
        newPrompt: promptText,
        imagePart,
        systemInstruction: dynamicSystemInstruction,
        thinkingMode,
        onChunk: (currentText) => {
          finalAiAnswer = currentText;
          if (!streamed) {
            streamed = true;
            setLoading(false);
            setSessions((prev) =>
              prev.map((s) =>
                s.id === activeSession.id
                  ? {
                      ...s,
                      messages: [...updatedMessages, { role: 'ai', text: currentText }],
                    }
                  : s
              )
            );
          } else {
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== activeSession.id) return s;
                const curMsgs = [...s.messages];
                curMsgs[curMsgs.length - 1] = { role: 'ai', text: currentText };
                return { ...s, messages: curMsgs };
              })
            );
          }
        },
      });

      // Tự động phân tích và học hỏi bài học ẩn danh đưa vào Bộ Não Cộng Đồng
      if (userMsg && finalAiAnswer && finalAiAnswer.length > 50) {
        distillInsightFromConversation(userMsg, finalAiAnswer)
          .then((newInsight) => {
            if (newInsight) {
              setCollectiveCount(getStoredCollectiveInsights().length);
            }
          })
          .catch(() => {});
      }

      // Tự động đồng bộ lên Firebase nếu người dùng đã đăng nhập
      const user = getCurrentUser();
      if (user) {
        setSessions((currentSessions) => {
          const cur = currentSessions.find((s) => s.id === activeSession.id);
          if (cur) {
            updateChatSessionInCloud(cur.id, cur.messages, cur.title).catch(() => {});
          }
          return currentSessions;
        });
      }
    } catch (err) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                messages: [...s.messages, { role: 'ai', text: '⚠️ ' + formatAIError(err) }],
              }
            : s
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCloud = async () => {
    const user = getCurrentUser();
    if (!user) {
      alert('Vui lòng đăng nhập tài khoản (ở góc dưới trái hoặc Cài đặt) để đồng bộ dữ liệu lên Firebase Cloud!');
      return;
    }
    if (messages.length <= 1) {
      alert('Chưa có nội dung trao đổi nào để lưu!');
      return;
    }
    try {
      await updateChatSessionInCloud(activeSession.id, messages, activeSession.title);
      alert(`✅ Đã lưu và đồng bộ "${activeSession.title}" lên Firebase Cloud thành công!`);
    } catch (e) {
      alert('Lỗi lưu đám mây: ' + (e.message || e));
    }
  };

  const userTurnCount = messages.filter((m) => m.role === 'user').length;

  return (
    <div
      onPaste={handlePaste}
      className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-row h-[calc(100vh-7rem)] overflow-hidden"
    >
      {/* 1. KHUNG LỊCH SỬ CHAT (SIDEBAR) */}
      <div
        className={`${
          showHistory ? 'w-64 sm:w-72 flex' : 'hidden'
        } flex-col border-r border-slate-800 pr-3 mr-3 shrink-0 h-full transition-all duration-200`}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Lịch sử chat</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
              {sessions.length}
            </span>
          </div>
          <button
            onClick={() => setShowHistory(false)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Đóng thanh lịch sử"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Nút thêm đoạn chat mới */}
        <button
          onClick={handleCreateNewChat}
          className="w-full py-2.5 px-3 mb-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          title="Tạo cuộc trò chuyện mới với Gia sư AI"
        >
          <Plus className="w-4 h-4" />
          <span>Đoạn chat mới</span>
        </button>

        {/* Danh sách các đoạn chat */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {sessions.map((s) => {
            const isActive = s.id === activeSession.id;
            const turnCount = s.messages?.filter((m) => m.role === 'user').length || 0;
            return (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all border ${
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate block leading-tight">{s.title || 'Đoạn chat'}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {turnCount > 0 ? `${turnCount} câu hỏi` : 'Mới tạo'}
                    </span>
                  </div>
                </div>

                {/* Nút xóa đoạn chat */}
                <button
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all shrink-0 cursor-pointer"
                  title="Xóa đoạn chat này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. KHUNG NỘI DUNG CHAT CHÍNH */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header trên */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            {!showHistory && (
              <button
                onClick={() => setShowHistory(true)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                title="Mở thanh lịch sử chat"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lịch sử ({sessions.length})</span>
              </button>
            )}

            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate text-slate-100 max-w-[200px] sm:max-w-xs">
                {activeSession.title || 'AI Chatbot Gia Sư'}
              </h2>
              <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full font-medium hidden sm:flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {userTurnCount} lượt
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium hidden md:flex items-center gap-1 shrink-0 ${
                  currentUser
                    ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30'
                    : 'text-slate-400 bg-slate-800 border border-slate-700'
                }`}
                title={currentUser ? `Lịch sử chat cá nhân riêng biệt của: ${currentUser.email}` : 'Chế độ khách. Đăng nhập để bảo vệ & đồng bộ lịch sử riêng!'}
              >
                <span>{currentUser ? `🔒 ${currentUser.displayName || currentUser.email?.split('@')[0]}` : '👤 Khách'}</span>
              </span>
            </div>

            <button
              onClick={() => setShowCollectiveBrain(true)}
              className="text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 border transition-all cursor-pointer bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/40 hover:from-purple-500/30 hover:to-pink-500/30 shadow-sm shrink-0"
              title="Xem Bộ Não Trí Tuệ Cộng Hưởng: AI học hỏi từ tất cả học sinh để trở nên thông minh hơn"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Trí Tuệ Cộng Hưởng ({collectiveCount})</span>
            </button>

            <button
              onClick={() => {
                const next = thinkingMode === 'deep' ? 'fast' : 'deep';
                setThinkingMode(next);
                setActiveThinkingMode(next);
              }}
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                thinkingMode === 'deep'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Bật/Tắt chế độ Tư duy sâu (Thinking Budget tối đa cho bài khó)"
            >
              <span>{thinkingMode === 'deep' ? '🧠 Tư duy sâu: BẬT' : '⚡ Nhanh (Low Budget)'}</span>
            </button>

            <button
              onClick={() => setRagEnabled(!ragEnabled)}
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                ragEnabled
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-sm shadow-violet-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Bật/Tắt tra cứu bám sát Kho Sách Giáo Khoa (RAG)"
            >
              <BookOpen className="w-3.5 h-3.5 text-violet-400" />
              <span>{ragEnabled ? '📚 SGK RAG: BẬT' : '📚 SGK: TẮT'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCreateNewChat}
              className="text-xs text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 px-3 py-1.5 rounded-xl border border-cyan-500/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Tạo phiên trò chuyện mới"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Đoạn chat mới</span>
            </button>
            <button
              onClick={handleSaveToCloud}
              className="text-xs text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 px-3 py-1.5 rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Lưu phiên trò chuyện này lên Firebase Cloud"
            >
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Lưu Cloud</span>
            </button>
            <span className="text-xs text-slate-400 hidden md:flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700">
              📋 Ctrl+V dán ảnh
            </span>
          </div>
        </div>

        {/* Danh sách tin nhắn */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-2xl p-4 rounded-2xl text-sm ${
                  m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800/90 border border-slate-700'
                }`}
              >
                {m.image && (
                  <img
                    src={m.image}
                    alt="Ảnh gửi kèm"
                    className="max-w-xs max-h-60 rounded-xl mb-3 object-contain bg-black/40 border border-white/20 cursor-pointer"
                    onClick={() => window.open(m.image, '_blank')}
                    title="Bấm để xem ảnh phóng to"
                  />
                )}
                {m.text && <div dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(m.text) }} />}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-purple-300 text-xs flex items-center gap-2 animate-pulse py-2 px-3 rounded-xl bg-purple-950/30 border border-purple-500/20 w-fit">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span>
                {thinkingMode === 'deep'
                  ? '🧠 Đang dùng Thinking Budget tối đa: AI đang lập luận đa bước và kiểm tra bẫy...'
                  : '⚡ AI đang soạn câu trả lời...'}
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Thumbnail ảnh đính kèm */}
        {attachedImage && (
          <div className="mt-3 flex items-center gap-3 p-2.5 bg-slate-900/90 border border-indigo-500/40 rounded-xl w-fit animate-fadeIn">
            <img
              src={attachedImage.url}
              alt="Preview"
              className="w-14 h-14 object-cover rounded-lg border border-indigo-400/50"
            />
            <div className="text-xs">
              <p className="text-cyan-300 font-semibold flex items-center gap-1">📸 Đã đính kèm ảnh</p>
              <p className="text-slate-400 text-[11px]">Sẵn sàng gửi (nhập câu hỏi hoặc bấm Gửi)</p>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors ml-2 cursor-pointer"
              title="Xóa ảnh này"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Khung nhập tin nhắn */}
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
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-cyan-400 transition-all flex items-center justify-center shrink-0 cursor-pointer"
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
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-sm shrink-0 cursor-pointer"
          >
            Gửi
          </button>
        </div>
      </div>

      {/* Modal Trí Tuệ Cộng Hưởng */}
      <CollectiveBrainModal
        isOpen={showCollectiveBrain}
        onClose={() => setShowCollectiveBrain(false)}
      />
    </div>
  );
}

// 2. GIẢI BÀI TẬP AI
export function SolverView() {
  const [problem, setProblem] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [solution, setSolution] = useState('');
  const [loading, setLoading] = useState(false);
  const [solverThinkingMode, setSolverThinkingMode] = useState('deep');
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

    const promptText = solverThinkingMode === 'deep'
      ? `[YÊU CẦU: Vận dụng tối đa Thinking Budget để suy luận sâu và kiểm tra logic bài khó]\nGiải chi tiết bài tập sau từng bước (Phương pháp, Lời giải, Đáp số): \n${problem || 'Đề bài nằm trong hình ảnh đính kèm.'}`
      : `Giải chi tiết bài tập sau từng bước (Phương pháp, Lời giải, Đáp số): \n${problem || 'Đề bài nằm trong hình ảnh đính kèm.'}`;

    try {
      await generateStream(
        promptText,
        (text) => setSolution(text),
        SOLVER_SYSTEM_INSTRUCTION,
        imagePart,
        solverThinkingMode
      );
    } catch (e) {
      setSolution('⚠️ ' + formatAIError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSolutionToCloud = async () => {
    const user = getCurrentUser();
    if (!user) {
      alert('Vui lòng đăng nhập Google ở menu bên trái (Cài đặt) để đồng bộ bài giải lên Firebase Cloud!');
      return;
    }
    if (!solution) return;
    try {
      await saveSolutionToCloud({
        problem: problem || 'Đề bài qua hình ảnh',
        solution,
        hasImage: Boolean(attachedImage),
        thinkingMode: solverThinkingMode,
      });
      alert('✅ Đã lưu bài giải thành công lên Cloud Firestore!');
    } catch (e) {
      alert('Lỗi lưu bài giải: ' + (e.message || e));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" onPaste={handlePaste}>
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold">📐 Giải Bài Tập Đa Môn</h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSolverThinkingMode('deep')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  solverThinkingMode === 'deep'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Kích hoạt Thinking Budget tối đa cho bài khó / vận dụng cao"
              >
                <span>🧠 Tư duy sâu (Bài khó)</span>
              </button>
              <button
                type="button"
                onClick={() => setSolverThinkingMode('fast')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
                  solverThinkingMode === 'fast'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Giải nhanh với bài tập cơ bản"
              >
                <span>⚡ Nhanh</span>
              </button>
            </div>
            <span className="text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700 hidden sm:inline">
              Ctrl+V dán ảnh
            </span>
          </div>
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
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-cyan-400">Lời Giải Từ AI:</h3>
            {solution && (
              <button
                onClick={handleSaveSolutionToCloud}
                className="text-[11px] px-2.5 py-0.5 rounded-full font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer"
                title="Lưu bài giải này lên Firebase Cloud"
              >
                <Cloud className="w-3 h-3 text-amber-400" />
                <span>Lưu Cloud</span>
              </button>
            )}
          </div>
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
            solverThinkingMode === 'deep'
              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
              : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
          }`}>
            {solverThinkingMode === 'deep' ? '🧠 Chế độ: High Thinking Budget' : '⚡ Chế độ: Fast'}
          </span>
        </div>
        {loading && (
          <div className="p-3 mb-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>
              {solverThinkingMode === 'deep'
                ? '🧠 Đang kích hoạt Thinking Budget tối đa: AI đang lập luận đa bước, thử nghiệm các hướng giải và rà soát bẫy đề thi...'
                : '⚡ AI đang giải bài tập...'}
            </span>
          </div>
        )}
        {solution ? (
          <div className="prose prose-invert text-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(solution) }} />
        ) : !loading && (
          <p className="text-slate-500 text-sm">Kết quả lời giải sẽ hiển thị tại đây.</p>
        )}
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

// 4. TÓM TẮT TÀI LIỆU & SLIDE BÀI GIẢNG (HỖ TRỢ PPTX, PDF, DOCX, TXT, ẢNH SLIDE)
export function SummarizerView() {
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [summaryMode, setSummaryMode] = useState('comprehensive');
  const [fileInfo, setFileInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fileInputRef = useRef(null);

  // Xử lý khi người dùng chọn hoặc thả file tài liệu / slide
  const handleFileProcess = async (file) => {
    if (!file) return;
    setExtracting(true);
    try {
      const result = await extractTextFromFile(file);
      setContent(result.text);
      setFileInfo({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: result.fileType,
        pageCount: result.pageCount,
        isImage: !!result.isImage,
        imageDataUrl: result.imageDataUrl || null,
        imagePart: result.imagePart || null
      });
      setSummary(''); // Xóa bản tóm tắt cũ
    } catch (err) {
      console.error('Lỗi trích xuất file:', err);
      alert('Không thể trích xuất file: ' + err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const removeFile = () => {
    setFileInfo(null);
    setContent('');
    setSummary('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Nạp slide bài giảng mẫu để thử nghiệm nhanh
  const loadSampleSlide = () => {
    const sampleText = `[--- SLIDE 1: GIỚI THIỆU TRÍ TUỆ NHÂN TẠO & HỌC MÁY ---]
Chủ đề: Tổng quan về Artificial Intelligence (AI) và Machine Learning (ML).
Mục tiêu bài giảng:
1. Phân biệt Trí tuệ nhân tạo (AI), Học máy (ML) và Học sâu (Deep Learning).
2. Nắm vững 3 mô hình học máy cơ bản: Có giám sát (Supervised), Không giám sát (Unsupervised), Tăng cường (Reinforcement).
3. Ứng dụng thực tế của AI trong giáo dục, y tế và tự động hóa.

[--- SLIDE 2: HỌC CÓ GIÁM SÁT (SUPERVISED LEARNING) ---]
- Định nghĩa: Mô hình được huấn luyện trên tập dữ liệu đã được gán nhãn (Labeled Data) (đầu vào X và nhãn đúng Y).
- Hai bài toán cốt lõi:
  + Phân lớp (Classification): Dự đoán nhãn rời rạc (VD: Email Spam vs Non-spam, Khối u ác tính vs lành tính).
  + Hồi quy (Regression): Dự đoán giá trị liên tục (VD: Dự đoán giá nhà, dự báo nhiệt độ ngày mai).
- Thuật toán tiêu biểu: Linear Regression, Logistic Regression, Decision Tree, Random Forest, SVM.

[--- SLIDE 3: HỌC KHÔNG GIÁM SÁT (UNSUPERVISED LEARNING) ---]
- Định nghĩa: Mô hình tự tìm cấu trúc ẩn trong dữ liệu chưa gán nhãn (Unlabeled Data).
- Hai bài toán tiêu biểu:
  + Phân cụm (Clustering): Gom các điểm dữ liệu tương đồng vào nhóm (VD: K-Means phân khúc khách hàng).
  + Giảm chiều dữ liệu (Dimensionality Reduction): Nén đặc trưng giữ lại phương sai lớn nhất (VD: PCA, t-SNE).

[--- SLIDE 4: MẠNG NƠ-RON NHÂN TẠO & HỌC SÂU (DEEP LEARNING) ---]
- Cấu trúc mạng Perceptron đa lớp (MLP): Input Layer, Hidden Layers, Output Layer.
- Hàm kích hoạt (Activation Function): ReLU, Sigmoid, Softmax đưa tính phi tuyến tính vào mạng.
- Quá trình huấn luyện:
  + Lan truyền tiến (Forward Propagation): Tính toán dự đoán và hàm mất mát (Loss Function).
  + Lan truyền ngược (Backpropagation) & Gradient Descent: Cập nhật trọng số W và bias b để tối thiểu hóa sai số.

[--- SLIDE 5: KẾT LUẬN & ĐỊNH HƯỚNG ÔN THI ---]
- Công thức trọng tâm cần nhớ: Hàm mất mát MSE cho hồi quy, Cross-Entropy Loss cho phân lớp.
- Lưu ý bẫy đề thi: Hiện tượng quá khớp (Overfitting) khi mô hình quá phức tạp nhưng dữ liệu ít; biện pháp khắc phục: Regularization (L1/L2), Dropout, Data Augmentation.`;

    setContent(sampleText);
    setFileInfo({
      name: 'Slide_Mau_Artificial_Intelligence_Overview.pptx',
      size: '1.85 MB',
      type: 'PPTX (PowerPoint)',
      pageCount: 5,
      isImage: false
    });
    setSummary('');
  };

  // Tạo prompt tóm tắt dựa theo chế độ
  const buildPrompt = () => {
    const fileHeader = fileInfo?.name ? `TÀI LIỆU / SLIDE NGUỒN: "${fileInfo.name}" (${fileInfo.type})\n` : '';

    if (summaryMode === 'quick') {
      return `Bạn là Chuyên gia Tóm tắt Slide và Tài liệu Cấp Tốc.
${fileHeader}
Nhiệm vụ: Hãy tóm tắt SIÊU NGẮN GỌN tài liệu/slide sau:
1. 💡 **Thông Điệp Cốt Lõi Trong 1 Câu Duy Nhất**.
2. ⚡ **5 Luận Điểm Then Chốt (Key Takeaways)**: 5 gạch đầu dòng rõ ràng, súc tích, đi thẳng vào bản chất.
3. 🎯 **Ứng Dụng Thực Tiễn**: Ý nghĩa thực tiễn nổi bật nhất.

Nội dung:
${content}`;
    }

    if (summaryMode === 'exam') {
      return `Bạn là Cố Vấn Học Tập & Giảng Viên Luyện Thi Xuất Sắc.
${fileHeader}
Nhiệm vụ: Phân tích tài liệu/slide sau dưới góc độ TRỌNG TÂM ĐỀ THI & KIỂM TRA:
1. 🎯 **Các Định Lý, Công Thức & Khái Niệm Chắc Chắn Sẽ Ra Thi** (Định dạng công thức toán học chuẩn LaTeX giữa $...$ hoặc $$...$$).
2. ⚠️ **Các Bẫy Sai Lầm Học Sinh Hay Mắc Phải & Cách Tránh**.
3. 📝 **5 Câu Hỏi Trắc Nghiệm Ôn Tập** (Mỗi câu gồm 4 đáp án A, B, C, D, đáp án đúng in đậm và giải thích chi tiết).

Nội dung:
${content}`;
    }

    if (summaryMode === 'mindmap') {
      return `Bạn là Chuyên gia Phương pháp Học Tập & Sơ Đồ Tư Duy.
${fileHeader}
Nhiệm vụ: Chuyển đổi toàn bộ tài liệu/slide sau thành ĐỀ CƯƠNG PHÂN CẤP SƠ ĐỒ TƯ DUY (Mindmap Outline) logic và sáng sủa:
# 🌟 [Tên Chủ Đề Cốt Lõi]
## I. [Nhánh Chính 1]
### 1. Ý phụ cấp 1
- **Khái niệm then chốt**: Định nghĩa
- **Số liệu / Ví dụ**: Chi tiết
## II. [Nhánh Chính 2]
(Làm tuần tự và đầy đủ cho toàn bộ các slide/chương).

Nội dung:
${content}`;
    }

    // Mặc định: toàn diện chuẩn sư phạm (comprehensive)
    return `Bạn là Giảng Viên Học Thuật Cao Cấp và Chuyên Gia Tóm Tắt Giáo Trình & Slide Bài Giảng.
${fileHeader}
Nhiệm vụ: Hãy phân tích và tổng hợp toàn diện tài liệu/slide bài giảng sau thành một bản tóm tắt học thuật mẫu mực, chuẩn mực sư phạm:
1. 🌟 **Tổng Quan & Mục Tiêu Bài Học**: Tài liệu/slide này giải quyết vấn đề gì?
2. 📌 **Tóm Tắt Từng Phần / Slide Trọng Tâm**: Tóm tắt mạch lạc theo trình tự logic của từng slide hoặc từng chương.
3. 🔑 **Bảng Thuật Ngữ & Khái Niệm Cốt Lõi (Glossary)**: Giải thích ngắn gọn, dễ hiểu các thuật ngữ quan trọng.
4. 🧠 **Câu Hỏi Tự Luận Củng Cố Kiến Thức**: 3-4 câu hỏi kích thích tư duy đào sâu bản chất.

Nội dung:
${content}`;
  };

  const handleSummarize = async () => {
    if (!content.trim() && !fileInfo?.imagePart) {
      return alert('Vui lòng tải lên file/slide hoặc dán nội dung văn bản cần tóm tắt!');
    }
    setLoading(true);
    try {
      const prompt = buildPrompt();
      const res = await generateText(
        prompt,
        'Bạn là EduVerse AI Summarizer - Trợ lý tóm tắt tài liệu và slide bài giảng thông minh, trung thực với dữ kiện gốc, trình bày sư phạm đẹp mắt.',
        fileInfo?.imagePart || null
      );
      setSummary(res);
    } catch (e) {
      setSummary('⚠️ ' + formatAIError(e));
    }
    setLoading(false);
  };

  // Sao chép nội dung tóm tắt
  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tải file Markdown về máy
  const handleDownload = () => {
    if (!summary) return;
    const blob = new Blob([summary], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tom_Tat_${fileInfo?.name ? fileInfo.name.replace(/\.[^/.]+$/, '') : 'Tai_Lieu'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Nghe đọc to bản tóm tắt
  const handleSpeak = () => {
    if (!summary) return;
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    } else {
      // Lọc bỏ ký hiệu markdown trước khi đọc
      const plainText = summary.replace(/[#*_`$]/g, '').replace(/\[---.*?---\]/g, '');
      speakText(plainText.slice(0, 1500), 'vi-VN', 1.0);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 60000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CỘT TRÁI: KHU VỰC TẢI FILE / SLIDE VÀ NỘI DUNG */}
      <div className="glass-panel rounded-3xl p-6 space-y-5 border border-indigo-500/20 shadow-xl bg-slate-900/80 backdrop-blur-md">
        
        {/* HEADER VÀ NÚT TẢI MẪU */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-3 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                AI Document & Slide Summarizer
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📄 Tóm Tắt Tài Liệu & Slide Thông Minh
            </h2>
          </div>

          <button
            onClick={loadSampleSlide}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95 shadow"
            title="Nạp một file slide bài giảng mẫu để thử nghiệm nhanh"
          >
            <Presentation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nạp Slide Mẫu</span>
          </button>
        </div>

        {/* VÙNG KÉO THẢ VÀ TẢI FILE LÊN (DROPZONE) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.pptx,.docx,.txt,.md,.json,.csv,.html,.png,.jpg,.jpeg,.webp"
          className="hidden"
        />

        {!fileInfo ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-pink-500 bg-pink-500/10 scale-102'
                : 'border-slate-700 hover:border-pink-500/50 hover:bg-slate-800/40 bg-slate-950/40'
            }`}
          >
            {extracting ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
                <p className="text-sm font-semibold text-pink-300">
                  Đang phân tích và trích xuất nội dung file/slide...
                </p>
                <p className="text-xs text-slate-400">Đang đọc các slide và cấu trúc văn bản</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center mx-auto shadow-md">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Kéo thả hoặc <span className="text-pink-400 underline">bấm để tải file / slide</span> lên
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ <strong>PowerPoint (.pptx)</strong>, <strong>PDF (.pdf)</strong>, <strong>Word (.docx)</strong>, <strong>Ảnh slide chụp (.jpg, .png)</strong>, <strong>Text (.txt, .md)</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* THẺ THÔNG TIN FILE ĐÃ TẢI LÊN */
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-700/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0 shadow">
                {fileInfo.type.includes('PPTX') ? (
                  <Presentation className="w-6 h-6 text-amber-400" />
                ) : fileInfo.isImage ? (
                  <ImageIcon className="w-6 h-6 text-purple-400" />
                ) : (
                  <FileText className="w-6 h-6 text-cyan-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate" title={fileInfo.name}>
                  {fileInfo.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                  <span className="px-2 py-0.2 rounded-md bg-slate-800 text-cyan-300 font-mono text-[10px]">
                    {fileInfo.type}
                  </span>
                  <span>{fileInfo.size}</span>
                  {fileInfo.pageCount > 0 && (
                    <span>• {fileInfo.pageCount} {fileInfo.type.includes('PPTX') ? 'Slide' : 'Trang'}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                title="Thay thế bằng file khác"
              >
                Đổi file
              </button>
              <button
                onClick={removeFile}
                className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors"
                title="Gỡ file này"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TÙY CHỌN PHONG CÁCH TÓM TẮT (SUMMARY MODES) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-pink-400" />
            Chọn phong cách tóm tắt mong muốn:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: 'comprehensive', label: '🎯 Toàn Diện', desc: 'Chuẩn học thuật' },
              { id: 'quick', label: '⚡ Siêu Ngắn Gọn', desc: '5 ý then chốt' },
              { id: 'exam', label: '📝 Trọng Tâm Thi', desc: 'Bẫy & trắc nghiệm' },
              { id: 'mindmap', label: '🗺️ Sơ Đồ Tư Duy', desc: 'Dạng phân cấp' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSummaryMode(m.id)}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  summaryMode === m.id
                    ? 'bg-pink-600/25 border-pink-500 text-white shadow-md'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <p className="text-xs font-bold">{m.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* KHUNG NỘI DUNG VĂN BẢN ĐÃ TRÍCH XUẤT HOẶC NHẬP TAY */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300">
              Nội dung văn bản (Đã trích xuất từ file hoặc dán trực tiếp):
            </span>
            {content && (
              <span className="text-[11px] text-slate-400 font-mono">
                {content.split(/\s+/).filter(Boolean).length} từ • {content.length} ký tự
              </span>
            )}
          </div>
          <textarea
            rows={7}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nội dung file hoặc slide sau khi tải lên sẽ hiển thị tại đây. Bạn cũng có thể dán bài báo, giáo trình hoặc ghi chú bất kỳ vào đây..."
            className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-pink-500 rounded-2xl p-4 text-xs font-medium text-slate-200 focus:outline-none transition-all leading-relaxed placeholder:text-slate-500"
          />
        </div>

        {/* NÚT THỰC HIỆN TÓM TẮT */}
        <button
          onClick={handleSummarize}
          disabled={loading || extracting}
          className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-pink-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>AI Đang Phân Tích & Tổng Hợp Tài Liệu / Slide...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span>Tóm Tắt Ngay Với AI</span>
            </>
          )}
        </button>
      </div>

      {/* CỘT PHẢI: KẾT QUẢ BẢN TÓM TẮT THÔNG MINH */}
      <div className="glass-panel rounded-3xl p-6 overflow-y-auto max-h-[85vh] border border-pink-500/20 shadow-xl bg-slate-900/80 backdrop-blur-md flex flex-col justify-between">
        <div>
          {/* HEADER CỘT KẾT QUẢ VÀ CÁC NÚT THAO TÁC */}
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
            <h3 className="font-bold text-cyan-400 flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Bản Tóm Tắt Thông Minh:
            </h3>

            {summary && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSpeak}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isSpeaking 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title={isSpeaking ? 'Dừng đọc' : 'Đọc to bản tóm tắt (TTS)'}
                >
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">{isSpeaking ? 'Dừng đọc' : 'Nghe'}</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                  title="Sao chép toàn bộ bản tóm tắt"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span className="hidden sm:inline">{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                  title="Tải bản tóm tắt về máy (.md)"
                >
                  <Download className="w-3.5 h-3.5 text-pink-400" />
                  <span className="hidden sm:inline">Tải về (.md)</span>
                </button>
              </div>
            )}
          </div>

          {/* HIỂN THỊ NỘI DUNG TÓM TẮT ĐƯỢC RENDER MARKDOWN + KATEX */}
          {summary ? (
            <div
              className="prose prose-invert text-sm max-w-none space-y-3 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(summary) }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <div className="max-w-xs space-y-1.5">
                <p className="font-bold text-slate-200">Chưa có bản tóm tắt</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tải lên slide bài giảng <strong>PowerPoint (.pptx)</strong>, tài liệu <strong>PDF</strong>, hoặc dán nội dung rồi nhấn <strong>"Tóm Tắt Ngay"</strong> để AI tổng hợp tri thức nhé.
                </p>
              </div>
            </div>
          )}
        </div>
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

  const createGeneticExam = () => {
    setLoading(true);
    setTimeout(() => {
      const ga = new GeneticExamGeneratorCSP({
        questionBank: SAMPLE_QUESTION_BANK,
        targetNumQuestions: 5,
        targetDifficulty: { easy: 0.4, medium: 0.4, hard: 0.2 },
        targetDurationMinutes: 8,
        requiredTopics: ['Toán Học', 'Vật Lý', 'Hóa Học', 'Tiếng Anh'],
        populationSize: 30,
        maxGenerations: 40
      });
      const res = ga.runEvolution();
      const formatted = res.optimalExam.map((q) => {
        const fakeDistractors = [
          'Phương án gây nhiễu 1',
          'Phương án gây nhiễu 2',
          'Phương án chưa chính xác'
        ];
        const allOpts = [q.answer, ...fakeDistractors].sort(() => Math.random() - 0.5);
        return {
          question: `[${q.topic} • ${q.difficulty.toUpperCase()}] ${q.text}`,
          options: allOpts,
          answerIndex: allOpts.indexOf(q.answer),
          explanation: `Giải thuật di truyền CSP đã chọn lọc câu hỏi này thỏa mãn tỷ lệ độ khó và độ phủ môn học. Đáp án chuẩn là: "${q.answer}".`
        };
      });
      setQuestions(formatted);
      setSelected({});
      setTopic('Đề Thi Tối Ưu Đa Môn (Sinh Bằng Giải Thuật Di Truyền GA & CSP - CLO2)');
      setLoading(false);
    }, 150);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row gap-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Nhập chủ đề tạo Quiz (VD: Mạng máy tính OSI, Lập trình OOP)..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
        />
        <button onClick={createQuiz} disabled={loading} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm text-white cursor-pointer shrink-0">
          {loading ? 'Đang tạo đề...' : 'Tạo Đề Quiz'}
        </button>
        <button
          onClick={createGeneticExam}
          disabled={loading}
          className="px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20 shrink-0 cursor-pointer"
        >
          🧬 Sinh Bằng GA & CSP (CLO2)
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

  const loadSemanticNetworkMindmap = () => {
    const net = createSampleSemanticNetwork();
    const tree = net.exportToMindmap('math');
    if (tree) {
      const formatted = {
        root: tree.label + ' (Mạng Ngữ Nghĩa Tri Thức)',
        branches: (tree.children || []).map((b) => ({
          title: `[${b.edgeLabel || b.relationToParent}] ${b.label}`,
          items: (b.children || []).map((c) => `[${c.edgeLabel || c.relationToParent}] ${c.label} ${c.properties?.formula ? `(${c.properties.formula})` : ''}`)
        }))
      };
      setMindmap(formatted);
      setTopic('Mạng Ngữ Nghĩa Tri Thức Toán Học (CLO2)');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row gap-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Nhập chủ đề cần vẽ Sơ đồ tư duy..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
        />
        <button onClick={createMindmap} disabled={loading} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm text-white cursor-pointer shrink-0">
          {loading ? 'Đang vẽ...' : 'Vẽ Mindmap'}
        </button>
        <button
          onClick={loadSemanticNetworkMindmap}
          className="px-5 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/20 shrink-0 cursor-pointer"
        >
          🕸️ Nạp Mạng Ngữ Nghĩa (CLO2)
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