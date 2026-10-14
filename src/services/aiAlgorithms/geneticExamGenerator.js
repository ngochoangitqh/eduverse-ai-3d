/**
 * ============================================================================
 * MODULE 3: TÍNH TOÁN TIẾN HÓA & CSP (GENETIC ALGORITHM FOR EXAM GENERATION) - CLO2
 * Giải thuật Di truyền (GA) giải bài toán Thỏa Mãn Ràng Buộc (CSP - Constraint Satisfaction)
 * Sinh đề thi trắc nghiệm tối ưu từ Ngân hàng câu hỏi
 * ============================================================================
 */

export class GeneticExamGeneratorCSP {
  constructor({
    questionBank,
    targetNumQuestions = 10,
    targetDifficulty = { easy: 0.4, medium: 0.4, hard: 0.2 }, // 40% dễ, 40% vừa, 20% khó
    targetDurationMinutes = 15,
    requiredTopics = ['Toán Học', 'Vật Lý', 'Hóa Học', 'Tiếng Anh'],
    populationSize = 40,
    mutationRate = 0.15,
    crossoverRate = 0.85,
    maxGenerations = 60
  }) {
    this.bank = questionBank;
    this.targetNumQuestions = targetNumQuestions;
    this.targetDifficulty = targetDifficulty;
    this.targetDurationMinutes = targetDurationMinutes;
    this.requiredTopics = requiredTopics;
    this.populationSize = populationSize;
    this.mutationRate = mutationRate;
    this.crossoverRate = crossoverRate;
    this.maxGenerations = maxGenerations;

    this.population = [];
    this.generationHistory = []; // Lưu lại để vẽ biểu đồ tiến hóa Fitness
    this.bestChromosome = null;
    this.bestFitness = -Infinity;
  }

  // Khởi tạo một cá thể (Nhiễm sắc thể): chọn ngẫu nhiên N câu hỏi không trùng lặp
  _createChromosome() {
    const indices = [];
    const available = Array.from({ length: this.bank.length }, (_, i) => i);

    while (indices.length < this.targetNumQuestions && available.length > 0) {
      const randIdx = Math.floor(Math.random() * available.length);
      indices.push(available[randIdx]);
      available.splice(randIdx, 1);
    }
    return indices;
  }

  // Khởi tạo quần thể ban đầu (Generation 0)
  _initPopulation() {
    this.population = [];
    for (let i = 0; i < this.populationSize; i++) {
      this.population.push(this._createChromosome());
    }
  }

  /**
   * HÀM ĐÁNH GIÁ THÍCH NGHI (FITNESS FUNCTION) THEO CÁC RÀNG BUỘC CSP:
   * Thang điểm tối đa: 100 điểm. Phạt điểm nếu vi phạm ràng buộc:
   * 1. Ràng buộc trùng lặp câu hỏi (Penalty cực nặng)
   * 2. Ràng buộc phân bố độ khó (Dễ/Vừa/Khó)
   * 3. Ràng buộc độ phủ chủ đề (Topic Coverage)
   * 4. Ràng buộc thời gian làm bài mục tiêu
   */
  calculateFitness(chromosome) {
    let score = 100;

    // 1. Kiểm tra trùng lặp
    const unique = new Set(chromosome);
    if (unique.size < chromosome.length) {
      score -= (chromosome.length - unique.size) * 30; // Phạt nặng
    }

    const selectedQuestions = chromosome.map(idx => this.bank[idx]).filter(Boolean);
    if (selectedQuestions.length === 0) return 0;

    // 2. Kiểm tra tỷ lệ độ khó
    const diffCounts = { easy: 0, medium: 0, hard: 0 };
    selectedQuestions.forEach(q => {
      const diff = q.difficulty?.toLowerCase() || 'medium';
      if (diffCounts[diff] !== undefined) diffCounts[diff]++;
      else diffCounts.medium++;
    });

    const totalQ = selectedQuestions.length;
    const actualRatios = {
      easy: diffCounts.easy / totalQ,
      medium: diffCounts.medium / totalQ,
      hard: diffCounts.hard / totalQ
    };

    // Độ lệch độ khó: Sum(|actual - target|)
    const diffPenalty = (
      Math.abs(actualRatios.easy - this.targetDifficulty.easy) +
      Math.abs(actualRatios.medium - this.targetDifficulty.medium) +
      Math.abs(actualRatios.hard - this.targetDifficulty.hard)
    ) * 40;
    score -= diffPenalty;

    // 3. Kiểm tra độ phủ chủ đề (CSP: Phải chứa các chủ đề yêu cầu)
    const topicSet = new Set(selectedQuestions.map(q => q.topic));
    let missingTopics = 0;
    this.requiredTopics.forEach(t => {
      if (!topicSet.has(t)) missingTopics++;
    });
    score -= missingTopics * 15;

    // 4. Kiểm tra tổng thời gian làm bài ước lượng
    const totalDuration = selectedQuestions.reduce((sum, q) => sum + (q.timeMinutes || 1.5), 0);
    const durationPenalty = Math.abs(totalDuration - this.targetDurationMinutes) * 2;
    score -= durationPenalty;

    return Math.max(0, Number(score.toFixed(2)));
  }

