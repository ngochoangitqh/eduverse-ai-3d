import React, { useState, useEffect } from 'react';
import {
  Brain, Sparkles, Shield, RefreshCw, X, Lightbulb,
  CheckCircle2, Users, Flame, BookOpen, Layers
} from 'lucide-react';
import {
  getStoredCollectiveInsights,
  syncCollectiveInsightsFromCloud,
  saveStoredCollectiveInsights
} from '../../services/collectiveLearningService';

export default function CollectiveBrainModal({ isOpen, onClose }) {
  const [insights, setInsights] = useState(getStoredCollectiveInsights);
  const [syncing, setSyncing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('ALL');

  useEffect(() => {
    if (isOpen) {
      handleSync();
    }
  }, [isOpen]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const updated = await syncCollectiveInsightsFromCloud();
      setInsights(updated);
    } catch (e) {
      console.warn(e);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  const subjects = ['ALL', 'Toán Học', 'Vật Lý', 'Hóa Học', 'Tiếng Anh'];

  const filtered = selectedSubject === 'ALL'
    ? insights
    : insights.filter((i) => i.subject === selectedSubject);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-purple-500/40 overflow-hidden shadow-2xl animate-scaleUp">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-purple-950/40 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md">
              <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Bộ Não Trí Tuệ Cộng Hưởng</h3>
                <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  AI Collective Brain
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                AI liên tục học hỏi từ tất cả học sinh, tích lũy các bẫy đề thi và mẹo giải để trở nên thông minh hơn mỗi ngày.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cam kết bảo mật & Thống kê */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Lịch sử chat của mỗi người dùng là riêng tư 100%. AI chỉ học hỏi mẹo sư phạm ẩn danh.</span>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-[11px] text-cyan-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ từ Cloud'}</span>
          </button>
        </div>

        {/* Bộ lọc môn học */}
        <div className="px-6 pt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                selectedSubject === sub
                  ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {sub === 'ALL' ? `Tất cả (${insights.length})` : sub}
            </button>
          ))}
        </div>

        {/* Danh sách các bài học & bẫy thi AI đã học được */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Chưa có bài học nào trong môn này. Hãy trò chuyện với AI để đóng góp thêm!
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-purple-500/40 transition-all text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 rounded-full text-[10px]">
                      {item.subject}
                    </span>
                    <span className="font-semibold text-slate-200">{item.topic}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {item.author || 'Cộng đồng EduVerse'}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  💡 <b className="text-amber-300">Bài học AI đã đúc kết:</b> {item.insight}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Tổng cộng: <b className="text-purple-300">{insights.length}</b> mẹo thi & kiến thức cốt lõi đã nạp vào AI
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
