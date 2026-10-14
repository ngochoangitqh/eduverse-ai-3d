/**
 * ============================================================================
 * MODULE 4: BIỂU DIỄN TRI THỨC & HỆ CHUYÊN GIA (EXPERT SYSTEM & SEMANTIC NETWORK) - CLO2
 * 1. Động cơ suy diễn luật IF - THEN (Forward & Backward Chaining Inference Engine)
 * 2. Mạng ngữ nghĩa (Semantic Network - Đồ thị nút-cung cho Mindmap & Tóm tắt)
 * ============================================================================
 */

// ============================================================================
// 1. HỆ CHUYÊN GIA DỰA TRÊN LUẬT (RULE-BASED EXPERT SYSTEM)
// ============================================================================
export class RuleBasedExpertSystem {
  constructor(rules = []) {
    this.rules = rules;
    this.facts = new Set();
    this.inferenceTrace = []; // Lưu lại từng bước kích hoạt luật (Explainability)
  }

  addRule(id, name, conditions, conclusion, explanation) {
    this.rules.push({ id, name, conditions, conclusion, explanation });
  }

  setFacts(initialFacts) {
    this.facts = new Set(initialFacts);
    this.inferenceTrace = [];
  }

  addFact(fact) {
    this.facts.add(fact);
  }

  /**
   * ĐỘNG CƠ SUY DIỄN TIẾN (FORWARD CHAINING INFERENCE ENGINE):
   * Lặp lại kiểm tra các luật. Nếu tất cả điều kiện (conditions) của luật nằm trong tập sự kiện (facts),
   * thì kích hoạt luật (fire rule), bổ sung kết luận (conclusion) vào tập facts.
   * Dừng khi không có luật mới nào được kích hoạt.
   */
  forwardChaining() {
    this.inferenceTrace = [];
    let newFactAdded = true;
    let stepCount = 1;
    const firedRules = new Set();

    while (newFactAdded) {
      newFactAdded = false;

      for (const rule of this.rules) {
        if (firedRules.has(rule.id)) continue;

        // Kiểm tra xem tất cả điều kiện của luật đã thỏa mãn chưa
        const isSatisfied = rule.conditions.every(cond => this.facts.has(cond));

        if (isSatisfied && !this.facts.has(rule.conclusion)) {
          this.facts.add(rule.conclusion);
          firedRules.add(rule.id);
          newFactAdded = true;

          this.inferenceTrace.push({
            step: stepCount++,
            ruleId: rule.id,
            ruleName: rule.name,
            matchedConditions: [...rule.conditions],
            deducedConclusion: rule.conclusion,
            explanation: rule.explanation,
          });
        }
      }
    }

    return {
      finalFacts: Array.from(this.facts),
      trace: this.inferenceTrace,
      firedRulesCount: firedRules.size
    };
  }

  /**
   * ĐỘNG CƠ SUY DIỄN LÙI (BACKWARD CHAINING):
   * Kiểm tra xem một giả thuyết (Hypothesis) có thể được chứng minh từ tập sự kiện hiện có không.
   */
  backwardChaining(goal, visited = new Set()) {
    if (this.facts.has(goal)) {
      return { success: true, path: [goal] };
    }

    if (visited.has(goal)) return { success: false, path: [] };
    visited.add(goal);

    // Tìm các luật có kết luận là goal
    const candidateRules = this.rules.filter(r => r.conclusion === goal);
    for (const rule of candidateRules) {
      let allSubgoalsProven = true;
      const subPaths = [];

      for (const cond of rule.conditions) {
        const res = this.backwardChaining(cond, new Set(visited));
        if (!res.success) {
          allSubgoalsProven = false;
          break;
        }
        subPaths.push(...res.path);
      }

      if (allSubgoalsProven) {
        return {
          success: true,
          path: [...subPaths, rule.id, goal],
          explanation: rule.explanation
        };
      }
    }

    return { success: false, path: [] };
  }
}

// ============================================================================
// 2. MẠNG NGỮ NGHĨA (SEMANTIC NETWORK GRAPH)
// Đồ thị nút - cung (Nodes & Edges) đại diện cho thực thể và mối quan hệ tri thức
// ============================================================================
export class SemanticNetwork {
  constructor() {
    this.nodes = new Map(); // id -> { id, label, type, properties }
    this.edges = []; // { source, target, relation, label }
  }

  addNode(id, label, type = 'concept', properties = {}) {
    this.nodes.set(id, { id, label, type, properties });
  }

  addEdge(source, target, relation, label = '') {
    this.edges.push({
      source,
      target,
      relation, // 'is-a', 'has-part', 'formula', 'requires', 'example'
      label: label || relation
    });
  }

  // Truy vấn quan hệ kế thừa (Inheritance reasoning theo quan hệ 'is-a')
  queryInheritedProperties(nodeId) {
    const visited = new Set();
    const inheritedProps = [];

    const traverse = (currentId) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const node = this.nodes.get(currentId);
      if (node && node.properties) {
        inheritedProps.push({ from: node.label, props: node.properties });
      }

      // Tìm các nút cha qua quan hệ 'is-a'
      this.edges
        .filter(e => e.source === currentId && e.relation === 'is-a')
        .forEach(e => traverse(e.target));
    };

