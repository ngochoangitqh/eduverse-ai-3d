import React, { useState } from 'react';
import { Type } from '@google/genai';
import { renderMarkdownWithMath } from '../../utils/mathRenderer';
import { generateText, generateJSON, formatAIError } from '../../services/geminiService';
import { ENGLISH_SPEAKING_SYSTEM_INSTRUCTION, ENGLISH_WRITING_SYSTEM_INSTRUCTION, ENGLISH_GRAMMAR_SYSTEM_INSTRUCTION } from '../../config/systemInstructions';
import { speakText, createSpeechRecognizer } from '../../services/speechService';

import { 
  Sparkles, RotateCw, Volume2, Mic, Shuffle, Languages, CheckCircle2, 
  Target, Award, Volume1, ArrowRight, Loader2, BookOpen
} from 'lucide-react';

// Ngân hàng câu luyện phát âm tuyển chọn theo hệ đào tạo
const PRACTICE_SENTENCE_BANKS = {
  'IELTS': [
    {
      sentence: 'Artificial intelligence is transforming modern education and scientific research around the world.',
      ipa: '/ˌɑːtɪˈfɪʃl ɪnˈtelɪdʒəns ɪz trænsˈfɔːmɪŋ ˈmɒdn ˌedʒuˈkeɪʃn ənd ˌsaɪənˈtɪfɪk rɪˈsɜːtʃ əˈraʊnd ðə wɜːld/',
      translation: 'Trí tuệ nhân tạo đang biến đổi nền giáo dục hiện đại và nghiên cứu khoa học trên toàn thế giới.',
      topic: 'Technology & Science',
      focusSound: 'Liên kết âm & trọng âm từ đa âm tiết',
      level: 'IELTS Band 7.5+'
    },
    {
      sentence: 'The government should implement stringent environmental regulations to mitigate carbon emissions.',
      ipa: '/ðə ˈɡʌvənmənt ʃʊd ˈɪmplɪment ˈstrɪndʒənt ɪnˌvaɪrənˈmentl ˌreɡjuˈleɪʃnz tu ˈmɪtɪɡeɪt ˈkɑːbən ɪˈmɪʃnz/',
      translation: 'Chính phủ nên thực thi các quy định môi trường nghiêm ngặt để giảm thiểu lượng khí thải carbon.',
      topic: 'Environment',
      focusSound: 'Âm /str/, /dʒ/ và kết thúc /-ʃnz/',
      level: 'IELTS Band 8.0+'
    },
    {
      sentence: 'Technological advancements have undeniably enhanced human connectivity and global collaboration.',
      ipa: '/ˌteknəˈlɒdʒɪkl ədˈvɑːnsmənts hæv ˌʌndɪˈnaɪəbli ɪnˈhɑːnst ˈhjuːmən kəˌnekˈtɪvəti ənd ˈɡləʊbl kəˌlæbəˈreɪʃn/',
      translation: 'Những tiến bộ công nghệ rõ ràng đã tăng cường sự kết nối giữa con người và hợp tác toàn cầu.',
      topic: 'Society & Tech',
      focusSound: 'Trọng âm từ rơi vào âm tiết thứ 3 và 4',
      level: 'IELTS Band 7.5+'
    },
    {
      sentence: 'Preserving cultural heritage plays an indispensable role in maintaining national identity.',
      ipa: '/prɪˈzɜːvɪŋ ˈkʌltʃərəl ˈherɪtɪdʒ pleɪz ən ˌɪndɪˈspensəbl rəʊl ɪn meɪnˈteɪnɪŋ ˈnæʃnəl aɪˈdentəti/',
      translation: 'Bảo tồn di sản văn hóa đóng vai trò không thể thiếu trong việc duy trì bản sắc dân tộc.',
      topic: 'Culture & Society',
      focusSound: 'Âm /tʃ/, /dʒ/ và nhịp điệu ngắt nghỉ theo cụm ngữ pháp',
      level: 'IELTS Band 8.0+'
    },
    {
      sentence: 'Rapid urbanization has led to severe traffic congestion and housing shortages in metropolitan areas.',
      ipa: '/ˈræpɪd ˌɜːbənaɪˈzeɪʃn hæz led tu sɪˈvɪə ˈtræfɪk kənˈdʒestʃən ənd ˈhaʊzɪŋ ˈʃɔːtɪdʒɪz ɪn ˌmetrəˈpɒlɪtən ˈeəriəz/',
      translation: 'Quá trình đô thị hóa nhanh chóng đã dẫn đến ùn tắc giao thông nghiêm trọng và khan hiếm nhà ở.',
      topic: 'Urban Planning',
      focusSound: 'Ending sounds /-z/, /-ɪz/ và nguyên âm đôi /eə/',
      level: 'IELTS Band 7.0+'
    },
    {
      sentence: 'Fostering critical thinking skills is paramount for students navigating the digital information age.',
      ipa: '/ˈfɒstərɪŋ ˈkrɪtɪkl ˈθɪŋkɪŋ skɪlz ɪz ˈpærəmaʊnt fɔː ˈstjuːdnts ˈnævɪɡeɪtɪŋ ðə ˈdɪdʒɪtl ˌɪnfəˈmeɪʃn eɪdʒ/',
      translation: 'Rèn luyện tư duy phản biện là tối quan trọng đối với học sinh tiếp cận kỷ nguyên thông tin số.',
      topic: 'Education',
      focusSound: 'Âm vô thanh /θ/ trong "thinking" và /ŋ/ ending',
      level: 'IELTS Band 7.5+'
    },
    {
      sentence: 'Renewable energy sources offer sustainable and cost-effective alternatives to fossil fuels.',
      ipa: '/rɪˈnjuːəbl ˈenədʒi ˈsɔːsɪz ˈɒfə səˈsteɪnəbl ənd kɒst ɪˈfektɪv ɔːlˈtɜːnətɪvz tu ˈfɒsl ˈfjuːəlz/',
      translation: 'Các nguồn năng lượng tái tạo mang lại giải pháp bền vững và tiết kiệm thay thế nhiên liệu hóa thạch.',
      topic: 'Energy & Climate',
      focusSound: 'Âm /s/ và /z/ phân biệt rõ ràng',
      level: 'IELTS Band 7.0+'
    }
  ],
  'TOEIC': [
    {
      sentence: 'Please make sure to submit your quarterly financial reports before Friday afternoon.',
      ipa: '/pliːz meɪk ʃʊə tu səbˈmɪt jɔː ˈkwɔːtəli faɪˈnænʃl rɪˈpɔːts bɪˈfɔː ˈfraɪdeɪ ˌɑːftəˈnuːn/',
      translation: 'Vui lòng đảm bảo nộp các báo cáo tài chính hàng quý trước chiều thứ Sáu.',
      topic: 'Office & Deadlines',
      focusSound: 'Ending sound /-ts/ và nối âm "make sure"',
      level: 'TOEIC 750+'
    },
    {
      sentence: 'The annual shareholder meeting has been rescheduled to conference room three on the fifth floor.',
      ipa: '/ði ˈænjuəl ˈʃeəhəʊldə ˈmiːtɪŋ hæz biːn ˌriːˈʃedjuːld tu ˈkɒnfərəns ruːm θriː ɒn ðə fɪfθ flɔː/',
      translation: 'Cuộc họp cổ đông thường niên đã được dời lịch sang phòng hội nghị số 3 ở tầng năm.',
      topic: 'Corporate Meetings',
      focusSound: 'Âm /θ/ trong "three", "fifth" và /ð/ trong "the"',
      level: 'TOEIC 850+'
    },
    {
      sentence: 'Our customer support team is committed to resolving all client inquiries within twenty-four hours.',
      ipa: '/ˈaʊə ˈkʌstəmə səˈpɔːt tiːm ɪz kəˈmɪtɪd tu rɪˈzɒlvɪŋ ɔːl ˈklaɪənt ɪnˈkwaɪəriz wɪˈðɪn ˈtwenti fɔːr ˈaʊəz/',
      translation: 'Đội ngũ hỗ trợ khách hàng cam kết giải quyết mọi thắc mắc của khách hàng trong vòng 24 giờ.',
      topic: 'Customer Service',
      focusSound: 'Âm đuôi /-ɪd/ trong "committed" và /-z/ trong "inquiries"',
      level: 'TOEIC 800+'
    },
    {
      sentence: 'Due to severe weather conditions, all departing flights from terminal two have been temporarily suspended.',
      ipa: '/djuː tu sɪˈvɪə ˈweðə kənˈdɪʃnz, ɔːl dɪˈpɑːtɪŋ flaɪts frɒm ˈtɜːmɪnl tuː hæv biːn ˈtemprərəli səˈspendɪd/',
      translation: 'Do thời tiết xấu, tất cả chuyến bay khởi hành từ nhà ga số 2 tạm thời bị hoãn.',
      topic: 'Airport & Travel',
      focusSound: 'Âm /ð/ trong "weather" và ngắt cụm chuẩn',
      level: 'TOEIC 800+'
    },
    {
      sentence: 'We are launching a comprehensive marketing campaign to promote our newest product line across Asia.',
      ipa: '/wi ɑː ˈlɔːntʃɪŋ ə ˌkɒmprɪˈhensɪv ˈmɑːkɪtɪŋ kæmˈpeɪn tu prəˈməʊt ˈaʊə ˈnjuːɪst ˈprɒdʌkt laɪn əˈkrɒs ˈeɪʒə/',
      translation: 'Chúng tôi đang triển khai chiến dịch tiếp thị toàn diện để quảng bá dòng sản phẩm mới tại châu Á.',
      topic: 'Marketing & Sales',
      focusSound: 'Trọng âm từ "campaign", "comprehensive"',
      level: 'TOEIC 850+'
    },
    {
      sentence: 'Please review the attached contract carefully before signing and returning it to human resources.',
      ipa: '/pliːz rɪˈvjuː ði əˈtætʃt ˈkɒntrækt ˈkeəfəli bɪˈfɔː ˈsaɪnɪŋ ənd rɪˈtɜːnɪŋ ɪt tu ˈhjuːmən rɪˈzɔːsɪz/',
      translation: 'Vui lòng xem kỹ hợp đồng đính kèm trước khi ký và gửi lại cho phòng nhân sự.',
      topic: 'Contracts & HR',
      focusSound: 'Âm kết thúc /-t/ trong "attached" (/əˈtætʃt/)',
      level: 'TOEIC 750+'
    }
  ],
  'Tiếng Anh Phổ Thông': [
    {
      sentence: 'Learning a foreign language opens up incredible opportunities for your future education and career.',
      ipa: '/ˈlɜːnɪŋ ə ˈfɒrən ˈlæŋɡwɪdʒ ˈəʊpənz ʌp ɪnˈkredəbl ˌɒpəˈtjuːnətiz fɔː jɔː ˈfjuːtʃər ˌedʒuˈkeɪʃn ənd kəˈrɪə/',
      translation: 'Học một ngoại ngữ mở ra những cơ hội tuyệt vời cho việc học tập và sự nghiệp tương lai.',
      topic: 'Học tập & Tương lai',
      focusSound: 'Nối âm "opens up" và âm /dʒ/ trong "language"',
      level: 'THPT / B1-B2'
    },
    {
      sentence: 'If I had more free time this weekend, I would definitely join the school volunteer activities.',
      ipa: '/ɪf aɪ hæd mɔː friː taɪm ðɪs ˌwiːkˈend, aɪ wʊd ˈdefɪnətli dʒɔɪn ðə skuːl ˌvɒlənˈtɪər ækˈtɪvətiz/',
      translation: 'Nếu có nhiều thời gian rảnh cuối tuần này, tôi chắc chắn sẽ tham gia các hoạt động tình nguyện của trường.',
      topic: 'Trường học & Tình nguyện',
      focusSound: 'Nhịp điệu câu điều kiện loại 2 & âm /v/ trong "volunteer"',
      level: 'THCS - THPT'
    },
    {
      sentence: 'Regular physical exercise and healthy eating habits are essential for maintaining your well-being.',
      ipa: '/ˈreɡjələ ˈfɪzɪkl ˈeksəsaɪz ənd ˈhelθi ˈiːtɪŋ ˈhæbɪts ɑːr ɪˈsenʃl fɔː meɪnˈteɪnɪŋ jɔː welˈbiːɪŋ/',
      translation: 'Tập thể dục đều đặn và thói quen ăn uống lành mạnh là rất cần thiết để duy trì sức khỏe.',
      topic: 'Sức khỏe & Đời sống',
      focusSound: 'Âm /θ/ trong "healthy" và /z/ trong "exercise"',
      level: 'THPT / B1'
    },
    {
      sentence: 'My teacher always encourages us to speak English confidently without worrying about making mistakes.',
      ipa: '/maɪ ˈtiːtʃər ˈɔːlweɪz ɪnˈkʌrɪdʒɪz ʌs tu spiːk ˈɪŋɡlɪʃ ˈkɒnfɪdəntli wɪˈðaʊt ˈwʌriɪŋ əˈbaʊt ˈmeɪkɪŋ mɪˈsteɪks/',
      translation: 'Thầy cô luôn động viên chúng tôi tự tin nói tiếng Anh mà không cần sợ mắc lỗi sai.',
      topic: 'Giao tiếp hàng ngày',
      focusSound: 'Ending sound /-ɪz/ trong "encourages"',
      level: 'THCS - THPT'
    },
    {
      sentence: 'We should protect our local environment by reducing single-use plastic and recycling paper.',
      ipa: '/wi ʃʊd prəˈtekt ˈaʊə ˈləʊkl ɪnˈvaɪrənmənt baɪ rɪˈdjuːsɪŋ ˈsɪŋɡl juːs ˈplæstɪk ənd ˌriːˈsaɪklɪŋ ˈpeɪpə/',
      translation: 'Chúng ta nên bảo vệ môi trường địa phương bằng cách giảm rác nhựa dùng một lần và tái chế giấy.',
      topic: 'Môi trường sống',
      focusSound: 'Âm /ʃ/ trong "should" và /kl/ trong "plastic", "recycling"',
      level: 'THCS - THPT'
    }
  ]
};

