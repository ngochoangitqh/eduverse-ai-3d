import React, { useState } from 'react';
import { Type } from '@google/genai';
import { renderMarkdownWithMath } from '../../utils/mathRenderer';
import { generateText, generateJSON, formatAIError } from '../../services/geminiService';
import { ENGLISH_SPEAKING_SYSTEM_INSTRUCTION, ENGLISH_WRITING_SYSTEM_INSTRUCTION, ENGLISH_GRAMMAR_SYSTEM_INSTRUCTION } from '../../config/systemInstructions';
import { speakText, createSpeechRecognizer } from '../../services/speechService';

import { 
  Sparkles, RotateCw, Volume2, Mic, Languages, CheckCircle2, 
  Target, Award, Volume1, ArrowRight, Loader2, BookOpen, History,
  ChevronLeft, ChevronRight, SlidersHorizontal
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

// 10. TỪ VỰNG 3D THEO CHỦ ĐỀ
export function Vocab3DView({ englishMode }) {
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState({});
  const [loading, setLoading] = useState(false);

  const generateVocab = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            ipa: { type: Type.STRING },
            meaning: { type: Type.STRING },
            example: { type: Type.STRING }
          },
          required: ['word', 'ipa', 'meaning', 'example']
        }
      };
      const data = await generateJSON(
        `Tạo 6 từ vựng tiếng Anh chất lượng cao theo chuẩn ${englishMode} về chủ đề "${topic}".`,
        schema
      );
      setCards(data);
      setFlipped({});
    } catch (e) {
      alert(formatAIError(e));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 flex gap-4">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={`Nhập chủ đề từ vựng (${englishMode}) - VD: Environment, Technology, Business...`}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm"
        />
        <button onClick={generateVocab} disabled={loading} className="px-6 py-3 bg-emerald-600 rounded-xl font-bold text-sm">
          {loading ? 'Đang tạo Flashcard 3D...' : 'Tạo Flashcard 3D'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c, i) => (
          <div
            key={i}
            onClick={() => setFlipped({ ...flipped, [i]: !flipped[i] })}
            className="h-56 perspective-1000 cursor-pointer"
          >
            <div className={`relative w-full h-full transform-style-3d ${flipped[i] ? 'rotate-y-180' : ''}`}>
              <div className="absolute inset-0 glass-panel rounded-2xl p-6 backface-hidden flex flex-col justify-between border border-emerald-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-400 font-bold">{englishMode}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); speakText(c.word); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs"
                  >
                    🔊 Phát âm
                  </button>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white">{c.word}</h3>
                  <p className="text-sm text-cyan-400 mt-1">{c.ipa}</p>
                </div>
                <p className="text-[11px] text-center text-slate-400">👆 Bấm để lật thẻ 3D xem nghĩa</p>
              </div>

              <div className="absolute inset-0 glass-panel rounded-2xl p-6 backface-hidden rotate-y-180 flex flex-col justify-center bg-indigo-950/80 border border-indigo-400/40">
                <p className="text-lg font-bold text-emerald-300 mb-2">{c.meaning}</p>
                <p className="text-xs text-slate-200 italic">"{c.example}"</p>
              </div>
            </div>
          </div>
        ))}
      </div>
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