import React, { useState, useRef, useMemo } from 'react';
import {
  BookOpen, Upload, FileText, Trash2, Plus, Sparkles,
  Search, CheckCircle2, ChevronRight, RefreshCw, Eye, X,
  Layers, Lightbulb, HelpCircle, FileCheck, ShieldCheck, Flame, BookMarked
} from 'lucide-react';
import { renderMarkdownWithMath } from '../../utils/mathRenderer';
import { generateStream, formatAIError, getActiveThinkingMode } from '../../services/geminiService';
import {
  getStoredDocuments,
  saveDocuments,
  extractTextFromFile,
  chunkDocument,
  searchRelevantChunks,
  buildRAGContextPrompt,
  getAllActiveChunks,
  SAMPLE_TEXTBOOKS
} from '../../services/ragService';

export default function RAGKnowledgeView() {
  const [documents, setDocuments] = useState(getStoredDocuments);
  const [activeSubTab, setActiveSubTab] = useState('chat'); // 'chat' | 'library' | 'quiz' | 'summary'
  const [selectedDocPreview, setSelectedDocPreview] = useState(null);
  const [showPasteModal, setShowPasteModal] = useState(false);

  // Form thêm tài liệu dán trực tiếp
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteSubject, setPasteSubject] = useState('Toán Học');
  const [pasteContent, setPasteContent] = useState('');

  // Trạng thái Hỏi Đáp RAG
  const [query, setQuery] = useState('');
  const [matchedChunks, setMatchedChunks] = useState([]);
  const [ragAnswer, setRagAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Trạng thái Quiz & Summary
  const [selectedDocForTool, setSelectedDocForTool] = useState(() => documents[0]?.id || '');
  const [toolResult, setToolResult] = useState('');
  const [toolLoading, setToolLoading] = useState(false);

  const fileInputRef = useRef(null);

  // Tính toán tất cả các chunks đang hoạt động
  const allActiveChunks = useMemo(() => getAllActiveChunks(documents), [documents]);

  const updateDocuments = (newDocs) => {
    setDocuments(newDocs);
    saveDocuments(newDocs);
  };

  // 1. Tải file tài liệu lên (PDF, TXT, MD...)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const extracted = await extractTextFromFile(file);
      const newDoc = {
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title: file.name.replace(/\.[^/.]+$/, ''),
        subject: guessSubjectFromName(file.name),
        fileType: extracted.fileType,
        pageCount: extracted.pageCount,
        createdAt: Date.now(),
        isActive: true,
        content: extracted.text,
      };

      const updated = [newDoc, ...documents];
      updateDocuments(updated);
      alert(`✅ Đã nạp thành công "${file.name}" vào Kho Tri Thức RAG! (${extracted.pageCount} trang / ${extracted.text.length} ký tự)`);
    } catch (err) {
      alert('Lỗi nạp file: ' + (err.message || err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 2. Thêm bằng văn bản dán trực tiếp
  const handleAddPastedDoc = () => {
    if (!pasteTitle.trim() || !pasteContent.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung tài liệu!');
      return;
    }

    const newDoc = {
      id: 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: pasteTitle.trim(),
      subject: pasteSubject,
      fileType: 'TXT',
      pageCount: 1,
      createdAt: Date.now(),
      isActive: true,
      content: pasteContent.trim(),
    };

    updateDocuments([newDoc, ...documents]);
    setShowPasteModal(false);
    setPasteTitle('');
    setPasteContent('');
    alert('✅ Đã thêm tài liệu mới vào Kho Tri Thức RAG!');
  };

  // 3. Khôi phục lại sách mẫu chuẩn
  const handleResetSampleBooks = () => {
    if (confirm('Khôi phục danh sách Sách Giáo Khoa mẫu (Toán 12, Lý 12, Hóa 12)?')) {
      updateDocuments(SAMPLE_TEXTBOOKS);
    }
  };

  // 4. Bật/Tắt tài liệu
  const handleToggleActive = (docId) => {
    const updated = documents.map((d) => (d.id === docId ? { ...d, isActive: !d.isActive } : d));
    updateDocuments(updated);
  };

  // 5. Xóa tài liệu
  const handleDeleteDoc = (docId) => {
    const target = documents.find((d) => d.id === docId);
    if (!confirm(`Bạn có chắc muốn xóa tài liệu "${target?.title}" khỏi kho RAG?`)) return;
    const updated = documents.filter((d) => d.id !== docId);
    updateDocuments(updated);
  };

  // 6. Thực thi truy vấn RAG (Retrieval + Generation)
  const handleRAGSearch = async (customQuery) => {
    const targetQuery = (customQuery || query).trim();
    if (!targetQuery || loading) return;

    if (customQuery) setQuery(customQuery);
    setLoading(true);
    setRagAnswer('');

    // BƯỚC 1: Retrieval - Tìm các đoạn chunks liên quan nhất từ kho sách
    const chunks = searchRelevantChunks(targetQuery, allActiveChunks, 4);
    setMatchedChunks(chunks);

    // BƯỚC 2: Augmentation - Ghép các chunks thành grounding context
    const ragContext = buildRAGContextPrompt(chunks);

    const fullPrompt = `Câu hỏi của học sinh: "${targetQuery}"\n\n${ragContext}\n\nHãy giải đáp chi tiết, sư phạm, kèm công thức toán/lý/hóa chuẩn LaTeX KaTeX nếu có.`;

    try {
      await generateStream(fullPrompt, (chunkText) => {
        setRagAnswer(chunkText);
      });
    } catch (err) {
      setRagAnswer('⚠️ Lỗi phản hồi: ' + formatAIError(err));
    } finally {
      setLoading(false);
    }
  };

  // 7. Tạo bài trắc nghiệm từ sách
  const handleGenerateQuizFromDoc = async () => {
    const target = documents.find((d) => d.id === selectedDocForTool);
    if (!target) return;

    setToolLoading(true);
    setToolResult('');

    const prompt = `Bạn là chuyên gia khảo thí. Dưới đây là nội dung từ cuốn sách/tài liệu "${target.title}":\n\n"""\n${target.content.slice(0, 4000)}\n"""\n\nHãy tạo một bài kiểm tra 5 câu hỏi trắc nghiệm khách quan 4 lựa chọn (A, B, C, D) bám sát 100% nội dung tài liệu trên. Cấu trúc mỗi câu:\n- Đề câu hỏi\n- A, B, C, D\n- Đáp án đúng và lời giải thích chi tiết trích dẫn từ tài liệu. Có công thức toán học dùng LaTeX.`;

    try {
      await generateStream(prompt, (chunkText) => {
        setToolResult(chunkText);
      });
    } catch (err) {
      setToolResult('⚠️ Lỗi tạo Quiz: ' + formatAIError(err));
    } finally {
      setToolLoading(false);
    }
  };

  // 8. Trích xuất tóm tắt & công thức cốt lõi
  const handleExtractSummary = async () => {
    const target = documents.find((d) => d.id === selectedDocForTool);
    if (!target) return;

    setToolLoading(true);
    setToolResult('');

    const prompt = `Bạn là thủ khoa biên soạn sổ tay ôn thi cấp tốc. Dưới đây là nội dung từ cuốn sách/tài liệu "${target.title}":\n\n"""\n${target.content.slice(0, 4500)}\n"""\n\nHãy lập bảng TỔNG HỢP KIẾN THỨC CỐT LÕI & CÔNG THỨC VÀNG bao gồm:\n1. Bảng tóm tắt các định nghĩa, định lý trọng tâm nhất.\n2. Danh sách toàn bộ công thức toán/lý/hóa quan trọng (định dạng LaTeX KaTeX đẹp mắt).\n3. Những lỗi sai và bẫy đề thi học sinh hay gặp cần lưu ý.`;

    try {
      await generateStream(prompt, (chunkText) => {
        setToolResult(chunkText);
      });
    } catch (err) {
      setToolResult('⚠️ Lỗi tổng hợp: ' + formatAIError(err));
    } finally {
      setToolLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. HERO BANNER RAG */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-gradient-to-br from-indigo-500/10 via-purple-500/20 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Công Nghệ RAG (Retrieval-Augmented Generation) Thế Hệ Mới</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Kho Tri Thức & Sách Giáo Khoa Riêng
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Nạp Sách Giáo Khoa, giáo trình, slide bài giảng hoặc file PDF của riêng bạn. AI sẽ truy xuất chính xác từng đoạn và trang sách để giải đáp chuẩn 100%, không bị ảo giác kiến thức.
            </p>
          </div>

          {/* Hộp thống kê nhanh */}
          <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-700/80 shrink-0">
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-xl font-bold text-cyan-400">{documents.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">Sách & Tài liệu</div>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-xl font-bold text-indigo-400">{allActiveChunks.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">Đoạn Tri Thức</div>
            </div>
            <div className="text-center px-2">
              <div className="flex items-center justify-center gap-1 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" /> BẬT
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Bám Sát SGK</div>
            </div>
          </div>
        </div>

        {/* Nút hành động nhanh */}
        <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-4 border-t border-slate-800/80">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.txt,.md,.json,.csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Đang trích xuất văn bản...' : 'Nạp File Sách (PDF, TXT)'}</span>
          </button>

          <button
            onClick={() => setShowPasteModal(true)}
            className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Dán Văn Bản / Ghi Chú</span>
          </button>

          <button
            onClick={handleResetSampleBooks}
            className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ml-auto"
            title="Nạp lại bộ Sách Giáo Khoa mẫu Toán 12, Lý 12, Hóa 12"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Nạp Lại SGK Mẫu</span>
          </button>
        </div>
      </div>

      {/* 2. THANH ĐIỀU HƯỚNG CÁC TÍNH NĂNG RAG */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        {[
          { id: 'chat', label: 'Hỏi Đáp Bám Sát Sách', icon: BookOpen, color: 'text-cyan-400' },
          { id: 'library', label: `Thư Viện Tài Liệu (${documents.length})`, icon: Layers, color: 'text-indigo-400' },
          { id: 'quiz', label: 'Tạo Quiz Ôn Thi Từ Sách', icon: HelpCircle, color: 'text-purple-400' },
          { id: 'summary', label: 'Trích Xuất Công Thức & Tóm Tắt', icon: FileCheck, color: 'text-emerald-400' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-indigo-500 text-white bg-indigo-500/10 rounded-t-xl font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-xl'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. NỘI DUNG TỪNG TAB */}

      {/* TAB 1: HỎI ĐÁP RAG */}
      {activeSubTab === 'chat' && (
        <div className="space-y-6">
          {/* Ô nhập câu hỏi */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Đặt câu hỏi tra cứu trong Kho Sách Giáo Khoa & Tài Liệu</span>
              </label>
              <span className="text-[11px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                Tìm kiếm trong <b className="text-indigo-300">{allActiveChunks.length}</b> đoạn kiến thức
              </span>
            </div>

            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRAGSearch()}
                placeholder="Ví dụ: Điều kiện để hàm số đồng biến? Công thức chu kỳ con lắc lò xo? Thủy phân este của phenol?..."
                className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleRAGSearch()}
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-white rounded-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Đang tra cứu...' : 'Tra Cứu Sách'}</span>
              </button>
            </div>

            {/* Gợi ý câu hỏi mẫu */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Gợi ý thử:
              </span>
              {[
                'Điều kiện để hàm số đồng biến trên K là gì?',
                'Công thức chu kỳ dao động của con lắc đơn và con lắc lò xo?',
                'Phản ứng thủy phân este của phenol với kiềm tạo sản phẩm gì?',
                'Cách tìm cực trị hàm số bằng đạo hàm cấp 2?'
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRAGSearch(q)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách các đoạn trích dẫn tìm thấy (Grounding Citations) */}
          {matchedChunks.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 bg-indigo-950/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-cyan-400" />
                  <span>Đoạn Trích Dẫn Tìm Thấy Từ Sách ({matchedChunks.length} nguồn liên quan)</span>
                </h3>
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Đã kiểm chứng bám sát
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matchedChunks.map((chunk, index) => (
                  <div
                    key={chunk.id}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-cyan-300 flex items-center gap-1">
                        [Nguồn {index + 1}] {chunk.docTitle}
                      </span>
                      <span className="text-emerald-400 font-mono text-[10px]">
                        Khớp: {chunk.confidence}%
                      </span>
                    </div>
                    <p className="text-slate-300 line-clamp-3 text-[11px] italic bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      "{chunk.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kết quả phản hồi bám sát sách */}
          {(ragAnswer || loading) && (
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="font-bold text-slate-100 text-sm">
                    Lời Giải Thích Bám Sát Sách Giáo Khoa (RAG Grounded)
                  </h3>
                </div>
                <span className="text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono">
                  Gemini + SGK RAG Engine
                </span>
              </div>

              {loading && !ragAnswer && (
                <div className="text-slate-400 text-xs flex items-center gap-2 py-4">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span>AI đang tổng hợp và đối chiếu từng trang sách giáo khoa...</span>
                </div>
              )}

              {ragAnswer && (
                <div
                  className="prose prose-invert max-w-none text-sm text-slate-200 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(ragAnswer) }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: THƯ VIỆN TÀI LIỆU (DOCUMENT LIBRARY) */}
      {activeSubTab === 'library' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-200">
              Danh sách Sách & Tài Liệu Đã Nạp ({documents.length})
            </h3>
            <span className="text-xs text-slate-400">
              Bật/Tắt để cho phép AI tìm kiếm trong từng cuốn sách
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              const chunkCount = chunkDocument(doc).length;
              return (
                <div
                  key={doc.id}
                  className={`glass-panel rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                    doc.isActive
                      ? 'border-indigo-500/30 bg-slate-900/60'
                      : 'border-slate-800 bg-slate-950/40 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {doc.subject || 'Tổng hợp'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {doc.fileType || 'TXT'}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-100 line-clamp-2" title={doc.title}>
                      {doc.title}
                    </h4>

                    <div className="text-xs text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Số đoạn (chunks):</span>
                        <span className="font-mono text-cyan-300 font-semibold">{chunkCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Độ dài văn bản:</span>
                        <span className="font-mono text-slate-300">{doc.content?.length?.toLocaleString()} ký tự</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleActive(doc.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        doc.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {doc.isActive ? '✓ Đang dùng' : 'Tạm tắt'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedDocPreview(doc)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                        title="Xem nội dung chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Xóa tài liệu này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TẠO QUIZ ÔN THI TỪ SÁCH */}
      {activeSubTab === 'quiz' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>Tự Động Sinh 5 Câu Hỏi Trắc Nghiệm Ôn Tập Bám Sát Sách</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <select
                value={selectedDocForTool}
                onChange={(e) => setSelectedDocForTool(e.target.value)}
                className="w-full sm:w-auto flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.subject})
                  </option>
                ))}
              </select>

              <button
                onClick={handleGenerateQuizFromDoc}
                disabled={toolLoading || !selectedDocForTool}
                className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>{toolLoading ? 'Đang tạo Quiz...' : 'Tạo Bộ Đề Trắc Nghiệm'}</span>
              </button>
            </div>
          </div>

          {(toolResult || toolLoading) && (
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="font-bold text-sm text-purple-300">Bộ Đề Trắc Nghiệm Chuẩn Hóa Theo Sách</h4>
                <span className="text-xs text-slate-400">Trích xuất trực tiếp từ kiến thức sách đã nạp</span>
              </div>
              {toolResult && (
                <div
                  className="prose prose-invert max-w-none text-sm text-slate-200"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(toolResult) }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TRÍCH XUẤT CÔNG THỨC & TÓM TẮT */}
      {activeSubTab === 'summary' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Trích Xuất Bảng Công Thức Vàng & Khái Niệm Cốt Lõi</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <select
                value={selectedDocForTool}
                onChange={(e) => setSelectedDocForTool(e.target.value)}
                className="w-full sm:w-auto flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.subject})
                  </option>
                ))}
              </select>

              <button
                onClick={handleExtractSummary}
                disabled={toolLoading || !selectedDocForTool}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>{toolLoading ? 'Đang trích xuất...' : 'Trích Xuất Sổ Tay Công Thức'}</span>
              </button>
            </div>
          </div>

          {(toolResult || toolLoading) && (
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="font-bold text-sm text-emerald-300">Sổ Tay Công Thức & Kiến Thức Vàng Cốt Lõi</h4>
                <span className="text-xs text-slate-400">Đã định dạng KaTeX chuẩn đẹp</span>
              </div>
              {toolResult && (
                <div
                  className="prose prose-invert max-w-none text-sm text-slate-200"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(toolResult) }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL XEM CHI TIẾT NỘI DUNG TÀI LIỆU */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-indigo-500/30 overflow-hidden shadow-2xl animate-scaleUp">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">{selectedDocPreview.title}</h3>
                <span className="text-xs text-indigo-400 font-medium">
                  {selectedDocPreview.subject} • {selectedDocPreview.fileType} • {selectedDocPreview.content?.length} ký tự
                </span>
              </div>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950/60 select-text">
              {selectedDocPreview.content}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÁN VĂN BẢN TRỰC TIẾP */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel rounded-3xl w-full max-w-xl flex flex-col border border-indigo-500/30 overflow-hidden shadow-2xl animate-scaleUp">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Nạp Tài Liệu / Sách Bằng Văn Bản Trực Tiếp</span>
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Tên tài liệu / Tên sách:</label>
                <input
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="Ví dụ: Đề cương Ôn thi Đại cương, SGK Lịch Sử 12..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Môn học / Chủ đề:</label>
                <select
                  value={pasteSubject}
                  onChange={(e) => setPasteSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Toán Học">Toán Học</option>
                  <option value="Vật Lý">Vật Lý</option>
                  <option value="Hóa Học">Hóa Học</option>
                  <option value="Sinh Học">Sinh Học</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                  <option value="Ngữ Văn">Ngữ Văn</option>
                  <option value="Lịch Sử / Địa Lý">Lịch Sử / Địa Lý</option>
                  <option value="Đại Cương / Chuyên Ngành">Đại Cương / Chuyên Ngành</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Nội dung văn bản:</label>
                <textarea
                  rows={8}
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Dán toàn bộ nội dung chương sách, giáo trình hoặc ghi chú của bạn vào đây..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleAddPastedDoc}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Lưu Vào Kho RAG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hàm dự đoán môn học theo tên file
function guessSubjectFromName(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('toan') || lower.includes('math')) return 'Toán Học';
  if (lower.includes('ly') || lower.includes('physic')) return 'Vật Lý';
  if (lower.includes('hoa') || lower.includes('chem')) return 'Hóa Học';
  if (lower.includes('sinh') || lower.includes('bio')) return 'Sinh Học';
  if (lower.includes('anh') || lower.includes('english') || lower.includes('ielts')) return 'Tiếng Anh';
  if (lower.includes('van') || lower.includes('literature')) return 'Ngữ Văn';
  if (lower.includes('su') || lower.includes('history')) return 'Lịch Sử';
  if (lower.includes('dia') || lower.includes('geo')) return 'Địa Lý';
  return 'Tổng hợp';
}
