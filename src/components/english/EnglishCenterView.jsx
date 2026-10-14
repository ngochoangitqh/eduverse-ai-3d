import React, { useState } from 'react';
import { Globe, Mic, BookOpen, PenTool, Sparkles } from 'lucide-react';
import { SpeakingCoachView, Vocab3DView, WritingGraderView, GrammarView } from './EnglishModules';

export default function EnglishCenterView({ englishMode, setEnglishMode }) {
  const [subTab, setSubTab] = useState('pronunciation');

  const levels = [
    { id: 'IELTS', label: '🎓 IELTS Academic (Band 0 - 9.0)' },
    { id: 'TOEIC', label: '💼 TOEIC Quốc Tế (Listening & Reading / S&W)' },
    { id: 'Tiếng Anh Phổ Thông', label: '🏫 Tiếng Anh Phổ Thông (THCS / THPT / Giao tiếp)' },
  ];

  const tabs = [
    { id: 'pronunciation', label: 'AI Chấm Điểm Phát Âm', icon: Mic },
    { id: 'vocab', label: 'Từ Vựng Theo Chủ Đề (3D Flip)', icon: BookOpen },
    { id: 'writing', label: 'AI Chấm Điểm Writing', icon: PenTool },
    { id: 'grammar', label: 'Giải Thích Ngữ Pháp', icon: Sparkles },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header chọn Hệ Đào Tạo y hệt bản gốc */}
      <div className="glass-panel rounded-3xl p-6 border border-cyan-500/30 bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-cyan-950/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-semibold mb-2">
              <Globe className="w-3.5 h-3.5" /> ENGLISH AI MASTERY HUB
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
              Trung Tâm Huấn Luyện Tiếng Anh AI Toàn Diện
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Chọn hệ đào tạo để AI tự động điều chỉnh tiêu chí chấm điểm và từ vựng:
            </p>
          </div>

          <div className="flex bg-slate-950/90 p-1.5 rounded-2xl border border-slate-700/80 self-start">
            {levels.map((lv) => (
              <button
                key={lv.id}
                onClick={() => setEnglishMode(lv.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  englishMode === lv.id
                    ? 'glow-btn text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lv.id}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Sub-tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-800/80">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSubTab(id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                subTab === id
                  ? 'bg-indigo-600/30 border border-indigo-400/50 text-white'
                  : 'bg-slate-900/70 border border-slate-700/70 text-slate-300 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 text-cyan-400" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {subTab === 'pronunciation' && <SpeakingCoachView englishMode={englishMode} />}
      {subTab === 'vocab' && <Vocab3DView englishMode={englishMode} />}
      {subTab === 'writing' && <WritingGraderView englishMode={englishMode} />}
      {subTab === 'grammar' && <GrammarView englishMode={englishMode} />}
    </div>
  );
}