import React, { useState, useEffect } from 'react';
import {
  Brain, X, Sparkles, User, Target, BookOpen, AlertTriangle,
  CheckCircle2, Plus, Trash2, Save, RotateCcw, Lightbulb, Zap, ShieldCheck
} from 'lucide-react';
import {
  getStudentProfile,
  saveStudentProfile,
  DEFAULT_STUDENT_PROFILE
} from '../../services/studentMemoryService';

const GRADE_OPTIONS = [
  'Lớp 10 (THPT)',
  'Lớp 11 (THPT)',
  'Lớp 12 (Ôn thi THPT Quốc Gia)',
  'THCS (Lớp 6 - 9)',
  'Sinh viên Đại học / Cao đẳng',
  'Người đi làm / Tự học'
];

const LEARNING_STYLE_PRESETS = [
  'Dễ hiểu, có ví dụ đời thường, kèm mẹo bấm máy Casio',
  'Đi thẳng vào bản chất định lý và chứng minh chặt chẽ',
  'Gợi mở từng bước để học sinh tự suy nghĩ (Phương pháp Socrates)',
  'Tóm tắt nhanh, gạch đầu dòng ngắn gọn để ôn thi cấp tốc',
  'Song ngữ Anh - Việt, kết hợp từ vựng chuyên ngành C1/C2'
];