  // Chọn lọc giải đấu (Tournament Selection): Chọn 3 cá thể ngẫu nhiên, lấy cá thể tốt nhất
  _tournamentSelection(tournamentSize = 3) {
    let best = null;
    let bestFit = -Infinity;

    for (let i = 0; i < tournamentSize; i++) {
      const randIdx = Math.floor(Math.random() * this.population.length);
      const ind = this.population[randIdx];
      const fit = this.calculateFitness(ind);
      if (fit > bestFit) {
        bestFit = fit;
        best = ind;
      }
    }
    return [...best];
  }

  // Lai ghép 2 điểm cắt (Two-point Crossover) kết hợp sửa lỗi trùng lặp
  _crossover(parentA, parentB) {
    if (Math.random() > this.crossoverRate) {
      return [[...parentA], [...parentB]];
    }

    const n = parentA.length;
    const pt1 = Math.floor(Math.random() * (n - 2)) + 1;
    const pt2 = Math.floor(Math.random() * (n - pt1 - 1)) + pt1 + 1;

    // Đoạn giữa trao đổi
    const child1 = [...parentA];
    const child2 = [...parentB];

    for (let i = pt1; i < pt2; i++) {
      child1[i] = parentB[i];
      child2[i] = parentA[i];
    }

    // Sửa lỗi trùng lặp câu hỏi (Repair mechanism)
    this._repairDuplicates(child1);
    this._repairDuplicates(child2);

    return [child1, child2];
  }

  _repairDuplicates(chromosome) {
    const seen = new Set();
    const duplicates = [];

    chromosome.forEach((val, idx) => {
      if (seen.has(val)) {
        duplicates.push(idx);
      } else {
        seen.add(val);
      }
    });

    const allIndices = Array.from({ length: this.bank.length }, (_, i) => i);
    const available = allIndices.filter(i => !seen.has(i));

    duplicates.forEach(dupIdx => {
      if (available.length > 0) {
        const randChoice = Math.floor(Math.random() * available.length);
        chromosome[dupIdx] = available[randChoice];
        seen.add(available[randChoice]);
        available.splice(randChoice, 1);
      }
    });
  }

  // Đột biến (Mutation): Thay thế ngẫu nhiên 1 câu hỏi bằng câu hỏi mới trong ngân hàng
  _mutate(chromosome) {
    for (let i = 0; i < chromosome.length; i++) {
      if (Math.random() < this.mutationRate) {
        const available = Array.from({ length: this.bank.length }, (_, k) => k)
          .filter(k => !chromosome.includes(k));

        if (available.length > 0) {
          const randNew = available[Math.floor(Math.random() * available.length)];
          chromosome[i] = randNew;
        }
      }
    }
  }

