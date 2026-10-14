import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import JSZip from 'jszip';

// Cấu hình worker cho pdfjs trong Vite
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (e) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

const STORAGE_KEY = 'EDUVERSE_RAG_DOCS_V1';

/**
 * ====================================================
 * 1. KHO DỮ LIỆU SÁCH MẪU CHUẨN (SÁCH GIÁO KHOA 12)
 * Giúp người dùng trải nghiệm RAG ngay lập tức mà không cần tìm file PDF
 * ====================================================
 */
export const SAMPLE_TEXTBOOKS = [
  {
    id: 'sgk-toan-12',
    title: 'Sách Giáo Khoa Toán 12 - Ứng Dụng Đạo Hàm',
    subject: 'Toán Học',
    fileType: 'TXT',
    createdAt: Date.now(),
    isActive: true,
    content: `
CHƯƠNG I: ỨNG DỤNG ĐẠO HÀM ĐỂ KHẢO SÁT VÀ VẼ ĐỒ THỊ HÀM SỐ

Bài 1: Sự đồng biến, nghịch biến của hàm số
1. Định nghĩa: Cho hàm số y = f(x) xác định trên khoảng K.
- Hàm số f đồng biến (tăng) trên K nếu với mọi x1, x2 thuộc K: x1 < x2 => f(x1) < f(x2).
- Hàm số f nghịch biến (giảm) trên K nếu với mọi x1, x2 thuộc K: x1 < x2 => f(x1) > f(x2).
2. Điều kiện đủ để hàm số đơn điệu:
Cho hàm số y = f(x) có đạo hàm trên K.
- Nếu f'(x) > 0 với mọi x thuộc K thì f đồng biến trên K.
- Nếu f'(x) < 0 với mọi x thuộc K thì f nghịch biến trên K.
- Nếu f'(x) >= 0 (hoặc f'(x) <= 0) với mọi x thuộc K và f'(x) = 0 chỉ tại một số hữu hạn điểm thì f đồng biến (hoặc nghịch biến) trên K.

Bài 2: Cực trị của hàm số
1. Định nghĩa cực trị:
Giả sử hàm số f xác định trên tập hợp D và x0 thuộc D.
- x0 là điểm cực đại của f nếu tồn tại khoảng (a; b) chứa x0 sao cho f(x) < f(x0) với mọi x thuộc (a; b) \ {x0}. Giá trị f(x0) gọi là giá trị cực đại.
- x0 là điểm cực tiểu của f nếu tồn tại khoảng (a; b) chứa x0 sao cho f(x) > f(x0) với mọi x thuộc (a; b) \ {x0}. Giá trị f(x0) gọi là giá trị cực tiểu.
2. Điều kiện cần để hàm số đạt cực trị (Định lý Fermat):
Nếu hàm số y = f(x) đạt cực trị tại x0 và có đạo hàm tại đó thì f'(x0) = 0.
3. Dấu hiệu I tìm cực trị:
Cho hàm số f liên tục trên khoảng (a; b) chứa x0 và có đạo hàm trên các khoảng (a; x0) và (x0; b).
- Nếu f'(x) đổi dấu từ dương sang âm khi x qua x0 (từ trái sang phải) thì x0 là điểm cực đại.
- Nếu f'(x) đổi dấu từ âm sang dương khi x qua x0 thì x0 là điểm cực tiểu.
4. Dấu hiệu II tìm cực trị:
Cho hàm số f có đạo hàm cấp hai tại điểm x0 mà f'(x0) = 0.
- Nếu f''(x0) < 0 thì hàm số đạt cực đại tại x0.
- Nếu f''(x0) > 0 thì hàm số đạt cực tiểu tại x0.

Bài 3: Giá trị lớn nhất và giá trị nhỏ nhất của hàm số
- M là giá trị lớn nhất (GTLN, max) của f trên D nếu f(x) <= M với mọi x thuộc D và tồn tại x0 thuộc D sao cho f(x0) = M.
- m là giá trị nhỏ nhất (GTNN, min) của f trên D nếu f(x) >= m với mọi x thuộc D và tồn tại x0 thuộc D sao cho f(x0) = m.
- Quy tắc tìm GTLN, GTNN trên đoạn [a; b]:
Bước 1: Tìm các điểm xi thuộc (a; b) mà tại đó f'(xi) = 0 hoặc f'(xi) không xác định.
Bước 2: Tính f(a), f(b), f(xi).
Bước 3: Số lớn nhất trong các giá trị đó là max f(x), số nhỏ nhất là min f(x).

Bài 4: Đường tiệm cận của đồ thị hàm số
1. Tiệm cận ngang: Đường thẳng y = y0 là tiệm cận ngang của đồ thị hàm số y = f(x) nếu ít nhất một trong các điều kiện sau được thỏa mãn:
lim_{x -> +inf} f(x) = y0 hoặc lim_{x -> -inf} f(x) = y0.
2. Tiệm cận đứng: Đường thẳng x = x0 là tiệm cận đứng của đồ thị hàm số y = f(x) nếu ít nhất một trong các điều kiện sau được thỏa mãn:
lim_{x -> x0^+} f(x) = +inf, lim_{x -> x0^+} f(x) = -inf, lim_{x -> x0^-} f(x) = +inf, hoặc lim_{x -> x0^-} f(x) = -inf.
    `.trim()
  },
  {
    id: 'sgk-ly-12',
    title: 'Sách Giáo Khoa Vật Lý 12 - Dao Động Cơ Học',
    subject: 'Vật Lý',
    fileType: 'TXT',
    createdAt: Date.now() - 3600000,
    isActive: true,
    content: `
CHƯƠNG I: DAO ĐỘNG CƠ

Bài 1: Dao động điều hòa
1. Phương trình dao động điều hòa:
x = A*cos(omega*t + phi)
Trong đó:
- x: li độ dao động (cm hoặc m)
- A: biên độ dao động (A > 0), là li độ cực đại.
- omega: tần số góc (rad/s), omega > 0.
- (omega*t + phi): pha dao động tại thời điểm t (rad).
- phi: pha ban đầu tại t = 0 (-pi <= phi <= pi).
2. Chu kỳ và tần số:
- Chu kỳ T: Khoảng thời gian để vật thực hiện một dao động toàn phần. T = 2*pi / omega (đơn vị: giây - s).
- Tần số f: Số dao động toàn phần thực hiện trong 1 giây. f = 1/T = omega / (2*pi) (đơn vị: Hertz - Hz).
3. Vận tốc và gia tốc trong dao động điều hòa:
- Vận tốc: v = x' = -omega*A*sin(omega*t + phi) = omega*A*cos(omega*t + phi + pi/2).
  Vận tốc sớm pha pi/2 so với li độ.
  v_max = omega*A (khi qua vị trí cân bằng theo chiều dương).
  v = 0 khi ở hai biên.
- Gia tốc: a = v' = x'' = -omega^2 * A * cos(omega*t + phi) = -omega^2 * x.
  Gia tốc ngược pha (sớm pha pi) so với li độ, luôn hướng về vị trí cân bằng.
  a_max = omega^2 * A (khi ở biên âm x = -A).
  a = 0 khi qua vị trí cân bằng x = 0.
4. Hệ thức độc lập thời gian:
A^2 = x^2 + (v / omega)^2
a = -omega^2 * x => A^2 = (a / omega^2)^2 + (v / omega)^2

Bài 2: Con lắc lò xo
1. Cấu tạo: Gồm một lò xo có độ cứng k và một vật nhỏ khối lượng m.
2. Tần số góc, chu kỳ, tần số:
omega = sqrt(k / m)
T = 2*pi * sqrt(m / k)
f = (1 / (2*pi)) * sqrt(k / m)
3. Năng lượng dao động của con lắc lò xo:
- Động năng: W_d = 0.5 * m * v^2 = 0.5 * m * omega^2 * A^2 * sin^2(omega*t + phi).
- Thế năng: W_t = 0.5 * k * x^2 = 0.5 * k * A^2 * cos^2(omega*t + phi).
- Cơ năng: W = W_d + W_t = 0.5 * k * A^2 = 0.5 * m * omega^2 * A^2 = const.
Cơ năng tỉ lệ với bình phương biên độ dao động, được bảo toàn nếu bỏ qua mọi ma sát.

Bài 3: Con lắc đơn
1. Cấu tạo: Vật nặng khối lượng m treo vào sợi dây nhẹ, không dãn chiều dài l.
2. Khi góc lệch alpha nhỏ (alpha <= 10 độ = 0.17 rad), con lắc đơn dao động điều hòa:
omega = sqrt(g / l)
T = 2*pi * sqrt(l / g)
f = (1 / (2*pi)) * sqrt(g / l)
Lưu ý: Chu kỳ con lắc đơn không phụ thuộc vào khối lượng m của vật nặng!
    `.trim()
  },
  {
    id: 'sgk-hoa-12',
    title: 'Sách Giáo Khoa Hóa Học 12 - Este & Lipit',
    subject: 'Hóa Học',
    fileType: 'TXT',
    createdAt: Date.now() - 7200000,
    isActive: true,
    content: `
CHƯƠNG I: ESTE - LIPIT

Bài 1: Este
1. Khái niệm và đồng phân:
- Khi thay nhóm OH ở nhóm cacboxyl của axit cacboxylic bằng nhóm OR' thì được este.
- Công thức tổng quát của este no, đơn chức, mạch hở: CnH2nO2 (n >= 2).
2. Danh pháp (Tên gọi):
Tên este = Tên gốc hidrocacbon R' + Tên gốc axit (đuôi "at").
Ví dụ:
- HCOOCH3: Metyl fomat (mùi đào chín)
- CH3COOC2H5: Etyl axetat (dung môi sơn móng tay)
- CH3COOCH2CH2CH(CH3)2: Isoamyl axetat (mùi chuối chín)
- CH3COOCH2C6H5: Benzyl axetat (mùi hoa nhài)
3. Tính chất vật lý:
- Nhẹ hơn nước, ít tan trong nước do không tạo được liên kết hidro giữa các phân tử este với nhau.
- Nhiệt độ sôi thấp hơn nhiều so với ancol và axit cacboxylic có cùng khối lượng mol.
4. Tính chất hóa học:
a) Phản ứng thủy phân trong môi trường axit (thuận nghịch):
R-COO-R' + H2O <=(H+, t0)=> R-COOH + R'-OH
b) Phản ứng thủy phân trong môi trường kiềm (phản ứng xà phòng hóa - một chiều):
R-COO-R' + NaOH --(t0)--> R-COONa + R'-OH
Trường hợp đặc biệt:
- Este của phenol tác dụng với NaOH theo tỉ lệ 1 : 2 sinh ra 2 muối:
R-COO-C6H5 + 2NaOH --(t0)--> R-COONa + C6H5ONa + H2O
- Este của ancol không bền sinh ra anđehit hoặc xeton:
CH3COOCH=CH2 + NaOH --(t0)--> CH3COONa + CH3CHO

Bài 2: Lipit - Chất béo
1. Khái niệm:
Chất béo (triglixerit hay triaxylglixerol) là trieste của glixerol với các axit béo.
Công thức cấu tạo chung: (RCOO)3C3H5.
2. Các axit béo thường gặp:
- Axit panmitic: C15H31COOH (no, rắn) => Tripanmitin: (C15H31COO)3C3H5 (M = 806)
- Axit stearic: C17H35COOH (no, rắn) => Tristearin: (C17H35COO)3C3H5 (M = 890)
- Axit oleic: C17H33COOH (không no, 1 nối đôi C=C, lỏng) => Triolein: (C17H33COO)3C3H5 (M = 884)
- Axit linoleic: C17H31COOH (không no, 2 nối đôi C=C, lỏng)
3. Tính chất hóa học:
- Thủy phân trong môi trường kiềm (Xà phòng hóa):
(RCOO)3C3H5 + 3NaOH --(t0)--> 3RCOONa + C3H5(OH)3 (Glixerol)
- Phản ứng hidro hóa (chuyển chất béo lỏng thành chất béo rắn):
(C17H33COO)3C3H5 (lỏng) + 3H2 --(Ni, t0)--> (C17H35COO)3C3H5 (rắn, bơ nhân tạo).
    `.trim()
  }
];

