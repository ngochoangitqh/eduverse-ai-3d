import React, { useState } from 'react';
import {
  Compass, Bot, Calculator, Presentation, FileText,
  Mic, HelpCircle, GitBranch, Map, Globe, Box, Key, User, BookOpen
} from 'lucide-react';
import { getActiveModel, setActiveModel, getActiveThinkingMode, setActiveThinkingMode } from '../../services/geminiService';

export default function Sidebar({ activeTab, setActiveTab, onOpenApiKey, onOpenAuth, currentUser }) {
  const [model, setModel] = useState(getActiveModel());
  const [thinkingMode, setThinkingMode] = useState(getActiveThinkingMode());

  const handleModelChange = (newModel) => {
    setModel(newModel);
    setActiveModel(newModel);
  };

  const handleThinkingModeChange = (newMode) => {
    setThinkingMode(newMode);
    setActiveThinkingMode(newMode);
  };
  const mainNav = [
    { id: 'dashboard', label: 'Tổng Quan 3D', icon: Compass, color: 'text-indigo-400' },
    { id: 'chatbot', label: 'AI Chatbot Gia Sư', icon: Bot, color: 'text-cyan-400' },
    { id: 'rag', label: 'Kho Sách & RAG Tri Thức', icon: BookOpen, color: 'text-violet-400' },
    { id: 'solver', label: 'Giải Bài Tập (Ảnh/Chữ)', icon: Calculator, color: 'text-emerald-400' },
  ];

  const studyNav = [
    { id: 'slides', label: 'Tạo Slide Thuyết Trình', icon: Presentation, color: 'text-amber-400' },
    { id: 'summarizer', label: 'Tóm Tắt Tài Liệu / Slide', icon: FileText, color: 'text-pink-400' },
    { id: 'meeting', label: 'Theo Dõi & Tóm Tắt Họp', icon: Mic, color: 'text-rose-400' },
    { id: 'quiz', label: 'Tạo Quiz Trắc Nghiệm', icon: HelpCircle, color: 'text-purple-400' },
    { id: 'mindmap', label: 'Vẽ Sơ Đồ Tư Duy 3D', icon: GitBranch, color: 'text-teal-400' },
    { id: 'roadmap', label: 'Lộ Trình Học Tập', icon: Map, color: 'text-orange-400' },
  ];

  return (
    <aside className="w-72 glass-panel border-r border-indigo-500/20 flex flex-col justify-between z-20 shrink-0 select-none">
      <div className="p-5 flex items-center gap-3.5 border-b border-slate-800/80">
        <div className="w-11 h-11 rounded-2xl glow-btn flex items-center justify-center shadow-lg">
          <Box className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
            EduVerse AI
          </h1>
          <p className="text-[11px] text-indigo-300/80 font-medium tracking-wider uppercase">
            3D Study Tutor Pro
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Không Gian Chính
        </div>
        {mainNav.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`nav-item ${activeTab === id ? 'active' : ''} w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all`}
          >
            <Icon className={`w-4 h-4 ${color}`} />
            <span>{label}</span>
          </button>
        ))}

        <div className="px-3 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Công Cụ Học Tập AI
        </div>
        {studyNav.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`nav-item ${activeTab === id ? 'active' : ''} w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all`}
          >
            <Icon className={`w-4 h-4 ${color}`} />
            <span>{label}</span>
          </button>
        ))}

        <div className="px-3 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Ngoại Ngữ Chuyên Sâu
        </div>
        <button
          onClick={() => setActiveTab('english')}
          className={`nav-item ${activeTab === 'english' ? 'active' : ''} w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white bg-gradient-to-r from-indigo-900/40 to-purple-900/30 border border-indigo-500/30 transition-all`}
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          <div className="text-left">
            <div>Trung Tâm Tiếng Anh</div>
            <div className="text-[10px] text-cyan-300/80 font-normal">IELTS • TOEIC • Phổ Thông</div>
          </div>
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>AI Engine</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Online
          </span>
        </div>

        <select
          value={model}
          onChange={(e) => handleModelChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700/80 text-xs text-cyan-300 rounded-lg p-2 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
        >
          <option value="gemini-3.5-flash-lite">⚡ 3.5 Flash-Lite (Khuyên dùng - Nhanh)</option>
          <option value="gemini-3.8-flash">🧠 3.8 Flash (Tư duy sâu)</option>
        </select>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>Thinking Budget</span>
          <span className="text-[10px] font-semibold text-purple-400">
            {thinkingMode === 'deep' ? '🧠 Chuyên sâu' : '⚡ Tốc độ'}
          </span>
        </div>

        <select
          value={thinkingMode}
          onChange={(e) => handleThinkingModeChange(e.target.value)}
          className="w-full bg-slate-950 border border-purple-500/30 text-xs text-purple-300 rounded-lg p-2 focus:outline-none focus:border-purple-500 font-medium cursor-pointer"
        >
          <option value="deep">🧠 Chuyên sâu (High - Giải bài khó)</option>
          <option value="fast">⚡ Nhanh (Low - Tốc độ cao)</option>
        </select>

        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full w-full" />
        </div>

        {currentUser ? (
          <div
            onClick={onOpenAuth}
            className="p-2 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center gap-2 cursor-pointer hover:bg-slate-900 transition-all"
            title="Bấm để xem hồ sơ học viên & đăng xuất"
          >
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" className="w-7 h-7 rounded-full border border-emerald-400 shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-semibold text-white truncate">{currentUser.displayName || 'Học viên'}</p>
              <p className="text-[9px] text-emerald-400 truncate">🔥 Đã kết nối Cloud</p>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
          >
            <User className="w-3.5 h-3.5" />
            <span>Đăng Nhập / Đăng Ký</span>
          </button>
        )}

        <button
          onClick={onOpenApiKey}
          className="w-full py-1.5 px-3 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
        >
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cài đặt Gemini & Firebase</span>
        </button>
      </div>
    </aside>
  );
}