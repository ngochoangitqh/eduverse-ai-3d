import {
  saveCollectiveInsightToCloud,
  getCollectiveInsightsFromCloud,
  getCurrentUser
} from './firebaseService';
import { generateText } from './geminiService';

const LOCAL_INSIGHTS_KEY = 'EDUVERSE_COLLECTIVE_INSIGHTS_V1';

/**
 * ====================================================
 * 1. BỘ TRI THỨC CỘNG ĐỒNG BAN ĐẦU (SEED WISDOM)
 * Các bẫy đề thi & mẹo giải nhanh tích lũy từ kinh nghiệm giảng dạy
 * ====================================================
 */
export const SEED_COLLECTIVE_INSIGHTS = [
  {
    id: 'seed_math_1',
    subject: 'Toán Học',
    topic: 'Cực trị hàm số',
    insight: 'Học sinh hay quên: Nếu x0 là nghiệm của f\'(x)=0 nhưng là nghiệm bội chẵn thì f\'(x) không đổi dấu qua x0 => x0 KHÔNG PHẢI là điểm cực trị!',
    createdAt: Date.now() - 86400000,
    author: 'Cộng đồng EduVerse'
  },
  {
    id: 'seed_math_2',
    subject: 'Toán Học',
    topic: 'Đường tiệm cận',
    insight: 'Bẫy tiệm cận đứng phân thức hữu tỉ: Phải phân tích tử và mẫu thành nhân tử để triệt tiêu nghiệm chung trước khi kết luận nghiệm của mẫu là tiệm cận đứng.',
    createdAt: Date.now() - 80000000,
    author: 'Cộng đồng EduVerse'
  },
  {
    id: 'seed_phys_1',
    subject: 'Vật Lý',
    topic: 'Con lắc lò xo',
    insight: 'Lỗi sai đơn vị: Trước khi tính động năng, thế năng W = 0.5*k*x^2 hay cơ năng, BẮT BUỘC đổi li độ x và độ dãn lò xo delta_l ra đơn vị mét (m), khối lượng ra kg!',
    createdAt: Date.now() - 72000000,
    author: 'Cộng đồng EduVerse'
  },
  {
    id: 'seed_phys_2',
    subject: 'Vật Lý',
    topic: 'Năng lượng dao động',
    insight: 'Chu kỳ và tần số năng lượng: Động năng và thế năng biến thiên tuần hoàn với tần số góc omega\' = 2*omega, tần số f\' = 2*f và chu kỳ T\' = T/2.',
    createdAt: Date.now() - 65000000,
    author: 'Cộng đồng EduVerse'
  },
  {
    id: 'seed_chem_1',
    subject: 'Hóa Học',
    topic: 'Este của phenol',
    insight: 'Bẫy xà phòng hóa: Este của phenol (ví dụ CH3COOC6H5) tác dụng với NaOH theo tỉ lệ mol 1:2 và sinh ra 2 muối + H2O, không sinh ra ancol!',
    createdAt: Date.now() - 50000000,
    author: 'Cộng đồng EduVerse'
  },
  {
    id: 'seed_chem_2',
    subject: 'Hóa Học',
    topic: 'Chất béo & Dầu mỡ',
    insight: 'Phân biệt thuật ngữ: Dầu ăn (dầu thực vật, mỡ lợn) là chất béo trieste, còn dầu mỡ bôi trơn máy móc là hỗn hợp hiđrocacbon.',
    createdAt: Date.now() - 40000000,
    author: 'Cộng đồng EduVerse'
  },
  {
    id: 'seed_eng_1',
    subject: 'Tiếng Anh',
    topic: 'Used to vs Be used to',
    insight: 'Bẫy ngữ pháp: "Used to + V_infinitive" chỉ thói quen trong quá khứ nay không còn, còn "Be/Get used to + V_ing" diễn tả việc đã quen với cái gì ở hiện tại.',
    createdAt: Date.now() - 30000000,
    author: 'Cộng đồng EduVerse'
  }
];

/**
 * ====================================================
 * 2. LẤY DANH SÁCH BÀI HỌC CỘNG ĐỒNG ĐÃ HỌC HỎI
 * ====================================================
 */