/**
 * ====================================================
 * 2. BỘ PHÂN TÁCH VĂN BẢN (CHUNKING ENGINE)
 * Chia tài liệu lớn thành các đoạn ngữ nghĩa phù hợp cho RAG
 * ====================================================
 */
export function chunkDocument(document, targetChunkSize = 500, overlap = 80) {
  const text = document.content || '';
  if (!text.trim()) return [];

  // Tách theo đoạn văn trước
  const rawParagraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of rawParagraphs) {
    if ((currentChunk + '\n' + para).length <= targetChunkSize) {
      currentChunk = currentChunk ? currentChunk + '\n' + para : para;
    } else {
      if (currentChunk) {
        chunks.push({
          id: `${document.id}_chunk_${chunkIndex++}`,
          docId: document.id,
          docTitle: document.title,
          subject: document.subject || 'Tổng hợp',
          text: currentChunk.trim(),
          length: currentChunk.length,
        });
      }

      // Xử lý đoạn văn dài hơn targetChunkSize
      if (para.length > targetChunkSize) {
        let start = 0;
        while (start < para.length) {
          const slice = para.slice(start, start + targetChunkSize);
          chunks.push({
            id: `${document.id}_chunk_${chunkIndex++}`,
            docId: document.id,
            docTitle: document.title,
            subject: document.subject || 'Tổng hợp',
            text: slice.trim(),
            length: slice.length,
          });
          start += targetChunkSize - overlap;
        }
        currentChunk = '';
      } else {
        currentChunk = para;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      id: `${document.id}_chunk_${chunkIndex++}`,
      docId: document.id,
      docTitle: document.title,
      subject: document.subject || 'Tổng hợp',
      text: currentChunk.trim(),
      length: currentChunk.length,
    });
  }

  return chunks;
}

