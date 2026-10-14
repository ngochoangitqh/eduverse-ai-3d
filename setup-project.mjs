// File: setup-project.mjs
import fs from 'fs';
import path from 'path';

const files = {
  'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-deep: #050814;
}

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background-color: var(--bg-deep);
  color: #f8fafc;
  overflow-x: hidden;
}

h1, h2, h3, .font-display {
  font-family: 'Space Grotesk', sans-serif;
}

.glass-panel {
  background: rgba(13, 20, 40, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(99, 102, 241, 0.22);
  box-shadow: 0 12px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
}

.glow-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  box-shadow: 0 0 25px rgba(99, 102, 241, 0.45);
  transition: all 0.25s ease;
}
.glow-btn:hover {
  box-shadow: 0 0 35px rgba(139, 92, 246, 0.75);
  transform: translateY(-1px);
}

.nav-item.active {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.28) 0%, rgba(168, 85, 247, 0.08) 100%);
  border-left: 3px solid #818cf8;
  color: #ffffff;
}

.perspective-1000 { perspective: 1000px; }
.transform-style-3d { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
.backface-hidden { backface-visibility: hidden; }
.rotate-y-180 { transform: rotateY(180deg); }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.4); }
::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.4); border-radius: 999px; }`,

  'src/components/three/KnowledgeCore3D.jsx': `import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function KnowledgeCore3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 5.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(220, 220);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Lõi đa diện phát sáng (Icosahedron)
    const coreGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x312e81,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: true
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Khung dây bên ngoài (Wireframe)
    const wireGeo = new THREE.IcosahedronGeometry(1.55, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    group.add(wireMesh);

    // Vòng quỹ đạo Cyan (Torus Ring)
    const ringGeo = new THREE.TorusGeometry(2.0, 0.03, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.75
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.6;
    ringMesh.rotation.y = Math.PI / 8;
    group.add(ringMesh);

    // Ánh sáng
    const light1 = new THREE.DirectionalLight(0xffffff, 2.2);
    light1.position.set(4, 5, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xec4899, 3, 10);
    light2.position.set(-4, -3, 3);
    scene.add(light2);

    scene.add(new THREE.AmbientLight(0x404070, 1.5));

    // Kéo chuột để xoay 3D
    let isDragging = false;
    let prev = { x: 0, y: 0 };

    const onDown = (e) => { isDragging = true; prev = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { isDragging = false; };
    const onMove = (e) => {
      if (!isDragging) return;
      group.rotation.y += (e.clientX - prev.x) * 0.012;
      group.rotation.x += (e.clientY - prev.y) * 0.012;
      prev = { x: e.clientX, y: e.clientY };
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!isDragging) {
        coreMesh.rotation.y += 0.008;
        coreMesh.rotation.x += 0.004;
        wireMesh.rotation.y -= 0.005;
        ringMesh.rotation.z += 0.012;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      dom.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div ref={mountRef} className="w-[220px] h-[220px] cursor-grab active:cursor-grabbing flex items-center justify-center" />
      <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
        👆 Kéo chuột trên khối cầu 3D để xoay góc nhìn
      </span>
    </div>
  );
}`,

  'src/components/three/TiltCard.jsx': `import React, { useRef } from 'react';

export default function TiltCard({ children, onClick, className = '' }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -7;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 7;
    el.style.transform = \`perspective(1000px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg) scale3d(1.02, 1.02, 1.02)\`;
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: 'transform 0.18s ease-out, border-color 0.25s ease' }}
      className={\`glass-panel rounded-2xl p-6 cursor-pointer hover:border-indigo-500/50 transition-all \${className}\`}
    >
      {children}
    </div>
  );
}`,

  'src/components/layout/Sidebar.jsx': `import React from 'react';
import {
  Compass, Bot, Calculator, Presentation, FileText,
  Mic, HelpCircle, GitBranch, Map, Globe, Box, Key
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenApiKey }) {
  const mainNav = [
    { id: 'dashboard', label: 'Tổng Quan 3D', icon: Compass, color: 'text-indigo-400' },
    { id: 'chatbot', label: 'AI Chatbot Gia Sư', icon: Bot, color: 'text-cyan-400' },
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
            className={\`nav-item \${activeTab === id ? 'active' : ''} w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all\`}
          >
            <Icon className={\`w-4 h-4 \${color}\`} />
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
            className={\`nav-item \${activeTab === id ? 'active' : ''} w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all\`}
          >
            <Icon className={\`w-4 h-4 \${color}\`} />
            <span>{label}</span>
          </button>
        ))}

        <div className="px-3 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Ngoại Ngữ Chuyên Sâu
        </div>
        <button
          onClick={() => setActiveTab('english')}
          className={\`nav-item \${activeTab === 'english' ? 'active' : ''} w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white bg-gradient-to-r from-indigo-900/40 to-purple-900/30 border border-indigo-500/30 transition-all\`}
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
          <span>Trạng thái AI Engine</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Gemini 2.5 Flash
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full w-full" />
        </div>
        <button
          onClick={onOpenApiKey}
          className="w-full py-1.5 px-3 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center justify-center gap-1.5 border border-slate-700"
        >
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cài đặt Gemini API Key</span>
        </button>
      </div>
    </aside>
  );
}`,

  'src/components/english/EnglishCenterView.jsx': `import React, { useState } from 'react';
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
                className={\`px-3.5 py-2 rounded-xl text-xs font-bold transition-all \${
                  englishMode === lv.id
                    ? 'glow-btn text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }\`}
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
              className={\`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all \${
                subTab === id
                  ? 'bg-indigo-600/30 border border-indigo-400/50 text-white'
                  : 'bg-slate-900/70 border border-slate-700/70 text-slate-300 hover:text-white'
              }\`}
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
}`,

  'src/App.jsx': `import React, { useState } from 'react';
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
}`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('✅ Đã cập nhật UI gốc:', filePath);
}

console.log('\\n🎉 Giao diện 3D gốc đã được khôi phục 100%! Hãy mở lại trình duyệt localhost:3000 để xem.');