export function getStoredCollectiveInsights() {
  try {
    const raw = localStorage.getItem(LOCAL_INSIGHTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Lỗi đọc collective insights:', e);
  }
  return SEED_COLLECTIVE_INSIGHTS;
}

export function saveStoredCollectiveInsights(insights) {
  try {
    localStorage.setItem(LOCAL_INSIGHTS_KEY, JSON.stringify(insights));
  } catch (e) {
    console.error('Lỗi lưu collective insights:', e);
  }
}

/**
 * Đồng bộ bài học từ Cloud Firestore về máy
 */
export async function syncCollectiveInsightsFromCloud() {
  try {
    const cloudInsights = await getCollectiveInsightsFromCloud(50);
    if (cloudInsights && cloudInsights.length > 0) {
      const local = getStoredCollectiveInsights();
      // Ghép và lọc trùng lặp theo insight text
      const map = new Map();
      [...cloudInsights, ...local].forEach((item) => {
        const key = item.insight?.trim().toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, item);
        }
      });
      const merged = Array.from(map.values());
      saveStoredCollectiveInsights(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Chưa thể lấy collective insights từ Cloud (dùng local cache):', err);
  }
  return getStoredCollectiveInsights();
}

/**
 * ====================================================
 * 3. HỌC HỎI VÀ CHẮT LỌC TRÍ TUỆ TỪ CÂU HỎI HỌC SINH
 * An toàn, ẩn danh 100%, chỉ rút ra mẹo sư phạm
 * ====================================================
 */
export async function distillInsightFromConversation(userQuestion, aiAnswer, subject = 'Tổng hợp') {
  if (!userQuestion || userQuestion.length < 15 || !aiAnswer) return null;

  try {
    const prompt = `Bạn là hệ thống Trí tuệ Cộng hưởng (Collective Learning Engine) của EduVerse AI.
Nhiệm vụ của bạn là phân tích đoạn đối thoại học tập dưới đây giữa học sinh và AI để rút ra 1 BÀI HỌC / MẸO GIẢI / CẢNH BÁO BẪY ĐỀ THI quan trọng nhất mà các học sinh khác cũng có thể mắc phải:

- Câu hỏi học sinh: "${userQuestion.slice(0, 500)}"
- Lời giải AI: "${aiAnswer.slice(0, 1000)}"

YÊU CẦU ĐẦU RA:
- Nếu đoạn trao đổi này chứa một kiến thức trọng tâm, bẫy đề thi hay mẹo giải hữu ích, hãy tóm tắt đúng 1-2 câu ngắn gọn, súc tích (bắt đầu bằng tên bẫy hoặc mẹo).
- Tuyệt đối KHÔNG chứa thông tin cá nhân của học sinh.
- Nếu câu hỏi chỉ là chào hỏi bình thường hoặc không có giá trị học thuật, hãy trả về từ chối: "NONE".

Ví dụ đầu ra chuẩn:
Chủ đề: Đạo hàm
Mẹo: Học sinh hay nhầm đạo hàm của hàm hợp căn u: (căn u)' = u' / (2*căn u), thường quên nhân thêm u'.`;

    const result = await generateText(prompt);
    if (!result || result.includes('NONE') || result.length < 20) return null;

    const newInsight = {
      id: 'insight_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      subject: subject || 'Tổng hợp',
      topic: extractTopicFromText(result) || 'Kiến thức trọng tâm',
      insight: result.replace(/^(Chủ đề:.*?(\n|$)|Mẹo:\s*)/gi, '').trim(),
      createdAt: Date.now(),
      author: 'Ẩn danh (Học hỏi tự động)',
    };

    // Lưu vào local cache
    const current = getStoredCollectiveInsights();
    const updated = [newInsight, ...current.slice(0, 99)];
    saveStoredCollectiveInsights(updated);

    // Đồng bộ lên Cloud Firestore để chia sẻ cho tất cả học sinh
    try {
      await saveCollectiveInsightToCloud(newInsight);
    } catch (e) {
      console.warn('Lưu insight lên Cloud bị hoãn:', e);
    }

    return newInsight;
  } catch (err) {
    console.warn('Lỗi chắt lọc tri thức cộng đồng:', err);
    return null;
  }
}

/**
 * ====================================================
 * 4. TỔNG HỢP TRÍ TUỆ CỘNG ĐỒNG VÀO HỆ THỐNG PROMPT
 * Giúp AI thông minh hơn trong mọi cuộc trò chuyện
 * ====================================================
 */
export function getCollectiveWisdomPrompt(maxInsights = 8) {
  const insights = getStoredCollectiveInsights();
  if (!insights || insights.length === 0) return '';

  const selected = insights.slice(0, maxInsights);

  let text = '\n\n=== 🧠 TRÍ TUỆ CỘNG HƯỞNG TÍCH LŨY (COLLECTIVE WISDOM FROM ALL STUDENTS) ===\n';
  text += 'Dưới đây là các bài học, lỗi sai phổ biến và mẹo giải nhanh AI đã học hỏi và tổng hợp từ toàn bộ cộng đồng học sinh:\n';

  selected.forEach((item, idx) => {
    text += `${idx + 1}. [${item.subject} - ${item.topic}]: ${item.insight}\n`;
  });

  text += 'HÃY VẬN DỤNG CÁC KINH NGHIỆM ĐÃ HỌC TRÊN ĐỂ: Bắt đúng tâm lý học sinh, cảnh báo trước các bẫy đề thi và cung cấp phương pháp giải tối ưu nhất!\n';

  return text;
}

function extractTopicFromText(text) {
  const match = text.match(/Chủ đề:\s*([^\n\r.]+)/i);
  return match ? match[1].trim() : '';
}