/**
 * ====================================================
 * 3. BỘ TRÍCH XUẤT TÀI LIỆU (PDF, TXT, DOCX)
 * ====================================================
 */
export async function extractTextFromFile(file) {
  const fileName = file.name.toLowerCase();

  // 1. Nếu là file TXT / MD / JSON / CSV / HTML
  if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.json') || fileName.endsWith('.csv') || fileName.endsWith('.html')) {
    const text = await file.text();
    return {
      text,
      pageCount: 1,
      fileType: fileName.split('.').pop().toUpperCase(),
      fileName: file.name,
      fileSize: file.size,
    };
  }

  // 2. Nếu là file PowerPoint (.pptx)
  if (fileName.endsWith('.pptx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles = Object.keys(zip.files).filter((path) =>
        /^ppt\/slides\/slide\d+\.xml$/i.test(path)
      );

      // Sắp xếp tự nhiên theo số thứ tự slide (slide1, slide2, ..., slide10)
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
        const numB = parseInt(b.match(/slide(\d+)\.xml/i)[1], 10);
        return numA - numB;
      });

      let fullText = '';
      const parser = new DOMParser();

      for (let i = 0; i < slideFiles.length; i++) {
        const slidePath = slideFiles[i];
        const slideXml = await zip.files[slidePath].async('string');
        const xmlDoc = parser.parseFromString(slideXml, 'text/xml');
        const textNodes = xmlDoc.getElementsByTagName('a:t');
        const slideTexts = [];
        for (let j = 0; j < textNodes.length; j++) {
          const val = textNodes[j].textContent?.trim();
          if (val) slideTexts.push(val);
        }
        if (slideTexts.length > 0) {
          fullText += `\n[--- SLIDE ${i + 1} ---]\n${slideTexts.join(' ')}\n`;
        }
      }

      return {
        text: fullText.trim() || 'Slide không chứa văn bản ký tự (có thể là slide chỉ toàn hình ảnh).',
        pageCount: slideFiles.length || 1,
        fileType: 'PPTX (PowerPoint)',
        fileName: file.name,
        fileSize: file.size,
      };
    } catch (err) {
      console.error('Lỗi phân tích file PPTX:', err);
      throw new Error('Không thể đọc file PowerPoint (.pptx). File có thể bị lỗi định dạng hoặc khóa.');
    }
  }

  // 3. Nếu là file Microsoft Word (.docx)
  if (fileName.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docFile = zip.files['word/document.xml'];
      if (!docFile) throw new Error('Không tìm thấy nội dung văn bản trong file docx.');
      const docXml = await docFile.async('string');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(docXml, 'text/xml');
      const paragraphs = xmlDoc.getElementsByTagName('w:p');
      const textLines = [];
      for (let i = 0; i < paragraphs.length; i++) {
        const textNodes = paragraphs[i].getElementsByTagName('w:t');
        let line = '';
        for (let j = 0; j < textNodes.length; j++) {
          line += textNodes[j].textContent || '';
        }
        if (line.trim()) textLines.push(line.trim());
      }
      return {
        text: textLines.join('\n\n'),
        pageCount: Math.ceil(textLines.length / 25) || 1,
        fileType: 'DOCX (Word)',
        fileName: file.name,
        fileSize: file.size,
      };
    } catch (err) {
      console.error('Lỗi đọc file DOCX:', err);
      throw new Error('Không thể đọc file Word (.docx). Vui lòng kiểm tra lại file.');
    }
  }

  // 4. Nếu là hình ảnh Slide hoặc Tài liệu (.png, .jpg, .jpeg, .webp, .bmp)
  if (/\.(png|jpe?g|webp|bmp)$/i.test(fileName)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const mimeType = file.type || 'image/jpeg';
        const base64Data = dataUrl.split(',')[1];
        resolve({
          text: `[Hình ảnh slide/tài liệu: ${file.name}]`,
          pageCount: 1,
          fileType: 'IMAGE',
          fileName: file.name,
          fileSize: file.size,
          isImage: true,
          imageDataUrl: dataUrl,
          imagePart: {
            inlineData: {
              mimeType,
              data: base64Data
            }
          }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 5. Nếu là file PDF
  if (fileName.endsWith('.pdf')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      let fullText = '';

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += `\n[--- Trang ${pageNum} ---]\n${pageText}\n`;
      }

      return {
        text: fullText.trim(),
        pageCount: totalPages,
        fileType: 'PDF',
        fileName: file.name,
        fileSize: file.size,
      };
    } catch (err) {
      console.error('Lỗi phân tích file PDF:', err);
      throw new Error('Không thể đọc file PDF này. File có thể bị khóa mật khẩu hoặc là bản scan ảnh thuần.');
    }
  }

  throw new Error('Định dạng file chưa được hỗ trợ. Vui lòng tải file PDF, PPTX (Slide), DOCX, TXT hoặc ảnh slide (PNG, JPG).');
}