export default function StudentMemoryModal({ isOpen, onClose, onProfileUpdated }) {
  const [profile, setProfile] = useState(() => getStudentProfile());
  const [newWeakness, setNewWeakness] = useState('');
  const [newStrength, setNewStrength] = useState('');
  const [newNote, setNewNote] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProfile(getStudentProfile());
      setSavedToast(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated = saveStudentProfile(profile);
    setSavedToast(true);
    if (onProfileUpdated) onProfileUpdated(updated);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    if (confirm('Bạn có chắc chắn muốn đặt lại hồ sơ học sinh về mặc định ban đầu không?')) {
      const resetProfile = saveStudentProfile(DEFAULT_STUDENT_PROFILE);
      setProfile(resetProfile);
      if (onProfileUpdated) onProfileUpdated(resetProfile);
    }
  };

  const addWeakness = () => {
    if (!newWeakness.trim()) return;
    setProfile((prev) => ({
      ...prev,
      weaknesses: [...prev.weaknesses, newWeakness.trim()]
    }));
    setNewWeakness('');
  };

  const removeWeakness = (idx) => {
    setProfile((prev) => ({
      ...prev,
      weaknesses: prev.weaknesses.filter((_, i) => i !== idx)
    }));
  };

  const addStrength = () => {
    if (!newStrength.trim()) return;
    setProfile((prev) => ({
      ...prev,
      strengths: [...prev.strengths, newStrength.trim()]
    }));
    setNewStrength('');
  };

  const removeStrength = (idx) => {
    setProfile((prev) => ({
      ...prev,
      strengths: prev.strengths.filter((_, i) => i !== idx)
    }));
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    setProfile((prev) => ({
      ...prev,
      notes: [...prev.notes, newNote.trim()]
    }));
    setNewNote('');
  };

  const removeNote = (idx) => {
    setProfile((prev) => ({
      ...prev,
      notes: prev.notes.filter((_, i) => i !== idx)
    }));
  };

  const removeInsight = (id) => {
    setProfile((prev) => ({
      ...prev,
      autoInsights: prev.autoInsights.filter((ins) => ins.id !== id)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/80 via-purple-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Brain className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Hồ Sơ Năng Lực & Bộ Nhớ AI</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Adaptive AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI ghi nhớ phong cách và thói quen của bạn để cá nhân hóa lời giảng
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NỘI DUNG CUỘN */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm text-slate-200">
          
          {/* CÔNG TẮC BẬT TẮT THÍCH ỨNG CÁ NHÂN */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <Zap className={`w-5 h-5 ${profile.adaptiveLearningEnabled ? 'text-yellow-400' : 'text-slate-500'}`} />
              <div>
                <p className="font-bold text-white text-xs">Cá Nhân Hóa & Thích Ứng Tự Động</p>
                <p className="text-[11px] text-slate-400">
                  Cho phép AI đọc bộ nhớ này và tự động điều chỉnh lời giải thích phù hợp với bạn
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profile.adaptiveLearningEnabled}
                onChange={(e) => setProfile({ ...profile, adaptiveLearningEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* KHỐI 1: TÊN & LỚP & MỤC TIÊU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Tên / Biệt danh của bạn:
              </label>
              <input
                value={profile.nickname}
                onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                placeholder="VD: Hoàng, Minh, Alex..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-cyan-300 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                Khối lớp / Trình độ:
              </label>
              <select
                value={profile.grade}
                onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-200 cursor-pointer"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* MỤC TIÊU HỌC TẬP */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              Mục tiêu học tập chính:
            </label>
            <input
              value={profile.targetGoal}
              onChange={(e) => setProfile({ ...profile, targetGoal: e.target.value })}
              placeholder="VD: Thi đỗ Đại học Bách Khoa khối A00, IELTS 7.5+, Thành thạo Lập trình Python..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-emerald-300 font-semibold"
            />
          </div>

          {/* KHỐI 2: PHONG CÁCH TIẾP THU */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
              Phong cách giảng bài bạn thích nhất:
            </label>
            <textarea
              rows={2}
              value={profile.learningStyle}
              onChange={(e) => setProfile({ ...profile, learningStyle: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
            />
            {/* Gợi ý phong cách */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {LEARNING_STYLE_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setProfile({ ...profile, learningStyle: p })}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
                >
                  {p.slice(0, 35)}...
                </button>
              ))}
            </div>
          </div>

          {/* KHỐI 3: ĐIỂM YẾU & BẪY HAY MẮC PHẢI (AI SẼ CHỦ ĐỘNG NHẮC NHỞ) */}
          <div className="space-y-2 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Điểm yếu & Bẫy bạn hay mắc phải (AI sẽ cảnh báo khi gặp):
            </label>
            <div className="flex gap-2">
              <input
                value={newWeakness}
                onChange={(e) => setNewWeakness(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWeakness()}
                placeholder="VD: Hay nhầm dấu âm dương, quên điều kiện mẫu số, phát âm thiếu ending sound..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={addWeakness}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-xl text-xs font-bold text-white flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {profile.weaknesses.map((w, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-500/30 text-xs"
                >
                  <span>⚠️ {w}</span>
                  <button
                    onClick={() => removeWeakness(idx)}
                    className="hover:text-red-400 ml-1 text-slate-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* KHỐI 4: ĐIỂM MẠNH & GHI CHÚ RIÊNG */}
          <div className="space-y-2 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Điểm mạnh & Ghi chú riêng cho AI:
            </label>
            <div className="flex gap-2">
              <input
                value={newStrength}
                onChange={(e) => setNewStrength(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStrength()}
                placeholder="VD: Tư duy hình học tốt, nắm chắc phương pháp đổi biến..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={addStrength}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {profile.strengths.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 text-xs"
                >
                  <span>✨ {s}</span>
                  <button
                    onClick={() => removeStrength(idx)}
                    className="hover:text-red-400 ml-1 text-slate-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* KHỐI 5: CÁC ĐẶC ĐIỂM AI TỰ ĐỘNG PHÁT HIỆN TRONG QUÁ TRÌNH CHAT */}
          {profile.autoInsights && profile.autoInsights.length > 0 && (
            <div className="space-y-2 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  Đặc điểm AI tự động ghi nhận trong hội thoại:
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {profile.autoInsights.length} ghi nhận
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {profile.autoInsights.map((ins) => (
                  <div
                    key={ins.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      <span>{ins.text}</span>
                    </div>
                    <button
                      onClick={() => removeInsight(ins.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                      title="Xóa ghi nhận này"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER MODAL */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>

          <div className="flex items-center gap-2">
            {savedToast && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                Đã lưu hồ sơ thành công!
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Hồ Sơ Bộ Nhớ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