  // Chạy toàn bộ quá trình tiến hóa
  runEvolution() {
    this._initPopulation();
    this.generationHistory = [];
    this.bestFitness = -Infinity;
    this.bestChromosome = null;

    for (let gen = 0; gen < this.maxGenerations; gen++) {
      const fitnesses = this.population.map(chrom => this.calculateFitness(chrom));

      let genBestFitness = -Infinity;
      let genBestChrom = null;
      let sumFitness = 0;

      for (let i = 0; i < this.population.length; i++) {
        sumFitness += fitnesses[i];
        if (fitnesses[i] > genBestFitness) {
          genBestFitness = fitnesses[i];
          genBestChrom = this.population[i];
        }
        if (fitnesses[i] > this.bestFitness) {
          this.bestFitness = fitnesses[i];
          this.bestChromosome = [...this.population[i]];
        }
      }

      const avgFitness = Number((sumFitness / this.population.length).toFixed(2));
      this.generationHistory.push({
        generation: gen + 1,
        bestFitness: genBestFitness,
        avgFitness
      });

      // Nếu đã đạt độ thích nghi tối ưu 100 điểm, dừng sớm
      if (this.bestFitness >= 98.5) {
        break;
      }

      // Tạo thế hệ con mới
      const nextPop = [];
      // Elitism: Giữ lại 2 cá thể xuất sắc nhất không bị đột biến
      nextPop.push([...this.bestChromosome]);
      nextPop.push([...genBestChrom]);

      while (nextPop.length < this.populationSize) {
        const parent1 = this._tournamentSelection();
        const parent2 = this._tournamentSelection();
        const [child1, child2] = this._crossover(parent1, parent2);
        this._mutate(child1);
        this._mutate(child2);
        nextPop.push(child1);
        if (nextPop.length < this.populationSize) {
          nextPop.push(child2);
        }
      }

      this.population = nextPop;
    }

    const optimalExamQuestions = this.bestChromosome.map(idx => this.bank[idx]);

    // Thống kê kết quả đề thi
    const stats = {
      totalQuestions: optimalExamQuestions.length,
      fitnessScore: this.bestFitness,
      generationsRun: this.generationHistory.length,
      difficultyBreakdown: {
        easy: optimalExamQuestions.filter(q => q.difficulty === 'easy').length,
        medium: optimalExamQuestions.filter(q => q.difficulty === 'medium').length,
        hard: optimalExamQuestions.filter(q => q.difficulty === 'hard').length,
      },
      topicBreakdown: {},
      totalEstimatedTime: Number(optimalExamQuestions.reduce((a, b) => a + (b.timeMinutes || 1.5), 0).toFixed(1)),
    };

    optimalExamQuestions.forEach(q => {
      stats.topicBreakdown[q.topic] = (stats.topicBreakdown[q.topic] || 0) + 1;
    });

    return {
      optimalExam: optimalExamQuestions,
      stats,
      history: this.generationHistory
    };
  }
}