/**
 * ====================================================
 * 4. THUẬT TOÁN TÌM KIẾM NGỮ NGHĨA LAI (HYBRID RETRIEVAL)
 * BM25/TF-IDF + Trọng số cụm từ & Tiêu đề
 * ====================================================
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

export function searchRelevantChunks(query, allChunks, topK = 4) {
  if (!query || !query.trim() || !allChunks || allChunks.length === 0) {
    return [];
  }

  const queryTokens = tokenize(query);
  const normalizedQuery = query.toLowerCase().trim();

  const scoredChunks = allChunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.text);
    const chunkTextLower = chunk.text.toLowerCase();
    const docTitleLower = chunk.docTitle.toLowerCase();

    let score = 0;

    // 1. Khớp cụm từ chính xác (Exact phrase match bonus)
    if (chunkTextLower.includes(normalizedQuery)) {
      score += 15;
    }

    // 2. Điểm khớp từ trong tiêu đề sách
    queryTokens.forEach((token) => {
      if (docTitleLower.includes(token)) {
        score += 3;
      }
    });

    // 3. TF matching trong đoạn văn
    queryTokens.forEach((token) => {
      const occurrences = chunkTokens.filter((t) => t === token).length;
      if (occurrences > 0) {
        score += 2 + Math.log(1 + occurrences);
      }
    });

    // Tính phần trăm độ khớp tương đối (Confidence score)
    const maxPossibleScore = Math.max(queryTokens.length * 3 + 15, 1);
    const confidence = Math.min(Math.round((score / maxPossibleScore) * 100), 100);

    return {
      ...chunk,
      score,
      confidence,
    };
  });

  return scoredChunks
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * ====================================================
 * 5. TẠO CONTEXT PROMPT CHO GEMINI TỪ KHO RAG
 * ====================================================
 */
