import {
  getCurrentUser
} from './firebaseService';
import { generateJSON, formatAIError } from './geminiService';
import { Type } from '@google/genai';

const LOCAL_PROFILE_KEY = 'EDUVERSE_STUDENT_PROFILE_V1';

export const DEFAULT_STUDENT_PROFILE = {
  nickname: 'Bạn học',
  grade: 'Lớp 12 (Ôn thi THPT)',
  targetGoal: 'Đạt điểm 9+ Đại học & Nâng cao tư duy logic',
  learningStyle: 'Dễ hiểu, có ví dụ đời thường, chỉ rõ bản chất và mẹo Casio',
  strengths: [
    'Tư duy hình học và logic tốt',
    'Chăm chỉ, sẵn sàng đào sâu bản chất bài học',
    'Tiếp thu nhanh với các ví dụ thực tế'
  ],
  weaknesses: [
    'Hay nhầm dấu khi biến đổi biểu thức nhanh',
    'Dễ quên điều kiện xác định của phương trình/bất phương trình',
    'Tiếng Anh phát âm hay nuốt ending sound /-s/, /-t/'
  ],
  notes: [
    'Thích được hướng dẫn từng bước gợi mở thay vì đưa ngay đáp số',
    'Đang tập trung ôn thi khối A00 / D01'
  ],
  autoInsights: [
    {
      id: 'insight_init',
      text: 'AI ghi nhận: Ưa chuộng phong cách giảng bài gần gũi, khích lệ và thực tế',
      timestamp: Date.now() - 3600000
    }
  ],
  adaptiveLearningEnabled: true,
  updatedAt: Date.now()
};

/**
 * Lấy storage key theo người dùng để bảo mật và riêng tư
 */
function getProfileStorageKey(user) {
  const current = user || getCurrentUser();
  return current?.uid ? `${LOCAL_PROFILE_KEY}_${current.uid}` : `${LOCAL_PROFILE_KEY}_guest`;
}

/**
 * Lấy hồ sơ học tập của học sinh
 */
export function getStudentProfile(user = null) {
  try {
    const key = getProfileStorageKey(user);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STUDENT_PROFILE, ...parsed };
    }
    // Nếu chưa có của user nhưng có của guest, tái sử dụng để không mất dữ liệu
    const guestRaw = localStorage.getItem(`${LOCAL_PROFILE_KEY}_guest`);
    if (guestRaw) {
      const guestParsed = JSON.parse(guestRaw);
      return { ...DEFAULT_STUDENT_PROFILE, ...guestParsed };
    }
  } catch (e) {
    console.error('Lỗi khi tải Student Profile:', e);
  }
  return { ...DEFAULT_STUDENT_PROFILE };
}

/**
 * Lưu hồ sơ học tập vào localStorage và sync Firebase
 */
