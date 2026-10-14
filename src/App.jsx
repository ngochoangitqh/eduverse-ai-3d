import React, { useState, useEffect } from 'react';
import {
  Sparkles, MessageSquare, Mic, Layers, Camera,
  Presentation, Zap, Ear, Network, Languages, Key,
  Flame, CheckCircle, AlertCircle, LogIn, LogOut, User, BookOpen, Cpu
} from 'lucide-react';
import NeuralBackground3D from './components/three/NeuralBackground3D';
import KnowledgeCore3D from './components/three/KnowledgeCore3D';
import TiltCard from './components/three/TiltCard';
import Sidebar from './components/layout/Sidebar';
import EnglishCenterView from './components/english/EnglishCenterView';
import AuthModal from './components/auth/AuthModal';
import RAGKnowledgeView from './components/study/RAGKnowledgeView';
import AILabLaboratory from './components/ailab/AILabLaboratory';
import {
  ChatbotView, SolverView, SlideGenView, SummarizerView,
  MeetingTrackerView, QuizMakerView, MindmapView, RoadmapView
} from './components/study/StudyModules';
import {
  getFirebaseConfig, saveFirebaseConfig, isFirebaseConfigured, parseFirebaseSnippet, resetFirebaseToDefault
} from './config/firebase';
import {
  subscribeToAuthChanges, loginWithGoogle, logoutUser
} from './services/firebaseService';
import { getGeminiApiKey } from './services/geminiService';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [englishMode, setEnglishMode] = useState('IELTS');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authModalMode, setAuthModalMode] = useState('register');
  const [modalTab, setModalTab] = useState('gemini'); // 'gemini' | 'firebase'
  const [apiKey, setApiKey] = useState(getGeminiApiKey() || '');
  const [firebaseSnippet, setFirebaseSnippet] = useState('');
  const [firebaseConfigState, setFirebaseConfigState] = useState(getFirebaseConfig());
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = subscribeToAuthChanges((u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  const saveApiKey = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    setShowKeyModal(false);
    alert('Đã lưu Gemini API Key thành công!');
  };

  const handleSaveFirebaseConfig = () => {
    const parsed = parseFirebaseSnippet(firebaseSnippet);
    if (!parsed) {
      alert('Không nhận diện được cấu hình Firebase. Vui lòng dán đoạn mã firebaseConfig = {...} hoặc định dạng JSON từ Firebase Console!');
      return;
    }
    saveFirebaseConfig(parsed);
    setFirebaseConfigState(parsed);
    setFirebaseSnippet('');
    alert('Đã lưu cấu hình Firebase thành công! Dự án: ' + parsed.projectId);
  };

  const handleResetFirebase = () => {
    const def = resetFirebaseToDefault();
    setFirebaseConfigState(def);
    setFirebaseSnippet('');
    alert('Đã chuyển về dự án Firebase mặc định: ' + def.projectId);
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      alert('Đăng nhập Google thành công! Đã kết nối tài khoản đám mây.');
    } catch (err) {
      alert('Lỗi đăng nhập: ' + (err.message || err));
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      alert('Đã đăng xuất tài khoản.');
    } catch (err) {
      alert('Lỗi: ' + (err.message || err));
    }
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <NeuralBackground3D />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenApiKey={() => setShowKeyModal(true)}
        onOpenAuth={(mode = 'register') => {
          setAuthModalMode(mode);
          setShowAuthModal(true);
        }}
        currentUser={currentUser}
      />

      <main className="flex-1 h-full overflow-y-auto z-10 p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Hero 3D Banner giống hệt bản gốc */}
            <div className="glass-panel rounded-3xl p-8 relative overflow-hidden border border-indigo-500/30">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" /> Không Gian Học Tập Tương Tác AI Thế Hệ Mới
                  </div>
                  <h2 className="text-3xl lg:text-5xl font-display font-bold leading-tight">
                    Chinh Phục Mọi Tri Thức Cùng{' '}
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Gia Sư AI 3D
                    </span>
                  </h2>
                  <p className="text-slate-300 text-sm lg:text-base leading-relaxed">
                    Tích hợp tất cả trong một: Giải bài tập qua ảnh, tạo slide thuyết trình tự động, tóm tắt tài liệu & cuộc họp, sơ đồ tư duy tương tác, cùng phòng luyện IELTS/TOEIC/Tiếng Anh Phổ Thông chấm điểm phát âm & bài viết chuẩn quốc tế.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('chatbot')}
                      className="glow-btn px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" /> Hỏi Gia Sư Ngay
                    </button>
                    <button
                      onClick={() => setActiveTab('rag')}
                      className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 border border-purple-500/40 text-purple-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <BookOpen className="w-4 h-4 text-purple-300" /> Sách Giáo Khoa RAG
                    </button>
                    <button
                      onClick={() => setActiveTab('english')}
                      className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/30 text-cyan-300 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Mic className="w-4 h-4" /> Luyện Tiếng Anh AI
                    </button>
                  </div>
                </div>

                {/* Khối cầu 3D tương tác bên phải */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center">
                  <KnowledgeCore3D />
                </div>
              </div>
            </div>

            {/* Lưới 6 Thẻ 3D Tilt giống hệt bản gốc */}
            <div>
              <h3 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" /> Hệ Sinh Thái Công Cụ Học Tập AI
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <TiltCard onClick={() => setActiveTab('solver')}>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                    <Camera className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h4 className="font-display font-bold text-base mb-1">Giải Bài Tập Đa Môn</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tải ảnh chụp đề bài hoặc nhập câu hỏi Toán, Lý, Hóa, Anh... AI phân tích và giải chi tiết từng bước.
                  </p>
                </TiltCard>

                <TiltCard onClick={() => setActiveTab('slides')}>
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
                    <Presentation className="w-5 h-5 text-amber-400" />
                  </div>
                  <h4 className="font-display font-bold text-base mb-1">Tạo Slide Thuyết Trình</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tự động thiết kế dàn ý, nội dung từng slide kèm ghi chú thuyết trình và chế độ trình chiếu trực tiếp.
                  </p>
                </TiltCard>

                <TiltCard onClick={() => setActiveTab('summarizer')}>
                  <div className="w-11 h-11 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5 text-pink-400" />
                  </div>
                  <h4 className="font-display font-bold text-base mb-1">Tóm Tắt Tài Liệu & Slide</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Rút gọn hàng chục trang tài liệu thành các ý chính cốt lõi, thuật ngữ quan trọng và câu hỏi ôn tập.
                  </p>
                </TiltCard>

                <TiltCard onClick={() => setActiveTab('meeting')}>
                  <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-4">
                    <Ear className="w-5 h-5 text-rose-400" />
                  </div>
                  <h4 className="font-display font-bold text-base mb-1">Theo Dõi & Tóm Tắt Cuộc Họp</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ghi âm nhận diện giọng nói trực tiếp trên lớp/buổi họp nhóm và trích xuất biên bản, Action Items.
                  </p>
                </TiltCard>

                <TiltCard onClick={() => setActiveTab('mindmap')}>
                  <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-4">
                    <Network className="w-5 h-5 text-teal-400" />
                  </div>
                  <h4 className="font-display font-bold text-base mb-1">Sơ Đồ Tư Duy & Quiz</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Vẽ sơ đồ tư duy phân nhánh trực quan và tạo bộ câu hỏi trắc nghiệm kiểm tra kiến thức tức thì.
                  </p>
                </TiltCard>

                <TiltCard onClick={() => setActiveTab('english')} className="border-cyan-500/40">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-4">
                    <Languages className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h4 className="font-display font-bold text-base mb-1 text-cyan-300">IELTS • TOEIC • Phổ Thông</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nhận diện giọng nói chấm phát âm, Flashcard 3D theo chủ đề, chấm Writing chi tiết và giải thích ngữ pháp.
                  </p>
                </TiltCard>

                <TiltCard onClick={() => setActiveTab('ailab')} className="border-emerald-500/40">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                    <Cpu className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h4 className="font-display font-bold text-base mb-1 text-emerald-300">Phòng Thí Nghiệm AI (CLO2 • CLO3)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Trọn bộ 4 trụ cột thuật toán cốt lõi: Naïve Bayes, K-Means từ vựng, Genetic Algorithm CSP và Hệ chuyên gia suy diễn luật.
                  </p>
                </TiltCard>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chatbot' && <ChatbotView />}
        {activeTab === 'rag' && <RAGKnowledgeView />}
        {activeTab === 'solver' && <SolverView />}
        {activeTab === 'slides' && <SlideGenView />}
        {activeTab === 'summarizer' && <SummarizerView />}
        {activeTab === 'meeting' && <MeetingTrackerView />}
        {activeTab === 'quiz' && <QuizMakerView />}
        {activeTab === 'mindmap' && <MindmapView />}
        {activeTab === 'roadmap' && <RoadmapView />}
        {activeTab === 'english' && (
          <EnglishCenterView englishMode={englishMode} setEnglishMode={setEnglishMode} />
        )}
        {activeTab === 'ailab' && <AILabLaboratory />}
      </main>

      {/* Modal cài đặt API Key & Firebase */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="glass-panel rounded-3xl p-6 w-full max-w-lg border border-indigo-500/40 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalTab('gemini')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    modalTab === 'gemini'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" /> Gemini API
                </button>
                <button
                  onClick={() => setModalTab('firebase')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    modalTab === 'firebase'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Firebase Cloud
                </button>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {modalTab === 'gemini' ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Cấu hình Gemini API Key</h4>
                  <p className="text-xs text-slate-300">
                    Dán Gemini API Key của bạn vào đây để kích hoạt toàn bộ tính năng AI (hoặc đặt biến <code>VITE_GEMINI_API_KEY</code> trong file <code>.env</code>):
                  </p>
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-cyan-500 font-mono text-cyan-300"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowKeyModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">
                    Đóng
                  </button>
                  <button onClick={saveApiKey} className="glow-btn px-5 py-2 rounded-xl text-xs font-bold text-white">
                    Lưu API Key
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-400" /> Đồng bộ & Lưu Trữ Firebase
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isFirebaseConfigured()
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {isFirebaseConfigured() ? `✅ Đã kết nối: ${firebaseConfigState.projectId}` : '⚠️ Chưa cấu hình'}
                      </span>
                      {firebaseConfigState.projectId !== 'eduverse-ai-3d' && (
                        <button
                          onClick={handleResetFirebase}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                        >
                          Dùng eduverse-ai-3d
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300">
                    {firebaseConfigState.projectId === 'eduverse-ai-3d'
                      ? 'Dự án eduverse-ai-3d đã được kết nối sẵn. Bạn chỉ cần bấm Đóng để học ngay!'
                      : 'Lưu bài tập, flashcard, lịch sử chat và tiến độ học lên đám mây Firestore & Storage.'}
                  </p>
                </div>

                {/* Trạng thái tài khoản */}
                {currentUser ? (
                  <div className="p-3 bg-slate-900/90 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="Avatar" className="w-9 h-9 rounded-full border border-emerald-400 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{currentUser.displayName || 'Học viên EduVerse'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                    </button>
                  </div>
                ) : isFirebaseConfigured() ? (
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-indigo-600" /> Đăng nhập Google để lưu dữ liệu đám mây
                  </button>
                ) : null}

                {/* Ô dán Firebase Config snippet */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>Dán mã cấu hình từ Firebase Console:</span>
                    <span className="text-[10px] text-cyan-400 font-normal">Hỗ trợ JS Object & JSON</span>
                  </label>
                  <textarea
                    rows={5}
                    value={firebaseSnippet}
                    onChange={(e) => setFirebaseSnippet(e.target.value)}
                    placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "your-project.firebaseapp.com",\n  projectId: "your-project",\n  storageBucket: "your-project.appspot.com",\n  messagingSenderId: "...",\n  appId: "..."\n};`}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setShowKeyModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs cursor-pointer">
                    Đóng
                  </button>
                  <button
                    onClick={handleSaveFirebaseConfig}
                    disabled={!firebaseSnippet.trim()}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5" /> Lưu Cấu Hình Firebase
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal đăng nhập / đăng ký / tài khoản */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        initialMode={authModalMode}
        onOpenConfig={() => {
          setShowKeyModal(true);
          setModalTab('firebase');
        }}
      />
    </div>
  );
}