    traverse(nodeId);
    return inheritedProps;
  }

  // Tự động chuyển đổi Mạng ngữ nghĩa thành cấu trúc Sơ đồ tư duy (Mindmap Tree)
  exportToMindmap(rootId) {
    const visited = new Set();

    const buildTree = (currentId) => {
      visited.add(currentId);
      const node = this.nodes.get(currentId);
      if (!node) return null;

      const childrenEdges = this.edges.filter(e => e.source === currentId && !visited.has(e.target));
      const children = childrenEdges.map(e => {
        const childTree = buildTree(e.target);
        return {
          ...childTree,
          relationToParent: e.relation,
          edgeLabel: e.label
        };
      }).filter(Boolean);

      return {
        id: node.id,
        label: node.label,
        type: node.type,
        properties: node.properties,
        children
      };
    };

    return buildTree(rootId);
  }

  // Xuất dữ liệu đồ thị cho giao diện trực quan 2D/3D (Nodes & Links)
  toGraphData() {
    const nodes = Array.from(this.nodes.values());
    const links = this.edges.map(e => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
      label: e.label
    }));
    return { nodes, links };
  }
}

// ============================================================================
// TẬP LUẬT VÀ MẠNG NGỮ NGHĨA MẪU CHO GIÁO DỤC (EDUCATIONAL KNOWLEDGE BASE)
// ============================================================================

// Tập luật hệ chuyên gia chẩn đoán học tập & tư vấn lộ trình
export const SAMPLE_EXPERT_RULES = [
  {
    id: 'R1',
    name: 'Chẩn đoán yếu phát âm đuôi',
    conditions: ['accuracy_low', 'ending_sounds_missing'],
    conclusion: 'phat_am_yeu_am_duoi',
    explanation: 'Học sinh phát âm điểm thấp và thường xuyên nuốt âm đuôi (-s, -ed, -t).'
  },
  {
    id: 'R2',
    name: 'Chẩn đoán thiếu vốn từ vựng học thuật',
    conditions: ['writing_repetitive_words', 'low_lexical_diversity'],
    conclusion: 'tu_vung_han_che',
    explanation: 'Bài viết dùng đi dùng lại từ đơn giản, thiếu collocations học thuật C1/C2.'
  },
  {
    id: 'R3',
    name: 'Đề xuất lộ trình luyện IPA chuyên sâu',
    conditions: ['phat_am_yeu_am_duoi'],
    conclusion: 'lo_trinh_luyen_ipa',
    explanation: 'Khuyến nghị: Luyện khẩu hình bảng phiên âm quốc tế IPA 15 phút mỗi ngày.'
  },
  {
    id: 'R4',
    name: 'Đề xuất phương pháp Flashcard 3D & Collocations',
    conditions: ['tu_vung_han_che'],
    conclusion: 'lo_trinh_flashcard_3d',
    explanation: 'Khuyến nghị: Học từ vựng theo cụm chủ đề K-Means và Flashcard 3D không gian.'
  },
  {
    id: 'R5',
    name: 'Đạt điều kiện thi thử IELTS Band 6.5+',
    conditions: ['grammar_solid', 'listening_high', 'vocabulary_rich'],
    conclusion: 'san_sang_thi_ielts_target_6.5',
    explanation: 'Học viên đã vững ngữ pháp, nghe tốt và vốn từ phong phú, sẵn sàng ôn đề chuyên sâu.'
  },
  {
    id: 'R6',
    name: 'Cảnh báo bẫy thì Quá Khứ Hoàn Thành',
    conditions: ['two_past_actions', 'action_before_another'],
    conclusion: 'dung_thi_past_perfect',
    explanation: 'Có hai hành động cùng xảy ra trong quá khứ, hành động xảy ra trước bắt buộc chia thì Quá khứ hoàn thành (Had + V3/ed).'
  }
];

// Tạo mạng ngữ nghĩa tri thức toán học & ngoại ngữ
export function createSampleSemanticNetwork() {
  const net = new SemanticNetwork();

  // Nút gốc
  net.addNode('math', 'Toán Học Đại Cương', 'root', { level: 'Cơ bản đến nâng cao' });
  net.addNode('calculus', 'Giải Tích & Vi Phân', 'branch', { field: 'Toán học' });
  net.addNode('algebra', 'Đại Số & Lượng Giác', 'branch', { field: 'Toán học' });
  net.addNode('derivative', 'Đạo Hàm (Derivative)', 'concept', { formula: 'f\'(x) = lim (f(x+h) - f(x))/h' });
  net.addNode('integral', 'Tích Phân (Integral)', 'concept', { formula: 'F(b) - F(a)' });
  net.addNode('power_rule', 'Quy tắc Lũy Thừa', 'rule', { formula: '(x^n)\' = n*x^(n-1)' });
  net.addNode('trig_identities', 'Công Thức Lượng Giác', 'concept', { formula: 'sin^2(x) + cos^2(x) = 1' });

  // Cung quan hệ
  net.addEdge('calculus', 'math', 'is-a', 'Là nhánh của');
  net.addEdge('algebra', 'math', 'is-a', 'Là nhánh của');
  net.addEdge('derivative', 'calculus', 'has-part', 'Thuộc chủ đề');
  net.addEdge('integral', 'calculus', 'has-part', 'Thuộc chủ đề');
  net.addEdge('power_rule', 'derivative', 'requires', 'Áp dụng tính');
  net.addEdge('integral', 'derivative', 'inverse-of', 'Là phép toán ngược của');
  net.addEdge('trig_identities', 'algebra', 'has-part', 'Bao gồm');

  return net;
}