export function saveStudentProfile(profile, user = null) {
  try {
    const key = getProfileStorageKey(user);
    const updated = {
      ...profile,
      updatedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(updated));
    // Lưu bản guest dự phòng
    if (!user?.uid && !getCurrentUser()?.uid) {
      localStorage.setItem(`${LOCAL_PROFILE_KEY}_guest`, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    console.error('Lỗi khi lưu Student Profile:', e);
    return profile;
  }
}

/**
 * Xây dựng đoạn Prompt ngữ cảnh cá nhân hóa để gắn vào System Instruction của AI
 */
export function buildStudentMemoryContext(user = null) {
  const profile = getStudentProfile(user);
  if (!profile.adaptiveLearningEnabled) {
    return ''; // Nếu người dùng tắt chế độ thích ứng cá nhân
  }

  const strengthsText = profile.strengths?.length > 0 ? profile.strengths.join('; ') : 'Chăm chỉ và có tinh thần tự học';
  const weaknessesText = profile.weaknesses?.length > 0 ? profile.weaknesses.join('; ') : 'Cần chú ý cẩn thận các bước tính toán';
  const notesText = profile.notes?.length > 0 ? profile.notes.join('; ') : 'Thích phong cách giảng dạy thân thiện';
  const autoInsightsText = profile.autoInsights?.slice(0, 3).map((ins) => ins.text).join('; ') || '';

  return `
### 🧠 BỘ NHỚ HỌC TẬP CÁ NHÂN HÓA (STUDENT MEMORY PROFILE):
- **Tên/Biệt danh học sinh**: "${profile.nickname || 'bạn'}"
- **Trình độ / Lớp học**: ${profile.grade}
- **Mục tiêu phấn đấu**: ${profile.targetGoal}
- **Phong cách tiếp thu tối ưu**: ${profile.learningStyle}
- **Điểm mạnh nổi bật**: ${strengthsText}
- **Điểm yếu / Bẫy học sinh hay mắc sai sót**: ${weaknessesText}
- **Ghi chú riêng biệt**: ${notesText}${autoInsightsText ? `\n- **Đặc điểm AI ghi nhận gần đây**: ${autoInsightsText}` : ''}

👉 **CHỈ DẪN SƯ PHẠM DÀNH RIÊNG CHO HỌC SINH NÀY**:
1. Xưng hô tự nhiên, ấm áp, gọi học sinh là "${profile.nickname || 'bạn'}".
2. Điều chỉnh mức độ chi tiết và giọng văn đúng theo phong cách: "${profile.learningStyle}".
3. Khi giải thích bài tập, nếu gặp nội dung dễ chạm vào điểm yếu (${weaknessesText}), HÃY CHỦ ĐỘNG nhắc nhở một cách tinh tế và khéo léo (Ví dụ: "Chỗ này bạn ${profile.nickname} nhớ cẩn thận dấu trừ nhé...").
`.trim();
}

/**
 * Tự động phân tích hội thoại để trích xuất thói quen học tập hoặc điểm yếu mới (Auto Distillation)
 */
export async function autoDetectStudentHabit(userMessage, aiAnswer, user = null) {
  if (!userMessage || userMessage.length < 15) return null;

  try {
    const profile = getStudentProfile(user);
    if (!profile.adaptiveLearningEnabled) return null;

    const prompt = `Phân tích câu hỏi của học sinh và xác định xem học sinh có bộc lộ thói quen học tập, lớp học, mục tiêu, hoặc điểm yếu/sai sót nào đáng ghi nhớ không.
Câu hỏi của học sinh: "${userMessage.slice(0, 500)}"

Nếu PHÁT HIỆN được thói quen, lỗi sai thường gặp, mục tiêu hoặc lớp học cụ thể, hãy trả về JSON:
{
  "detected": true,
  "category": "weakness" hoặc "learningStyle" hoặc "goal" hoặc "habit",
  "summary": "Mô tả ngắn gọn đặc điểm học tập (dưới 15 từ, bằng tiếng Việt)"
}
Nếu KHÔNG có gì đặc biệt (chỉ là câu hỏi bài tập thông thường), hãy trả về:
{
  "detected": false
}`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        detected: { type: Type.BOOLEAN },
        category: { type: Type.STRING },
        summary: { type: Type.STRING }
      },
      required: ['detected']
    };

    const res = await generateJSON(prompt, schema);
    if (res && res.detected && res.summary) {
      // Bổ sung vào hồ sơ học sinh
      const updated = { ...profile };
      const newInsight = {
        id: 'auto_' + Date.now(),
        text: `AI ghi nhận: ${res.summary}`,
        timestamp: Date.now()
      };

      // Tránh trùng lặp
      const isDuplicate = updated.autoInsights.some(
        (ins) => ins.text.toLowerCase() === newInsight.text.toLowerCase()
      );
      if (!isDuplicate) {
        updated.autoInsights = [newInsight, ...updated.autoInsights.slice(0, 9)];
        if (res.category === 'weakness' && !updated.weaknesses.includes(res.summary)) {
          updated.weaknesses = [res.summary, ...updated.weaknesses.slice(0, 6)];
        }
        saveStudentProfile(updated, user);
        return res.summary;
      }
    }
  } catch (err) {
    // Không làm gián đoạn trải nghiệm người dùng nếu phân tích ngầm thất bại
    console.debug('Phân tích bộ nhớ học tập:', err);
  }
  return null;
}