// 9. AI CHẤM ĐIỂM PHÁT ÂM NÂNG CAO VỚI BỘ TẠO CÂU THÔNG MINH
export function SpeakingCoachView({ englishMode }) {
  // Lấy danh sách câu ban đầu theo chế độ
  const currentModeBank = PRACTICE_SENTENCE_BANKS[englishMode] || PRACTICE_SENTENCE_BANKS['IELTS'];
  
  const [sentencePool, setSentencePool] = useState(currentModeBank);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetSentence, setTargetSentence] = useState(currentModeBank[0].sentence);
  const [currentMeta, setCurrentMeta] = useState(currentModeBank[0]);
  
  const [spokenText, setSpokenText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('Tất cả');
  const [audioSpeed, setAudioSpeed] = useState(0.95);
  const [showTranslation, setShowTranslation] = useState(true);

  // Khi người dùng chuyển englishMode ở thanh tiêu đề, cập nhật lại ngân hàng câu
  React.useEffect(() => {
    const bank = PRACTICE_SENTENCE_BANKS[englishMode] || PRACTICE_SENTENCE_BANKS['IELTS'];
    setSentencePool(bank);
    setCurrentIndex(0);
    setTargetSentence(bank[0].sentence);
    setCurrentMeta(bank[0]);
    setSpokenText('');
    setFeedback('');
  }, [englishMode]);

  // Đổi sang câu khác trong ngân hàng
  const handleNextSentence = () => {
    const nextIdx = (currentIndex + 1) % sentencePool.length;
    setCurrentIndex(nextIdx);
    const nextItem = sentencePool[nextIdx];
    setTargetSentence(nextItem.sentence);
    setCurrentMeta(nextItem);
    setSpokenText('');
    setFeedback('');
  };

  // Chọn câu ngẫu nhiên
  const handleRandomSentence = () => {
    if (sentencePool.length <= 1) return;
    let randIdx = currentIndex;
    while (randIdx === currentIndex) {
      randIdx = Math.floor(Math.random() * sentencePool.length);
    }
    setCurrentIndex(randIdx);
    const nextItem = sentencePool[randIdx];
    setTargetSentence(nextItem.sentence);
    setCurrentMeta(nextItem);
    setSpokenText('');
    setFeedback('');
  };

  // AI Tự tạo câu mẫu mới theo ngữ cảnh
  const handleGenerateAISentence = async () => {
    setIsGeneratingAI(true);
    try {
      const topicPrompt = selectedTopic !== 'Tất cả' ? `thuộc chủ đề "${selectedTopic}"` : 'thuộc chủ đề phong phú, mang tính thực tế cao';
      const prompt = `Bạn là chuyên gia ngôn ngữ tiếng Anh. Hãy tạo 1 câu tiếng Anh chất lượng cao để người học luyện phát âm và ngữ điệu theo chuẩn hệ đào tạo "${englishMode}" (${topicPrompt}).
Yêu cầu câu có độ dài từ 10 đến 18 từ, có tính ứng dụng cao, từ vựng tự nhiên.
Hãy trả về JSON theo đúng định dạng sau:
{
  "sentence": "câu tiếng Anh hoàn chỉnh",
  "ipa": "/phiên âm IPA chuẩn quốc tế cho cả câu/",
  "translation": "Bản dịch nghĩa tiếng Việt tự nhiên, súc tích",
  "topic": "Tên chủ đề ngắn gọn",
  "focusSound": "Chỉ ra 1-2 trọng âm hoặc âm tiết người Việt hay phát âm sai cần chú ý (VD: ending /s/, âm /θ/, nuốt âm)",
  "level": "Cấp độ đánh giá (VD: IELTS 7.5+, TOEIC 850+, B2-C1)"
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
        required: ['sentence', 'ipa', 'translation', 'topic', 'focusSound']
      };

      const newSentenceObj = await generateJSON(prompt, schema);
      
      // Thêm câu mới vào danh sách và đặt làm câu hiện tại
      setSentencePool((prev) => [newSentenceObj, ...prev]);
      setCurrentIndex(0);
      setTargetSentence(newSentenceObj.sentence);
      setCurrentMeta(newSentenceObj);
      setSpokenText('');
      setFeedback('');
    } catch (error) {
      console.error('Lỗi khi tạo câu phát âm AI:', error);
      alert('Không thể tạo câu mới: ' + formatAIError(error));
    } finally {
      setIsGeneratingAI(false);
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
Chủ đề: ${currentMeta?.topic || 'General'}.
Câu mẫu chuẩn: "${targetSentence}"
Phiên âm IPA chuẩn: "${currentMeta?.ipa || ''}"
Người học đọc được nhận diện qua microphone là: "${spokenText}".
Điểm ngữ âm cần chú ý của câu: ${currentMeta?.focusSound || 'Trọng âm và ending sounds'}.

Hãy đánh giá phát âm chi tiết, cấu trúc chấm điểm:
1. Độ chính xác tổng thể (thang điểm 100%) và nhận xét động viên.
2. So sánh từ người học đọc đúng vs từ phát âm chưa rõ / nuốt âm / sai ending sound.
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
            {currentMeta?.level && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                {currentMeta.level}
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">
              Câu {currentIndex + 1}/{sentencePool.length}
            </span>
          </div>

          {/* CÁC NÚT ĐỔI CÂU & TẠO CÂU AI */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleNextSentence}
              title="Đổi sang câu tiếp theo trong ngân hàng"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-slate-700"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Đổi câu khác</span>
            </button>

            <button
              onClick={handleRandomSentence}
              title="Chọn ngẫu nhiên một câu"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all active:scale-95 border border-slate-700"
            >
              <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
            </button>

            <button
              onClick={handleGenerateAISentence}
              disabled={isGeneratingAI}
              title="AI tự động tạo một câu luyện đọc mới theo chủ đề"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-60"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI Đang Soạn Câu...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>AI Tạo Câu Mới</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* THÔNG TIN CHỦ ĐỀ & TIÊU ĐIỂM NGỮ ÂM */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>Chủ đề: <strong className="text-cyan-300">{currentMeta?.topic || 'Tổng hợp'}</strong></span>
          </div>
          {currentMeta?.focusSound && (
            <div className="text-amber-300/90 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20 font-medium">
              ⚡ Chú ý: {currentMeta.focusSound}
            </div>
          )}
        </div>

        {/* KHUNG CÂU MẪU (CHO PHÉP CHỈNH SỬA TÙY Ý HOẶC TỰ NHẬP) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300">Câu mẫu luyện đọc:</span>
            <span className="text-[11px] text-slate-400 italic">(Có thể tự gõ hoặc chỉnh sửa trực tiếp)</span>
          </div>
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
        </div>

        {/* PHIÊN ÂM IPA VÀ BẢN DỊCH NGHĨA */}
        {currentMeta?.ipa && (
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] shrink-0 uppercase tracking-wider">
                IPA
              </span>
              <p className="font-mono text-cyan-400/90 leading-relaxed tracking-wide select-all">
                {currentMeta.ipa}
              </p>
            </div>
            
            {currentMeta.translation && (
              <div className="flex items-start gap-2 pt-2 border-t border-slate-800/80">
                <button 
                  onClick={() => setShowTranslation(!showTranslation)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] shrink-0 transition-colors"
                >
                  {showTranslation ? 'Ẩn nghĩa' : 'Hiện nghĩa'}
                </button>
                {showTranslation && (
                  <p className="text-slate-300 italic">
                    "{currentMeta.translation}"
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
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-700 shadow"
            >
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>Nghe Câu Mẫu</span>
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
            className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
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
                Bấm <strong>"Đổi câu khác"</strong> hoặc <strong>"AI Tạo Câu Mới"</strong>, sau đó nhấn <strong>"Bấm Để Đọc"</strong> để AI lắng nghe và chỉ ra khẩu hình chuẩn nhé.
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