// ============================================================================
// NGÂN HÀNG CÂU HỎI MẪU (QUESTION BANK ĐA DẠNG MÔN HỌC & ĐỘ KHÓ)
// ============================================================================
export const SAMPLE_QUESTION_BANK = [
  { id: 'q1', text: 'Đạo hàm của hàm số y = x^3 - 3x + 1 là gì?', difficulty: 'easy', topic: 'Toán Học', timeMinutes: 1.0, answer: '3x^2 - 3' },
  { id: 'q2', text: 'Phương trình bậc hai ax^2 + bx + c = 0 có 2 nghiệm phân biệt khi nào?', difficulty: 'easy', topic: 'Toán Học', timeMinutes: 1.0, answer: 'Delta > 0' },
  { id: 'q3', text: 'Tìm giá trị lớn nhất của hàm số y = sin(x) + cos(x)?', difficulty: 'medium', topic: 'Toán Học', timeMinutes: 1.5, answer: 'sqrt(2)' },
  { id: 'q4', text: 'Tính tích phân từ 0 đến 1 của e^(2x) dx?', difficulty: 'medium', topic: 'Toán Học', timeMinutes: 2.0, answer: '(e^2 - 1)/2' },
  { id: 'q5', text: 'Cho hình chóp S.ABCD, tính khoảng cách giữa hai đường thẳng chéo nhau SA và CD?', difficulty: 'hard', topic: 'Toán Học', timeMinutes: 3.0, answer: 'a*sqrt(3)/2' },

  { id: 'q6', text: 'Đơn vị đo của điện trở trong hệ SI là gì?', difficulty: 'easy', topic: 'Vật Lý', timeMinutes: 0.8, answer: 'Ohm (Ω)' },
  { id: 'q7', text: 'Công thức tính chu kỳ dao động của con lắc đơn là?', difficulty: 'easy', topic: 'Vật Lý', timeMinutes: 1.0, answer: 'T = 2*pi*sqrt(l/g)' },
  { id: 'q8', text: 'Hiện tượng quang điện ngoài xảy ra khi nào?', difficulty: 'medium', topic: 'Vật Lý', timeMinutes: 1.5, answer: 'Bước sóng ánh sáng kích thích <= giới hạn quang điện' },
  { id: 'q9', text: 'Một vật dao động điều hòa với biên độ 5cm. Vận tốc cực đại là 20pi cm/s. Tìm tần số?', difficulty: 'medium', topic: 'Vật Lý', timeMinutes: 2.0, answer: '2 Hz' },
  { id: 'q10', text: 'Mạch RLC nối tiếp có hiện tượng cộng hưởng điện khi tần số góc omega bằng bao nhiêu?', difficulty: 'hard', topic: 'Vật Lý', timeMinutes: 2.5, answer: 'omega = 1/sqrt(LC)' },

  { id: 'q11', text: 'Kim loại nào dẫn điện tốt nhất?', difficulty: 'easy', topic: 'Hóa Học', timeMinutes: 0.8, answer: 'Bạc (Ag)' },
  { id: 'q12', text: 'Chất nào sau đây là este?', difficulty: 'easy', topic: 'Hóa Học', timeMinutes: 1.0, answer: 'CH3COOC2H5' },
  { id: 'q13', text: 'Cho 5.4g Al tác dụng hoàn toàn với dung dịch NaOH dư, thể tích khí H2 sinh ra (đktc) là?', difficulty: 'medium', topic: 'Hóa Học', timeMinutes: 2.0, answer: '6.72 lít' },
  { id: 'q14', text: 'Thuốc thử dùng để phân biệt dung dịch Glucozơ và Fructozơ là gì?', difficulty: 'medium', topic: 'Hóa Học', timeMinutes: 1.5, answer: 'Nước brom' },
  { id: 'q15', text: 'Thủy phân hoàn toàn m gam peptit Gly-Ala-Val cần dùng 300ml NaOH 1M. Tìm m?', difficulty: 'hard', topic: 'Hóa Học', timeMinutes: 3.0, answer: '24.5 gam' },

  { id: 'q16', text: 'Chọn từ đồng nghĩa với "Enormous"?', difficulty: 'easy', topic: 'Tiếng Anh', timeMinutes: 0.8, answer: 'Huge' },
  { id: 'q17', text: 'If I ___ you, I would take that scholarship.', difficulty: 'easy', topic: 'Tiếng Anh', timeMinutes: 1.0, answer: 'were' },
  { id: 'q18', text: 'She apologized ___ being late for the interview.', difficulty: 'medium', topic: 'Tiếng Anh', timeMinutes: 1.2, answer: 'for' },
  { id: 'q19', text: 'Not only ___ the exam, but she also got the highest score.', difficulty: 'medium', topic: 'Tiếng Anh', timeMinutes: 1.5, answer: 'did she pass' },
  { id: 'q20', text: 'Identify the collocation: The government should ___ measures to combat pollution.', difficulty: 'hard', topic: 'Tiếng Anh', timeMinutes: 2.5, answer: 'implement / adopt stringent' },
];
