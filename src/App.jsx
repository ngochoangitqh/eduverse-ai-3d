import React, { useState } from 'react';
import {
  Sparkles, MessageSquare, Mic, Layers, Camera,
  Presentation, Zap, Ear, Network, Languages, Key
} from 'lucide-react';
import NeuralBackground3D from './components/three/NeuralBackground3D';
import KnowledgeCore3D from './components/three/KnowledgeCore3D';
import TiltCard from './components/three/TiltCard';
import Sidebar from './components/layout/Sidebar';
import EnglishCenterView from './components/english/EnglishCenterView';
import {
  ChatbotView, SolverView, SlideGenView, SummarizerView,
  MeetingTrackerView, QuizMakerView, MindmapView, RoadmapView
} from './components/study/StudyModules';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [englishMode, setEnglishMode] = useState('IELTS');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');

  const saveApiKey = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    setShowKeyModal(false);
    alert('Đã lưu Gemini API Key thành công!');
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <NeuralBackground3D />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenApiKey={() => setShowKeyModal(true)}
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
                      className="glow-btn px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> Hỏi Gia Sư Ngay
                    </button>
                    <button
                      onClick={() => setActiveTab('english')}
                      className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/30 text-cyan-300 flex items-center gap-2 transition-all"
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
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chatbot' && <ChatbotView />}
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
      </main>

      {/* Modal cài đặt API Key */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl p-6 w-full max-w-md border border-indigo-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" /> Cấu hình Gemini API Key
              </h3>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <p className="text-xs text-slate-300">
              Dán Gemini API Key của bạn vào đây để kích hoạt toàn bộ tính năng AI (hoặc đặt biến <code>VITE_GEMINI_API_KEY</code> trong file <code>.env</code>):
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowKeyModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">Đóng</button>
              <button onClick={saveApiKey} className="glow-btn px-5 py-2 rounded-xl text-xs font-bold text-white">Lưu API Key</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}