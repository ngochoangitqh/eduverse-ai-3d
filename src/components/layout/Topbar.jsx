import React, { useState } from 'react';
import { Key } from 'lucide-react';

export default function Topbar({ englishMode, setEnglishMode }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);

  const saveKey = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    setShowKeyModal(false);
    alert('Đã lưu Gemini API Key!');
  };

  return (
    <header className="h-16 glass-panel border-b border-indigo-500/20 px-6 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chế độ Tiếng Anh:</span>
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-700/70">
          {['IELTS', 'TOEIC', 'Tiếng Anh Phổ Thông'].map((mode) => (
            <button
              key={mode}
              onClick={() => setEnglishMode(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                englishMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowKeyModal(!showKeyModal)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold border border-indigo-500/30"
        >
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cấu hình Gemini API Key</span>
        </button>

        {showKeyModal && (
          <div className="absolute right-0 mt-2 w-80 glass-panel p-4 rounded-2xl border border-indigo-500/40 z-50 space-y-3">
            <p className="text-xs text-slate-300">Nhập Gemini API Key (hoặc đặt trong file <code>.env</code>):</p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs"
            />
            <button onClick={saveKey} className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold">
              Lưu API Key
            </button>
          </div>
        )}
      </div>
    </header>
  );
}