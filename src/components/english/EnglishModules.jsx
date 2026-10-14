import React, { useState } from 'react';
import { Type } from '@google/genai';
import { renderMarkdownWithMath } from '../../utils/mathRenderer';
import { generateText, generateJSON, formatAIError } from '../../services/geminiService';
import { ENGLISH_SPEAKING_SYSTEM_INSTRUCTION, ENGLISH_WRITING_SYSTEM_INSTRUCTION, ENGLISH_GRAMMAR_SYSTEM_INSTRUCTION } from '../../config/systemInstructions';
import { speakText, createSpeechRecognizer } from '../../services/speechService';

import { 
  Sparkles, RotateCw, Volume2, Mic, Languages, CheckCircle2, 
  Target, Award, Volume1, ArrowRight, Loader2, BookOpen, History,
  ChevronLeft, ChevronRight, SlidersHorizontal, Layers, Eye, EyeOff
} from 'lucide-react';

// Câu dự phòng duy nhất phòng trường hợp mất mạng hoặc chưa cấu hình API Key
const EMERGENCY_FALLBACK_SENTENCES = {
  'IELTS': {
    sentence: 'Artificial intelligence is transforming modern education and scientific research around the world.',
    ipa: '/ˌɑːtɪˈfɪʃl ɪnˈtelɪdʒəns ɪz trænsˈfɔːmɪŋ ˈmɒdn ˌedʒuˈkeɪʃn ənd ˌsaɪənˈtɪfɪk rɪˈsɜːtʃ əˈraʊnd ðə wɜːld/',
    translation: 'Trí tuệ nhân tạo đang biến đổi nền giáo dục hiện đại và nghiên cứu khoa học trên toàn thế giới.',
    topic: 'Technology & Science',
    focusSound: 'Liên kết âm & trọng âm từ đa âm tiết',
    level: 'IELTS Band 7.5+'
  },
  'TOEIC': {
    sentence: 'Please make sure to submit your quarterly financial reports before Friday afternoon.',
    ipa: '/pliːz meɪk ʃʊə tu səbˈmɪt jɔː ˈkwɔːtəli faɪˈnænʃl rɪˈpɔːts bɪˈfɔː ˈfraɪdeɪ ˌɑːftəˈnuːn/',
    translation: 'Vui lòng đảm bảo nộp các báo cáo tài chính hàng quý trước chiều thứ Sáu.',
    topic: 'Office & Finance',
    focusSound: 'Ending sound /-ts/ và nối âm "make sure"',
    level: 'TOEIC 750+'
  },
  'Tiếng Anh Phổ Thông': {
    sentence: 'Learning a foreign language opens up incredible opportunities for your future education and career.',
    ipa: '/ˈlɜːnɪŋ ə ˈfɒrən ˈlæŋɡwɪdʒ ˈəʊpənz ʌp ɪnˈkredəbl ˌɒpəˈtjuːnətiz fɔː jɔː ˈfjuːtʃər ˌedʒuˈkeɪʃn ənd kəˈrɪə/',
    translation: 'Học một ngoại ngữ mở ra những cơ hội tuyệt vời cho việc học tập và sự nghiệp tương lai.',
    topic: 'Học tập & Tương lai',
    focusSound: 'Nối âm "opens up" và âm /dʒ/ trong "language"',
    level: 'THPT / B1-B2'
  }
};

const TOPIC_OPTIONS = [
  'Ngẫu nhiên',
  'Công nghệ & AI',
  'Môi trường & Biến đổi khí hậu',
  'Kinh doanh & Đàm phán',
  'Giáo dục & Kỹ năng số',
  'Đời sống & Giao tiếp hàng ngày',
  'Du lịch & Văn hóa quốc tế',
  'Phỏng vấn xin việc & CV',
  'Y tế & Sức khỏe tinh thần'
];