export function buildRAGContextPrompt(relevantChunks) {
  if (!relevantChunks || relevantChunks.length === 0) {
    return '';
  }

  let prompt = '\n\n=== NGUỒN KIẾN THỨC TỪ SÁCH GIÁO KHOA / TÀI LIỆU CỦA HỌC SINH (RAG) ===\n';
  prompt += 'Sau đây là các đoạn trích dẫn được tìm thấy từ kho tài liệu của học sinh liên quan trực tiếp đến câu hỏi:\n\n';

  relevantChunks.forEach((chunk, index) => {
    prompt += `[NGUỒN ${index + 1}: ${chunk.docTitle} - Môn: ${chunk.subject}]\n`;
    prompt += `"${chunk.text}"\n\n`;
  });

  prompt += '=== QUY TẮC PHẢN HỒI RAG ===\n';
  prompt += '1. Hãy ưu tiên sử dụng kiến thức, định nghĩa, công thức từ các nguồn trích dẫn trên để giải đáp cho học sinh.\n';
  prompt += '2. Ghi chú rõ nguồn tham chiếu ở cuối hoặc trong bài giải (Ví dụ: "Theo [NGUỒN 1: ...]", hoặc "Dựa trên Sách Giáo Khoa...").\n';
  prompt += '3. Sử dụng công thức toán/lý/hóa bằng cú pháp LaTeX chuẩn $...$ hoặc $$...$$.\n';
  prompt += '4. Nếu tài liệu không đủ dữ kiện, bạn hãy bổ sung dựa trên kiến thức sư phạm chuẩn nhưng ghi chú rõ phần bổ sung này.\n';

  return prompt;
}

/**
 * ====================================================
 * 6. QUẢN LÝ KHO LƯU TRỮ TÀI LIỆU (LOCALSTORAGE)
 * ====================================================
 */
export function getStoredDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Lỗi tải tài liệu từ localStorage:', e);
  }
  return SAMPLE_TEXTBOOKS;
}

export function saveDocuments(docs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error('Lỗi lưu tài liệu vào localStorage:', e);
  }
}

export function getAllActiveChunks(documents) {
  const activeDocs = documents.filter((d) => d.isActive !== false);
  return activeDocs.flatMap((doc) => chunkDocument(doc));
}