// 9. AI CHẤM ĐIỂM PHÁT ÂM - 100% CÂU DO GEMINI AI TỰ ĐỘNG SINH REAL-TIME
export function SpeakingCoachView({ englishMode }) {
  const fallback = EMERGENCY_FALLBACK_SENTENCES[englishMode] || EMERGENCY_FALLBACK_SENTENCES['IELTS'];

  // Lịch sử các câu AI đã sinh trong phiên học
  const [aiHistory, setAiHistory] = useState([fallback]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [currentSentenceObj, setCurrentSentenceObj] = useState(fallback);
  const [targetSentence, setTargetSentence] = useState(fallback.sentence);
  
  const [spokenText, setSpokenText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('Ngẫu nhiên');
  const [audioSpeed, setAudioSpeed] = useState(0.95);
  const [showTranslation, setShowTranslation] = useState(true);
  const [aiTotalCount, setAiTotalCount] = useState(1);

  // HÀM GỌI GEMINI AI TỰ TẠO CÂU MỚI THEO THỜI GIAN THỰC (REAL-TIME GENERATION)
  const generateNewAISentence = async (topicOverride = null) => {
    setIsGeneratingAI(true);
    try {
      const activeTopic = topicOverride || selectedTopic;
      const topicClause = activeTopic !== 'Ngẫu nhiên' 
        ? `Tập trung sâu vào chủ đề: "${activeTopic}".` 
        : `Lựa chọn ngẫu nhiên một trong các chủ đề thực tế: Công nghệ, Khoa học, Kinh tế, Giáo dục, Môi trường, Du lịch, Đời sống hàng ngày.`;

      const randomSeed = Math.floor(Math.random() * 1000000);
      const prompt = `Bạn là Giám khảo Khảo thí và Huấn luyện viên Phát âm Tiếng Anh Quốc tế hàng đầu.
Nhiệm vụ: Hãy tự sáng tác 1 câu tiếng Anh hoàn toàn MỚI LẠ, ĐỘC BẢN, TỰ NHIÊN (Seed: ${randomSeed}, timestamp: ${Date.now()}) theo chuẩn hệ đào tạo: "${englishMode}".
${topicClause}

Tiêu chuẩn chất lượng:
1. Độ dài: từ 11 đến 18 từ. Cấu trúc câu tự nhiên, giàu ngữ điệu, chuẩn ngữ pháp bản xứ, không sáo rỗng.
2. Phiên âm IPA: phiên âm quốc tế chuẩn xác từng từ trong câu (VD: /ˌɑːtɪˈfɪʃl ɪnˈtelɪdʒəns.../).
3. Dịch nghĩa tiếng Việt: tự nhiên, văn minh, thoát ý.
4. Tiêu điểm phát âm (focusSound): chỉ rõ 1-2 âm khó, trọng âm hoặc âm đuôi (ending sounds: /-s/, /-z/, /-t/, /-d/, /θ/, /ð/, /ʃ/, /tʃ/) người Việt dễ mắc lỗi.
5. Cấp độ đánh giá (level): Ghi rõ cấp độ (VD: "IELTS 7.5+", "TOEIC 850+", "THPT Nâng Cao - B2").

Trả về ĐÚNG định dạng JSON sau:
{
  "sentence": "câu tiếng Anh hoàn chỉnh",
  "ipa": "/phiên âm IPA cho cả câu/",
  "translation": "Bản dịch nghĩa tiếng Việt tự nhiên",
  "topic": "Tên chủ đề ngắn gọn",
  "focusSound": "Điểm phát âm/khẩu hình cần lưu ý",
  "level": "Cấp độ đánh giá"
}`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          sentence: { type: Type.STRING },
          ipa: { type: Type.STRING },
          translation: { type: Type.STRING },
          topic: { type: Type.STRING },
          focusSound: { type: Type.STRING },
          level: { type: Type.STRING }
        },
        required: ['sentence', 'ipa', 'translation', 'topic', 'focusSound', 'level']
      };

      const newSentenceObj = await generateJSON(prompt, schema);

      // Cập nhật câu hiện tại và thêm vào lịch sử
      setCurrentSentenceObj(newSentenceObj);
      setTargetSentence(newSentenceObj.sentence);
      setAiHistory((prev) => [newSentenceObj, ...prev]);
      setHistoryIndex(0);
      setAiTotalCount((c) => c + 1);
      
      // Xóa kết quả đọc cũ để học viên sẵn sàng luyện câu mới
      setSpokenText('');
      setFeedback('');
    } catch (error) {
      console.error('Lỗi khi AI tạo câu:', error);
      alert('Không thể tạo câu mới: ' + formatAIError(error));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Tự động gọi AI tạo câu mới toanh ngay khi mở hoặc chuyển chế độ englishMode
  React.useEffect(() => {
    generateNewAISentence();
  }, [englishMode]);

  // Xem câu trước trong lịch sử đã AI sinh
  const handlePrevHistory = () => {
    if (historyIndex < aiHistory.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const item = aiHistory[nextIdx];
      setCurrentSentenceObj(item);
      setTargetSentence(item.sentence);
      setSpokenText('');
      setFeedback('');
    }
  };

  // Xem câu sau trong lịch sử
  const handleNextHistory = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      const item = aiHistory[nextIdx];
      setCurrentSentenceObj(item);
      setTargetSentence(item.sentence);
      setSpokenText('');
      setFeedback('');
    }
  };

  const startRecord = () => {
    const rec = createSpeechRecognizer('en-US', false);
    if (!rec) return alert('Trình duyệt không hỗ trợ Web Speech API nhận diện giọng nói! Vui lòng dùng Chrome hoặc Edge.');
    setIsListening(true);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setSpokenText(transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.start();
  };

  const evaluatePronunciation = async () => {
    if (!spokenText.trim()) return;
    setLoading(true);
    try {
      const prompt = `Chế độ luyện thi: ${englishMode}.
Chủ đề: ${currentSentenceObj?.topic || 'Tổng hợp'}.
Câu mẫu chuẩn do AI sinh: "${targetSentence}"
Phiên âm IPA chuẩn: "${currentSentenceObj?.ipa || ''}"
Người học đọc được nhận diện qua microphone là: "${spokenText}".
Điểm ngữ âm cần chú ý của câu: ${currentSentenceObj?.focusSound || 'Trọng âm và ending sounds'}.

Hãy đánh giá phát âm chi tiết, cấu trúc chấm điểm:
1. Độ chính xác tổng thể (thang điểm 100%) và lời nhận xét chân thành, khích lệ.
2. So sánh từ người học đọc chuẩn vs từ phát âm chưa rõ / nuốt âm / sai ending sound.
3. Hướng dẫn cụ thể khẩu hình miệng và vị trí đặt lưỡi cho 1-2 từ khó nhất bằng tiếng Việt.
4. Mẹo nối âm và ngữ điệu (Intonation) câu.`;

      const res = await generateText(prompt, ENGLISH_SPEAKING_SYSTEM_INSTRUCTION);
      setFeedback(res);
    } catch (e) {
      setFeedback('⚠️ ' + formatAIError(e));
    }
    setLoading(false);
  };

  // Tính tỷ lệ khớp cơ bản các từ để phản hồi thị giác tức thì
  const getWordMatchStats = () => {
    if (!spokenText.trim()) return null;
    const targetWords = targetSentence.toLowerCase().replace(/[.,!?;:"]/g, '').split(/\s+/).filter(Boolean);
    const spokenWords = spokenText.toLowerCase().replace(/[.,!?;:"]/g, '').split(/\s+/).filter(Boolean);
    
    let matches = 0;
    targetWords.forEach(w => {
      if (spokenWords.includes(w)) matches++;
    });

    const percent = Math.min(100, Math.round((matches / (targetWords.length || 1)) * 100));
    return { matches, total: targetWords.length, percent };
  };

  const matchStats = getWordMatchStats();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CỘT TRÁI: KHU VỰC LUYỆN ĐỌC VÀ ĐIỀU KHIỂN CÂU */}
      <div className="glass-panel rounded-3xl p-6 space-y-5 border border-indigo-500/20 shadow-xl bg-slate-900/70 backdrop-blur-md">
        
        {/* THANH ĐIỀU HƯỚNG CÂU & CHẾ ĐỘ */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              {englishMode}
            </span>
            {currentSentenceObj?.level && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                {currentSentenceObj.level}
              </span>
            )}
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              100% AI sinh trực tiếp
            </span>
          </div>

          {/* NÚT TẢI CÂU MỚI (AI TỰ TẠO REAL-TIME) */}
          <div className="flex items-center gap-1.5">
            {aiHistory.length > 1 && (
              <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700 mr-1">
                <button
                  onClick={handlePrevHistory}
                  disabled={historyIndex >= aiHistory.length - 1}
                  title="Xem lại câu AI vừa sinh trước đó"
                  className="p-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono px-1.5 text-slate-400">
                  {aiHistory.length - historyIndex}/{aiHistory.length}
                </span>
                <button
                  onClick={handleNextHistory}
                  disabled={historyIndex <= 0}
                  title="Chuyển đến câu mới hơn"
                  className="p-1 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => generateNewAISentence()}
              disabled={isGeneratingAI}
              title="Yêu cầu AI sáng tạo một câu luyện phát âm mới hoàn toàn"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all disabled:opacity-60"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Đang Tạo Câu Mới...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Đổi câu khác (AI)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* BỘ CHỌN CHỦ ĐỀ CHO AI */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/40 p-2.5 rounded-2xl border border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chủ đề AI:</span>
            <select
              value={selectedTopic}
              onChange={(e) => {
                const newTopic = e.target.value;
                setSelectedTopic(newTopic);
                generateNewAISentence(newTopic);
              }}
              disabled={isGeneratingAI}
              className="bg-slate-900 border border-slate-700 text-cyan-300 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {TOPIC_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {currentSentenceObj?.focusSound && (
            <div className="text-amber-300/95 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-medium text-[11px]">
              ⚡ Chú ý: {currentSentenceObj.focusSound}
            </div>
          )}
        </div>

        {/* KHUNG CÂU MẪU SINH BỞI AI (CHO PHÉP TỰ SỬA NẾU MUỐN) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Câu mẫu AI sinh cho bạn:</span>
              {currentSentenceObj?.topic && (
                <span className="text-[11px] px-2 py-0.2 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-normal">
                  Chủ đề: {currentSentenceObj.topic}
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-400 italic">(Có thể chỉnh sửa trực tiếp)</span>
          </div>

          {isGeneratingAI ? (
            <div className="w-full h-24 bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 animate-pulse">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <p className="text-xs text-indigo-300 font-medium">Gemini AI đang sáng tạo câu luyện đọc mới...</p>
            </div>
          ) : (
            <textarea
              rows={3}
              value={targetSentence}
              onChange={(e) => {
                setTargetSentence(e.target.value);
                setSpokenText('');
                setFeedback('');
              }}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4 text-base font-semibold text-cyan-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all leading-relaxed"
            />
          )}
        </div>

        {/* PHIÊN ÂM IPA VÀ BẢN DỊCH NGHĨA */}
        {currentSentenceObj?.ipa && !isGeneratingAI && (
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] shrink-0 uppercase tracking-wider">
                IPA
              </span>
              <p className="font-mono text-cyan-400/90 leading-relaxed tracking-wide select-all">
                {currentSentenceObj.ipa}
              </p>
            </div>
            
            {currentSentenceObj.translation && (
              <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80">
                <button 
                  onClick={() => setShowTranslation(!showTranslation)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] shrink-0 transition-colors"
                >
                  {showTranslation ? 'Ẩn nghĩa' : 'Hiện nghĩa'}
                </button>
                {showTranslation && (
                  <p className="text-slate-300 italic">
                    "{currentSentenceObj.translation}"
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* THANH ĐIỀU KHIỂN PHÁT ÂM MẪU VÀ GHI ÂM */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Cụm nghe mẫu & tốc độ */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => speakText(targetSentence, 'en-US', audioSpeed)}
              disabled={isGeneratingAI}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-700 shadow disabled:opacity-50"
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>Nghe Mẫu</span>
            </button>

            {/* Nút chỉnh tốc độ đọc mẫu */}
            <button
              onClick={() => setAudioSpeed(audioSpeed === 0.95 ? 0.75 : 0.95)}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                audioSpeed < 0.9
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Chuyển đổi tốc độ đọc mẫu (Bình thường / Chậm)"
            >
              {audioSpeed < 0.9 ? '🐢 Đọc Chậm (0.75x)' : '⚡ Chuẩn (1.0x)'}
            </button>
          </div>

          {/* Nút ghi âm micro */}
          <button
            onClick={startRecord}
            disabled={isGeneratingAI}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
              isListening
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-red-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
            }`}
          >
            <Mic className={`w-4 h-4 ${isListening ? 'animate-bounce' : ''}`} />
            <span>{isListening ? '🔴 Đang nghe bạn đọc...' : '🎤 Bấm Để Đọc'}</span>
          </button>
        </div>

        {/* KẾT QUẢ MICROPHONE & THỐNG KÊ ĐỌC ĐƯỢC */}
        {spokenText && (
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-700 space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-semibold">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                Giọng đọc nhận diện được:
              </p>
              {matchStats && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  matchStats.percent >= 80 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  Độ khớp từ: {matchStats.percent}% ({matchStats.matches}/{matchStats.total} từ)
                </span>
              )}
            </div>

            <p className="text-base font-semibold text-emerald-300 p-3 rounded-xl bg-slate-900 border border-slate-800">
              "{spokenText}"
            </p>

            <button
              onClick={evaluatePronunciation}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>AI Đang Phân Tích Khẩu Hình & Trọng Âm...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 text-yellow-300" />
                  <span>Chấm Điểm & Sửa Khẩu Hình Bằng AI</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* CỘT PHẢI: BÁO CÁO NHẬN XÉT CỦA AI COACH */}
      <div className="glass-panel rounded-3xl p-6 overflow-y-auto max-h-[80vh] border border-emerald-500/20 shadow-xl bg-slate-900/70 backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-base">
            <Award className="w-5 h-5 text-emerald-400" />
            Nhận Xét Phát Âm Từ AI Coach:
          </h3>
          {feedback && (
            <span className="text-[11px] text-slate-400">
              Chuẩn {englishMode}
            </span>
          )}
        </div>

        {feedback ? (
          <div className="prose prose-invert text-sm max-w-none space-y-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(feedback) }} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 text-slate-400">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Mic className="w-8 h-8" />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="font-bold text-slate-200">Sẵn sàng luyện phát âm!</p>
              <p className="text-xs text-slate-400">
                Mỗi lần bấm <strong>"Đổi câu khác (AI)"</strong>, Gemini AI sẽ tự động sáng tạo câu luyện đọc hoàn toàn mới. Bấm <strong>"🎤 Bấm Để Đọc"</strong> để nhận xét khẩu hình nhé!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Ngân hàng từ vựng dự phòng nếu mất kết nối mạng
const FALLBACK_VOCAB_SETS = {
  'IELTS': [
    { word: 'Ubiquitous', partOfSpeech: 'adjective', ipa: '/juːˈbɪkwɪtəs/', meaning: 'Có mặt ở khắp mọi nơi, phổ biến rộng rãi', example: 'Smartphones have become ubiquitous in daily modern life.', exampleTranslation: 'Điện thoại thông minh đã trở nên phổ biến khắp mọi nơi trong đời sống hiện đại.', level: 'C1 Academic' },
    { word: 'Mitigate', partOfSpeech: 'verb', ipa: '/ˈmɪtɪɡeɪt/', meaning: 'Giảm nhẹ, xoa dịu mức độ nghiêm trọng', example: 'Prompt actions were taken to mitigate the environmental impact.', exampleTranslation: 'Các hành động kịp thời đã được thực hiện nhằm giảm nhẹ tác động môi trường.', level: 'C1 Academic' },
    { word: 'Indispensable', partOfSpeech: 'adjective', ipa: '/ˌɪndɪˈspensəbl/', meaning: 'Không thể thiếu, tối quan trọng', example: 'Critical thinking is indispensable for academic excellence.', exampleTranslation: 'Tư duy phản biện là yếu tố không thể thiếu đối với thành tích học thuật xuất sắc.', level: 'C1 Academic' },
    { word: 'Proponent', partOfSpeech: 'noun', ipa: '/prəˈpəʊnənt/', meaning: 'Người ủng hộ, tán thành quan điểm/chính sách', example: 'She is a vocal proponent of renewable green energy.', exampleTranslation: 'Cô ấy là một người lên tiếng ủng hộ mạnh mẽ năng lượng xanh tái tạo.', level: 'B2 Academic' },
    { word: 'Exacerbate', partOfSpeech: 'verb', ipa: '/ɪɡˈzæsəbeɪt/', meaning: 'Làm trầm trọng thêm (vấn đề, dịch bệnh, xung đột)', example: 'Air pollution will exacerbate respiratory illnesses among youth.', exampleTranslation: 'Ô nhiễm không khí sẽ làm trầm trọng thêm các bệnh đường hô hấp ở giới trẻ.', level: 'C1 Academic' },
    { word: 'Pragmatic', partOfSpeech: 'adjective', ipa: '/præɡˈmætɪk/', meaning: 'Thực dụng, chú trọng tính thực tiễn và kết quả', example: 'We must adopt a pragmatic approach to solve this dilemma.', exampleTranslation: 'Chúng ta phải áp dụng một cách tiếp cận thực tiễn để giải quyết tình thế tiến thoái lưỡng nan này.', level: 'C1 Academic' }
  ],
  'TOEIC': [
    { word: 'Collaborate', partOfSpeech: 'verb', ipa: '/kəˈlæbəreɪt/', meaning: 'Hợp tác, phối hợp cùng làm việc', example: 'Both departments will collaborate on the quarterly project.', exampleTranslation: 'Cả hai phòng ban sẽ phối hợp cùng nhau trong dự án quý này.', level: 'TOEIC 750+' },
    { word: 'Subsidize', partOfSpeech: 'verb', ipa: '/ˈsʌbsɪdaɪz/', meaning: 'Trợ cấp, bao cấp một phần chi phí', example: 'The company agreed to subsidize public transit for staff.', exampleTranslation: 'Công ty đã đồng ý trợ cấp chi phí xe công cộng cho nhân viên.', level: 'TOEIC 800+' },
    { word: 'Feasible', partOfSpeech: 'adjective', ipa: '/ˈfiːzəbl/', meaning: 'Khả thi, có thể thực hiện được', example: 'The board is evaluating whether the proposal is financially feasible.', exampleTranslation: 'Ban giám đốc đang đánh giá xem đề xuất này có khả thi về mặt tài chính hay không.', level: 'TOEIC 800+' },
    { word: 'Reimburse', partOfSpeech: 'verb', ipa: '/ˌriːɪmˈbɜːs/', meaning: 'Hoàn tiền, thanh toán lại công tác phí', example: 'We will reimburse all approved travel expenses within five days.', exampleTranslation: 'Chúng tôi sẽ hoàn lại mọi chi phí đi lại đã được duyệt trong vòng năm ngày.', level: 'TOEIC 700+' },
    { word: 'Prominently', partOfSpeech: 'adverb', ipa: '/ˈprɒmɪnəntli/', meaning: 'Nổi bật, ở vị trí dễ quan sát', example: 'Safety guidelines must be displayed prominently in the warehouse.', exampleTranslation: 'Quy tắc an toàn phải được dán nổi bật tại kho xưởng.', level: 'TOEIC 750+' },
    { word: 'Tentative', partOfSpeech: 'adjective', ipa: '/ˈtentətɪv/', meaning: 'Dự kiến, tạm thời (chưa chính thức chốt)', example: 'We reached a tentative agreement on the delivery schedule.', exampleTranslation: 'Chúng tôi đã đạt được thỏa thuận dự kiến về lịch trình giao hàng.', level: 'TOEIC 800+' }
  ],
  'Tiếng Anh Phổ Thông': [
    { word: 'Confident', partOfSpeech: 'adjective', ipa: '/ˈkɒnfɪdənt/', meaning: 'Tự tin, tràn đầy niềm tin vào bản thân', example: 'She feels confident in presenting her ideas in English.', exampleTranslation: 'Cô ấy cảm thấy tự tin khi thuyết trình các ý tưởng của mình bằng tiếng Anh.', level: 'THPT / B1' },
    { word: 'Inspire', partOfSpeech: 'verb', ipa: '/ɪnˈspaɪər/', meaning: 'Truyền cảm hứng, khơi nguồn sáng tạo', example: 'Dedicated teachers always inspire students to learn more.', exampleTranslation: 'Những người thầy tận tâm luôn truyền cảm hứng cho học sinh học hỏi nhiều hơn.', level: 'THPT / B1' },
    { word: 'Opportunity', partOfSpeech: 'noun', ipa: '/ˌɒpəˈtjuːnəti/', meaning: 'Cơ hội, dịp thuận lợi', example: 'Studying abroad is a wonderful opportunity to grow.', exampleTranslation: 'Du học là một cơ hội tuyệt vời để trưởng thành.', level: 'THCS - THPT' },
    { word: 'Achieve', partOfSpeech: 'verb', ipa: '/əˈtʃiːv/', meaning: 'Đạt được, gặt hái thành công (mục tiêu)', example: 'Hard work will help you achieve your personal dreams.', exampleTranslation: 'Chăm chỉ sẽ giúp bạn đạt được những ước mơ của bản thân.', level: 'THPT / B1' },
    { word: 'Enthusiastic', partOfSpeech: 'adjective', ipa: '/ɪnˌθjuːziˈæstɪk/', meaning: 'Nhiệt tình, hào hứng, say mê', example: 'Students were very enthusiastic about the school festival.', exampleTranslation: 'Học sinh đã rất hào hứng với lễ hội của trường.', level: 'THPT / B2' },
    { word: 'Valuable', partOfSpeech: 'adjective', ipa: '/ˈvæljuəbl/', meaning: 'Có giá trị, quý báu, hữu ích', example: 'My tutor gave me valuable advice on exam preparation.', exampleTranslation: 'Gia sư đã cho tôi những lời khuyên quý báu về việc chuẩn bị thi cử.', level: 'THCS - THPT' }
  ]
};

const VOCAB_TOPIC_PRESETS = [
  'Ngẫu nhiên',
  'Technology & AI',
  'Environment & Climate',
  'Business & Finance',
  'Education & University',
  'Daily Life & Social',
  'Travel, Culture & Food',
  'Idioms & Collocations'
];

// 10. TỪ VỰNG 3D THEO CHỦ ĐỀ - 100% GEMINI AI SINH REAL-TIME VỚI NÚT TẢI LẠI
export function Vocab3DView({ englishMode }) {
  const fallback = FALLBACK_VOCAB_SETS[englishMode] || FALLBACK_VOCAB_SETS['IELTS'];

  const [topic, setTopic] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('Ngẫu nhiên');
  const [cards, setCards] = useState(fallback);
  const [flipped, setFlipped] = useState({});
  const [allFlipped, setAllFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Lịch sử các bộ từ AI đã tạo trong phiên học
  const [historySets, setHistorySets] = useState([{ topic: 'Mẫu khởi đầu', cards: fallback }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Gọi Gemini AI tạo bộ 6 từ vựng mới toanh theo thời gian thực
  const generateVocab = async (overrideTopic = null) => {
    setLoading(true);
    try {
      const activeTopic = overrideTopic || topic.trim() || (selectedPreset !== 'Ngẫu nhiên' ? selectedPreset : 'đa dạng, mang tính thực tế và tính ứng dụng cao');
      const randomSeed = Math.floor(Math.random() * 1000000);

      const prompt = `Bạn là Chuyên gia Khảo thí và Ngôn ngữ học Tiếng Anh hàng đầu.
Nhiệm vụ: Hãy sáng tác 1 bộ gồm 6 từ vựng/cụm từ tiếng Anh hoàn toàn MỚI LẠ, ĐỘC ĐÁO, KHÔNG TRÙNG LẶP (Seed: ${randomSeed}, timestamp: ${Date.now()}) theo chuẩn hệ đào tạo: "${englishMode}".
Chủ đề: "${activeTopic}".

Yêu cầu chi tiết cho 6 từ vựng:
1. "word": Từ vựng hoặc cụm collocations/phrasal verbs chất lượng cao (IELTS Band 7.0-8.5, TOEIC 750-990, hoặc THPT nâng cao).
2. "partOfSpeech": Loại từ (noun, verb, adjective, adverb, idiom, collocation).
3. "ipa": Phiên âm IPA chuẩn quốc tế cho từ.
4. "meaning": Định nghĩa và nghĩa tiếng Việt tự nhiên, súc tích, chuẩn ngữ cảnh.
5. "example": Câu ví dụ tiếng Anh tự nhiên, học thuật và dễ liên tưởng.
6. "exampleTranslation": Bản dịch nghĩa tiếng Việt của câu ví dụ.
7. "level": Cấp độ (VD: "IELTS 8.0", "C1 Advanced", "TOEIC 850+", "THPT Nâng Cao").

Trả về ĐÚNG một mảng JSON gồm 6 đối tượng theo cấu trúc sau:`;

      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            ipa: { type: Type.STRING },
            meaning: { type: Type.STRING },
            example: { type: Type.STRING },
            exampleTranslation: { type: Type.STRING },
            level: { type: Type.STRING }
          },
          required: ['word', 'partOfSpeech', 'ipa', 'meaning', 'example', 'exampleTranslation', 'level']
        }
      };

      const data = await generateJSON(prompt, schema);
      
      if (Array.isArray(data) && data.length > 0) {
        setCards(data);
        setFlipped({});
        setAllFlipped(false);
        setHistorySets((prev) => [{ topic: activeTopic, cards: data }, ...prev]);
        setHistoryIndex(0);
      }
    } catch (e) {
      console.error('Lỗi khi tạo từ vựng:', e);
      alert('Không thể tạo bộ từ mới: ' + formatAIError(e));
    }
    setLoading(false);
  };

  // Tự động kích hoạt AI sinh bộ từ mới khi chuyển hệ đào tạo englishMode
  React.useEffect(() => {
    generateVocab();
  }, [englishMode]);

  // Lật hoặc úp tất cả thẻ cùng lúc
  const toggleFlipAll = () => {
    const newState = !allFlipped;
    setAllFlipped(newState);
    const newFlipped = {};
    cards.forEach((_, i) => {
      newFlipped[i] = newState;
    });
    setFlipped(newFlipped);
  };

  // Xem bộ từ trước đó trong lịch sử
  const handlePrevHistory = () => {
    if (historyIndex < historySets.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setCards(historySets[nextIdx].cards);
      setFlipped({});
      setAllFlipped(false);
    }
  };

  // Xem bộ từ mới hơn trong lịch sử
  const handleNextHistory = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setCards(historySets[nextIdx].cards);
      setFlipped({});
      setAllFlipped(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* THANH ĐIỀU KHIỂN & BỘ LỌC CHỦ ĐỀ CHO AI */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 bg-slate-900/80 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {englishMode} Vocabulary 3D
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                100% AI sinh theo thời gian thực
              </span>
            </div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Thẻ Ghi Nhớ Từ Vựng 3D Không Gian Chiều
            </h3>
          </div>

          {/* Cụm nút Lật tất cả & Đổi bộ từ khác */}
          <div className="flex flex-wrap items-center gap-2">
            {historySets.length > 1 && (
              <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700">
                <button
                  onClick={handlePrevHistory}
                  disabled={historyIndex >= historySets.length - 1}
                  title="Xem lại bộ từ AI đã tạo trước đó"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono px-2 text-slate-400">
                  Bộ {historySets.length - historyIndex}/{historySets.length}
                </span>
                <button
                  onClick={handleNextHistory}
                  disabled={historyIndex <= 0}
                  title="Chuyển đến bộ từ mới hơn"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={toggleFlipAll}
              title="Lật đồng loạt cả 6 thẻ để xem hoặc ôn tập"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95"
            >
              {allFlipped ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-cyan-400" />}
              <span>{allFlipped ? 'Úp Lại Mặt Trước' : 'Lật Tất Cả Thẻ'}</span>
            </button>

            <button
              onClick={() => generateVocab()}
              disabled={loading}
              title="AI tự động sáng tạo 6 từ vựng mới toanh theo chuẩn hệ đào tạo"
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Đang Soạn Bộ Từ Mới...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-4 h-4 text-yellow-300" />
                  <span>Đổi Bộ Từ Khác (AI)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ô NHẬP CHỦ ĐỀ TÙY CHỌN */}
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') generateVocab();
            }}
            placeholder={`Nhập chủ đề tùy ý (VD: Artificial Intelligence, Job Interview, Climate Change, Food & Dining...)`}
            className="flex-1 bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all placeholder:text-slate-500"
          />
          <button
            onClick={() => generateVocab()}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 rounded-xl text-xs font-bold active:scale-95 transition-all shrink-0"
          >
            Tạo Theo Chủ Đề Này
          </button>
        </div>

        {/* CÁC CHỦ ĐỀ GỢI Ý NHANH (QUICK CHIPS) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
            Gợi ý nhanh:
          </span>
          {VOCAB_TOPIC_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setSelectedPreset(p);
                setTopic(p === 'Ngẫu nhiên' ? '' : p);
                generateVocab(p === 'Ngẫu nhiên' ? null : p);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedPreset === p
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KHUNG HIỂN THỊ CÁC THẺ 3D FLIP */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="h-64 rounded-3xl glass-panel border border-slate-800 p-6 flex flex-col justify-between animate-pulse bg-slate-900/60">
              <div className="flex justify-between items-center">
                <div className="h-4 w-16 bg-slate-800 rounded-full" />
                <div className="h-6 w-20 bg-slate-800 rounded-lg" />
              </div>
              <div className="space-y-2 text-center my-auto">
                <div className="h-8 w-36 bg-slate-800 rounded-xl mx-auto" />
                <div className="h-4 w-24 bg-slate-800/60 rounded-lg mx-auto" />
              </div>
              <div className="h-3 w-40 bg-slate-800/50 rounded-full mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <div
              key={i}
              onClick={() => setFlipped({ ...flipped, [i]: !flipped[i] })}
              className="h-64 perspective-1000 cursor-pointer select-none group"
            >
              <div
                className={`relative w-full h-full transform-style-3d transition-transform duration-500 rounded-3xl ${
                  flipped[i] ? 'rotate-y-180' : ''
                }`}
              >
                {/* MẶT TRƯỚC THẺ: TỪ VỰNG, IPA, LOẠI TỪ, PHÁT ÂM */}
                <div className="absolute inset-0 glass-panel rounded-3xl p-6 backface-hidden flex flex-col justify-between border border-emerald-500/25 bg-slate-900/80 shadow-lg group-hover:border-emerald-500/50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        {c.level || englishMode}
                      </span>
                      {c.partOfSpeech && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium italic border border-slate-700">
                          {c.partOfSpeech}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(c.word);
                      }}
                      title="Phát âm từ vựng"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 text-xs font-bold flex items-center gap-1 border border-slate-700 shadow transition-all"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Nghe</span>
                    </button>
                  </div>

                  <div className="text-center my-auto space-y-1.5">
                    <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide group-hover:text-cyan-200 transition-colors">
                      {c.word}
                    </h3>
                    <p className="text-xs font-mono text-cyan-400/90 tracking-wider">
                      {c.ipa}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-slate-400">#Thẻ {i + 1}</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      👆 Bấm để lật xem nghĩa
                    </span>
                  </div>
                </div>

                {/* MẶT SAU THẺ: NGHĨA TIẾNG VIỆT, VÍ DỤ, BẢN DỊCH VÍ DỤ, PHÁT ÂM CÂU */}
                <div className="absolute inset-0 glass-panel rounded-3xl p-6 backface-hidden rotate-y-180 flex flex-col justify-between bg-gradient-to-br from-indigo-950/90 via-slate-900/95 to-slate-950 border border-indigo-400/40 shadow-xl">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
                        Ý nghĩa
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(c.example);
                        }}
                        title="Nghe phát âm cả câu ví dụ"
                        className="px-2 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 text-[10px] font-semibold flex items-center gap-1 border border-indigo-700/60 transition-all active:scale-95"
                      >
                        <Volume2 className="w-3 h-3 text-cyan-300" />
                        <span>Nghe ví dụ</span>
                      </button>
                    </div>
                    <p className="text-base font-bold text-emerald-300 leading-snug">
                      {c.meaning}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-indigo-950 space-y-1">
                    <p className="text-xs text-slate-200 italic leading-relaxed">
                      "{c.example}"
                    </p>
                    {c.exampleTranslation && (
                      <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-1">
                        → {c.exampleTranslation}
                      </p>
                    )}
                  </div>

                  <p className="text-[10px] text-center text-slate-400 pt-1">
                    👆 Bấm để lật lại mặt trước
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 11. AI CHẤM ĐIỂM VIẾT (WRITING)
export function WritingGraderView({ englishMode }) {
  const [essay, setEssay] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const gradeEssay = async () => {
    if (!essay.trim()) return;
    setLoading(true);
    try {
      const res = await generateText(
        `Chế độ thi: ${englishMode} Writing.\nBài viết của học viên:\n${essay}`,
        ENGLISH_WRITING_SYSTEM_INSTRUCTION,
        null,
        'deep'
      );
      setResult(res);
    } catch (e) {
      setResult('⚠️ ' + formatAIError(e));
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">✍️ AI Chấm Điểm Writing ({englishMode})</h2>
        <textarea
          rows={10}
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder="Dán bài luận IELTS Writing Task 1/2, Email TOEIC hoặc đoạn văn tiếng Anh vào đây..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm"
        />
        <button onClick={gradeEssay} disabled={loading} className="w-full py-3 bg-emerald-600 rounded-xl font-bold">
          {loading ? 'Đang chấm bài...' : 'Chấm Điểm & Sửa Bài Chi Tiết'}
        </button>
      </div>
      <div className="glass-panel rounded-2xl p-6 overflow-y-auto max-h-[75vh]">
        <h3 className="font-bold text-emerald-400 mb-3">Báo Cáo Chấm Điểm Từ Giám Khảo AI:</h3>
        {result && <div className="prose prose-invert text-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(result) }} />}
      </div>
    </div>
  );
}

// 12. GIẢI THÍCH NGỮ PHÁP
export function GrammarView({ englishMode }) {
  const [query, setQuery] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const explainGrammar = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await generateText(
        `Chủ điểm ngữ pháp / câu cần phân tích (${englishMode}):\n${query}`,
        ENGLISH_GRAMMAR_SYSTEM_INSTRUCTION
      );
      setExplanation(res);
    } catch (e) {
      setExplanation('⚠️ ' + formatAIError(e));
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">✨ Giải Thích Ngữ Pháp Chuyên Sâu ({englishMode})</h2>
        <textarea
          rows={6}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập cấu trúc ngữ pháp (VD: Đảo ngữ, Mệnh đề quan hệ rút gọn) hoặc câu tiếng Anh bất kỳ..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm"
        />
        <button onClick={explainGrammar} disabled={loading} className="w-full py-3 bg-emerald-600 rounded-xl font-bold">
          {loading ? 'Đang phân tích...' : 'Phân Tích Ngữ Pháp'}
        </button>
      </div>
      <div className="glass-panel rounded-2xl p-6 overflow-y-auto max-h-[75vh]">
        <h3 className="font-bold text-emerald-400 mb-3">Bài Giảng Ngữ Pháp AI:</h3>
        {explanation && <div className="prose prose-invert text-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(explanation) }} />}
      </div>
    </div>
  );
}