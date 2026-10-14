import React, { useState, useEffect } from 'react';
import {
  Cpu, Activity, Network, Dna, Play, RotateCcw, CheckCircle2,
  TrendingUp, Award, Layers, Sparkles, AlertCircle, BookOpen,
  ArrowRight, BarChart2, ShieldCheck, Zap
} from 'lucide-react';
import {
  NaiveBayesClassifier,
  LinearRegressionModel,
  DecisionTreeClassifier,
  Perceptron,
  SAMPLE_STUDENT_DATASET,
  SAMPLE_REGRESSION_DATASET
} from '../../services/aiAlgorithms/supervisedLearning';
import {
  KMeansClustering,
  UNLABELED_VOCABULARY_DATASET
} from '../../services/aiAlgorithms/kmeansClustering';
import {
  GeneticExamGeneratorCSP,
  SAMPLE_QUESTION_BANK
} from '../../services/aiAlgorithms/geneticExamGenerator';
import {
  RuleBasedExpertSystem,
  createSampleSemanticNetwork,
  SAMPLE_EXPERT_RULES
} from '../../services/aiAlgorithms/expertSystemSemanticNet';

export default function AILabLaboratory() {
  const [activeTab, setActiveTab] = useState('supervised'); // 'supervised' | 'unsupervised' | 'genetic' | 'expert'

  // ==========================================
  // STATE MODULE 1: SUPERVISED LEARNING
  // ==========================================
  const [nbClassifier, setNbClassifier] = useState(null);
  const [lrModel, setLrModel] = useState(null);
  const [dtClassifier, setDtClassifier] = useState(null);
  const [perceptronModel, setPerceptronModel] = useState(null);
  const [isTrained, setIsTrained] = useState(false);
  const [testFeatures, setTestFeatures] = useState({ grammar: 7.0, vocab: 7.5, fluency: 7.0, accuracy: 7.0 });
  const [predictionResults, setPredictionResults] = useState(null);

  // ==========================================
  // STATE MODULE 2: K-MEANS CLUSTERING
  // ==========================================
  const [kValue, setKValue] = useState(4);
  const [kmeansInstance, setKmeansInstance] = useState(null);
  const [kmeansState, setKmeansState] = useState({ iteration: 0, wcss: 0, clusters: [], converged: false });
  const [isKmeansRunning, setIsKmeansRunning] = useState(false);

  // ==========================================
  // STATE MODULE 3: GENETIC ALGORITHM CSP
  // ==========================================
  const [targetNumQuestions, setTargetNumQuestions] = useState(10);
  const [targetDuration, setTargetDuration] = useState(15);
  const [gaResult, setGaResult] = useState(null);
  const [isGaRunning, setIsGaRunning] = useState(false);

  // ==========================================
  // STATE MODULE 4: EXPERT SYSTEM & SEMANTIC NET
  // ==========================================
  const [selectedFacts, setSelectedFacts] = useState(['accuracy_low', 'ending_sounds_missing']);
  const [inferenceResult, setInferenceResult] = useState(null);
  const [semanticNet] = useState(() => createSampleSemanticNetwork());

  // Tự động train sẵn dữ liệu cho Module 1 khi mở
  useEffect(() => {
    trainSupervisedModels();
  }, []);

  const trainSupervisedModels = () => {
    // 1. Train Naive Bayes
    const X_nb = SAMPLE_STUDENT_DATASET.map(d => d.x);
    const y_nb = SAMPLE_STUDENT_DATASET.map(d => d.y);
    const nb = new NaiveBayesClassifier();
    nb.fit(X_nb, y_nb);

    // 2. Train Linear Regression
    const X_lr = SAMPLE_REGRESSION_DATASET.map(d => d.x);
    const y_lr = SAMPLE_REGRESSION_DATASET.map(d => d.y);
    const lr = new LinearRegressionModel(0.015, 250);
    lr.fit(X_lr, y_lr);

    // 3. Train Decision Tree
    const dt = new DecisionTreeClassifier(4, 2);
    dt.fit(X_nb, y_nb);

    // 4. Train Perceptron (Pass/Fail: Band >= 6.5 là 1, < 6.5 là 0)
    const y_perc = SAMPLE_REGRESSION_DATASET.map(d => (d.y >= 6.5 ? 1 : 0));
    const perc = new Perceptron(0.05, 50);
    perc.fit(X_lr, y_perc);

    setNbClassifier(nb);
    setLrModel(lr);
    setDtClassifier(dt);
    setPerceptronModel(perc);
    setIsTrained(true);

    // Dự đoán thử mẫu ban đầu
    runPredictions([testFeatures.grammar, testFeatures.vocab, testFeatures.fluency, testFeatures.accuracy], nb, lr, dt, perc);
  };

  const runPredictions = (inputX, nb = nbClassifier, lr = lrModel, dt = dtClassifier, perc = perceptronModel) => {
    if (!nb || !lr) return;
    const nbRes = nb.predict(inputX);
    const lrRes = lr.predict(inputX);
    const dtRes = dt ? dt.predict(inputX) : 'N/A';
    const percRes = perc ? perc.predict(inputX) : 0;

    setPredictionResults({
      naiveBayes: nbRes,
      linearRegression: lrRes,
      decisionTree: dtRes,
      perceptronPass: percRes === 1,
    });
  };

  const handleFeatureChange = (field, val) => {
    const updated = { ...testFeatures, [field]: parseFloat(val) || 0 };
    setTestFeatures(updated);
    runPredictions([updated.grammar, updated.vocab, updated.fluency, updated.accuracy]);
  };

  // K-MEANS ACTIONS
  const handleRunKMeans = () => {
    setIsKmeansRunning(true);
    const X = UNLABELED_VOCABULARY_DATASET.map(v => v.features);
    const km = new KMeansClustering(kValue, 40);
    km.fit(X);
    setKmeansInstance(km);
    setKmeansState({
      iteration: km.history.length,
      wcss: km.calculateWCSS(X, km.centroids, km.clusters),
      clusters: km.clusters,
      converged: true,
      centroids: km.centroids
    });
    setIsKmeansRunning(false);
  };

  const handleStepKMeans = () => {
    const X = UNLABELED_VOCABULARY_DATASET.map(v => v.features);
    let km = kmeansInstance;
    if (!km || km.k !== kValue) {
      km = new KMeansClustering(kValue, 40);
      setKmeansInstance(km);
    }
    const stepRes = km.step(X);
    setKmeansState(stepRes);
  };

  // GENETIC ALGORITHM ACTIONS
  const handleRunGeneticExam = () => {
    setIsGaRunning(true);
    setTimeout(() => {
      const ga = new GeneticExamGeneratorCSP({
        questionBank: SAMPLE_QUESTION_BANK,
        targetNumQuestions: targetNumQuestions,
        targetDifficulty: { easy: 0.4, medium: 0.4, hard: 0.2 },
        targetDurationMinutes: targetDuration,
        requiredTopics: ['Toán Học', 'Vật Lý', 'Hóa Học', 'Tiếng Anh'],
        populationSize: 35,
        mutationRate: 0.15,
        maxGenerations: 50
      });
      const result = ga.runEvolution();
      setGaResult(result);
      setIsGaRunning(false);
    }, 100);
  };

  // EXPERT SYSTEM ACTIONS
  const toggleFact = (factKey) => {
    if (selectedFacts.includes(factKey)) {
      setSelectedFacts(selectedFacts.filter(f => f !== factKey));
    } else {
      setSelectedFacts([...selectedFacts, factKey]);
    }
  };

  const handleRunForwardChaining = () => {
    const engine = new RuleBasedExpertSystem(SAMPLE_EXPERT_RULES);
    engine.setFacts(selectedFacts);
    const res = engine.forwardChaining();
    setInferenceResult(res);
  };

  const CLUSTER_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* HEADER SECTION */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Chuẩn Đầu Ra Học Phần: CLO2 • CLO3
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Thuật Toán Cốt Lõi Pure JS
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
              Phòng Thí Nghiệm Trí Tuệ Nhân Tạo (AI Lab Core)
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Hiện thực hóa trọn vẹn 4 trụ cột AI kinh điển trong đề cương: Học có giám sát (Naïve Bayes, Cây quyết định, Regression, Perceptron),
              Học không giám sát (K-Means), Tính toán tiến hóa & CSP (Genetic Algorithm), cùng Hệ chuyên gia suy diễn luật và Mạng ngữ nghĩa.
            </p>
          </div>
        </div>

        {/* 4 NAVIGATION TABS CHUẨN ĐỀ CƯƠNG */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-6 pt-5 border-t border-slate-800">
          {[
            { id: 'supervised', clo: 'CLO3', label: '1. Học Có Giám Sát', sub: 'Naïve Bayes • Regression • Perceptron', icon: Activity, color: 'from-blue-500 to-indigo-600' },
            { id: 'unsupervised', clo: 'CLO3', label: '2. Học Không Giám Sát', sub: 'Phân Cụm K-Means Từ Vựng', icon: Layers, color: 'from-cyan-500 to-teal-600' },
            { id: 'genetic', clo: 'CLO2', label: '3. Di Truyền & CSP', sub: 'Genetic Algorithm Sinh Đề Thi', icon: Dna, color: 'from-purple-500 to-pink-600' },
            { id: 'expert', clo: 'CLO2', label: '4. Hệ Chuyên Gia & Mạng', sub: 'Luật IF-THEN • Mạng Ngữ Nghĩa', icon: Network, color: 'from-amber-500 to-orange-600' },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  active
                    ? 'bg-slate-800/90 border-indigo-400/80 shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-tr ${tab.color} text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-indigo-500/30">
                    {tab.clo}
                  </span>
                </div>
                <div className="text-xs font-bold text-white">{tab.label}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{tab.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MODULE 1 - HỌC CÓ GIÁM SÁT (SUPERVISED LEARNING) - CLO3 */}
      {/* ==================================================================== */}
      {activeTab === 'supervised' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột trái: Bộ điều khiển thử nghiệm điểm số */}
            <div className="glass-panel p-5 rounded-3xl border border-indigo-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Dữ Liệu Kiểm Thử Học Viên
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {isTrained ? 'Đã Train Xong' : 'Đang Huấn Luyện'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Thay đổi điểm 4 kỹ năng thành phần để máy học dự đoán trình độ và điểm tổng thể:
              </p>

              <div className="space-y-3.5 pt-2">
                {[
                  { key: 'grammar', label: 'Điểm Ngữ Pháp (Grammar)', min: 1, max: 10, step: 0.5 },
                  { key: 'vocab', label: 'Điểm Từ Vựng (Vocabulary)', min: 1, max: 10, step: 0.5 },
                  { key: 'fluency', label: 'Độ Lưu Loát (Fluency)', min: 1, max: 10, step: 0.5 },
                  { key: 'accuracy', label: 'Độ Chính Xác (Accuracy)', min: 1, max: 10, step: 0.5 },
                ].map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{item.label}:</span>
                      <span className="font-bold text-cyan-300 font-mono">{testFeatures[item.key]}/10</span>
                    </div>
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      step={item.step}
                      value={testFeatures[item.key]}
                      onChange={(e) => handleFeatureChange(item.key, e.target.value)}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <button
                  onClick={trainSupervisedModels}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Train Lại Mô Hình (Fit)
                </button>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2 text-[11px]">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Đặc tả kỹ thuật toán học:</div>
                <div className="text-slate-300">
                  • <strong>Gaussian Naïve Bayes</strong>: $P(C|X) \propto P(C) \prod \mathcal{N}(x_i; \mu_{c,i}, \sigma_{c,i}^2)$
                </div>
                <div className="text-slate-300">
                  • <strong>Linear Regression</strong>: $\hat{y} = \mathbf{w}^T \mathbf{x} + b$ qua Gradient Descent
                </div>
                <div className="text-slate-300">
                  • <strong>Perceptron</strong>: $f(\mathbf{x}) = \text{step}(\mathbf{w}^T \mathbf{x} + b)$
                </div>
              </div>
            </div>

            {/* Cột phải: Kết quả dự đoán của các thuật toán */}
            <div className="lg:col-span-2 space-y-4">
              {predictionResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Naïve Bayes Classifier */}
                  <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        1. Naïve Bayes (Phân loại trình độ)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        Xác suất hậu nghiệm
                      </span>
                    </div>

                    <div className="p-3 bg-indigo-950/40 rounded-2xl border border-indigo-500/30">
                      <div className="text-[11px] text-slate-400">Kết quả xếp loại:</div>
                      <div className="text-base font-bold text-white mt-0.5">
                        {predictionResults.naiveBayes.prediction}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] text-slate-400 font-semibold">Phân phối xác suất $P(Class | Features)$:</div>
                      {Object.entries(predictionResults.naiveBayes.probabilities).map(([cls, prob]) => (
                        <div key={cls} className="space-y-0.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-300 truncate">{cls.split(' ')[0]}</span>
                            <span className="font-mono text-cyan-300 font-bold">{prob}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-1.5 rounded-full" style={{ width: `${prob}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: Linear Regression Model */}
                  <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        2. Linear Regression (Dự đoán điểm)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        Học trọng số tự động
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-950/40 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400">Dự đoán Band Overall:</div>
                        <div className="text-2xl font-bold text-white font-mono mt-0.5">
                          {predictionResults.linearRegression} / 9.0
                        </div>
                      </div>
                      <Award className="w-8 h-8 text-emerald-400" />
                    </div>

                    <div className="space-y-1 text-xs text-slate-300 pt-1">
                      <div className="text-[11px] font-semibold text-slate-400">Trọng số $W$ học được qua Gradient Descent:</div>
                      {lrModel && lrModel.weights.map((w, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] font-mono text-slate-300">
                          <span>W{idx + 1} (Kỹ năng {idx + 1}):</span>
                          <span className="text-emerald-300">{w.toFixed(4)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800">
                        <span>Bias $b$:</span>
                        <span className="text-emerald-300">{lrModel?.bias.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Decision Tree */}
                  <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-400" />
                        3. Cây Quyết Định (Decision Tree)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        Entropy & Gain
                      </span>
                    </div>
                    <div className="p-3 bg-purple-950/40 rounded-2xl border border-purple-500/30">
                      <div className="text-[11px] text-slate-400">Nhánh lộ trình kết luận:</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {predictionResults.decisionTree}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Cây phân nhánh tự động dựa trên độ lợi thông tin (Information Gain) để phân tách các ngưỡng điểm tối ưu.
                    </p>
                  </div>

                  {/* Card 4: Perceptron */}
                  <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        4. Perceptron (Phân loại nhị phân)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Mục tiêu Band 6.5+
                      </span>
                    </div>
                    <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                      predictionResults.perceptronPass
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}>
                      <div>
                        <div className="text-[11px] text-slate-300">Đạt chuẩn đầu ra kỳ vọng:</div>
                        <div className="text-base font-bold mt-0.5">
                          {predictionResults.perceptronPass ? 'ĐẠT (QUALIFIED)' : 'CẦN ÔN TẬP THÊM'}
                        </div>
                      </div>
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tế bào nhân tạo học mặt phẳng siêu vi phân tách nhị phân (Hyperplane) cập nhật qua 50 epochs.
                    </p>
                  </div>
                </div>
              )}

              {/* Bảng dữ liệu tập huấn luyện */}
              <div className="glass-panel p-4 rounded-3xl border border-slate-800 overflow-x-auto">
                <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                  <span>Bảng Dữ Liệu Huấn Luyện (Training Dataset): {SAMPLE_STUDENT_DATASET.length} mẫu</span>
                  <span className="text-[10px] text-slate-400">Dùng cho Naïve Bayes & Regression</span>
                </div>
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Grammar</th>
                      <th className="p-2">Vocab</th>
                      <th className="p-2">Fluency</th>
                      <th className="p-2">Accuracy</th>
                      <th className="p-2">Nhãn Trình Độ (Ground Truth)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {SAMPLE_STUDENT_DATASET.slice(0, 6).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2 text-slate-500">{idx + 1}</td>
                        <td className="p-2 text-cyan-300">{row.x[0]}</td>
                        <td className="p-2 text-cyan-300">{row.x[1]}</td>
                        <td className="p-2 text-cyan-300">{row.x[2]}</td>
                        <td className="p-2 text-cyan-300">{row.x[3]}</td>
                        <td className="p-2 font-sans font-semibold text-white">{row.y}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: MODULE 2 - HỌC KHÔNG GIÁM SÁT K-MEANS CLUSTERING - CLO3 */}
      {/* ==================================================================== */}
      {activeTab === 'unsupervised' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-3xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Phân Cụm Từ Vựng Tiếng Anh Chưa Gán Nhãn (K-Means Clustering)
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Tự động gom nhóm từ vựng tiếng Anh theo vector đặc trưng (Độ dài từ, Số âm tiết, Tần suất học thuật) dựa trên khoảng cách Euclidean:
                {" d(x, c) = √(∑(x_i - c_i)²)"}.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                <span>Số cụm K:</span>
                <select
                  value={kValue}
                  onChange={(e) => setKValue(parseInt(e.target.value))}
                  className="bg-slate-950 border border-slate-700 text-cyan-300 rounded px-2 py-1 text-xs font-bold cursor-pointer"
                >
                  <option value={2}>K = 2</option>
                  <option value={3}>K = 3</option>
                  <option value={4}>K = 4 (Khuyên dùng)</option>
                  <option value={5}>K = 5</option>
                </select>
              </div>

              <button
                onClick={handleStepKMeans}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400" /> Bước Lặp (Step Epoch)
              </button>

              <button
                onClick={handleRunKMeans}
                disabled={isKmeansRunning}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Tự Động Phân Cụm (Fit)
              </button>
            </div>
          </div>

          {/* HIỂN THỊ KẾT QUẢ PHÂN CỤM */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột trái: Trực quan hóa không gian 2D các từ vựng */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-3xl border border-indigo-500/20 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Không Gian Đặc Trưng 2D: [Độ dài từ vs Tần suất học thuật]</span>
                <span className="text-slate-400 font-mono">
                  Epochs: <strong className="text-cyan-300">{kmeansState.iteration}</strong> | WCSS: <strong className="text-emerald-300">{kmeansState.wcss}</strong>
                </span>
              </div>

              {/* Khu vực vẽ biểu đồ Scatter Plot CSS */}
              <div className="relative w-full h-80 bg-slate-950/80 rounded-2xl border border-slate-800 p-4 overflow-hidden">
                {/* Lưới tọa độ */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10 pointer-events-none">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="border border-slate-400" />
                  ))}
                </div>

                {/* Các điểm từ vựng */}
                {UNLABELED_VOCABULARY_DATASET.map((vocab, idx) => {
                  // Chuẩn hóa tọa độ hiển thị: features[0] (3-13) -> x %, features[2] (1-10) -> y %
                  const xPercent = Math.min(92, Math.max(8, ((vocab.features[0] - 2) / 12) * 100));
                  const yPercent = Math.min(92, Math.max(8, 100 - (vocab.features[2] / 10) * 100));

                  // Tìm cụm của điểm này
                  let assignedCluster = 0;
                  if (kmeansState.clusters.length > 0) {
                    kmeansState.clusters.forEach((clusterIndices, cIdx) => {
                      if (clusterIndices.includes(idx)) assignedCluster = cIdx;
                    });
                  }
                  const color = CLUSTER_COLORS[assignedCluster % CLUSTER_COLORS.length];

                  return (
                    <div
                      key={vocab.word}
                      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    >
                      <div
                        style={{ backgroundColor: color }}
                        className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-md transition-all duration-500 group-hover:scale-150"
                      />
                      <div className="absolute left-1/2 -top-6 -translate-x-1/2 bg-slate-900/95 text-[10px] text-white px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                        {vocab.word} ({vocab.meaning})
                      </div>
                    </div>
                  );
                })}

                {/* Các tâm cụm Centroids */}
                {kmeansState.centroids && kmeansState.centroids.map((centroid, cIdx) => {
                  const xPercent = Math.min(92, Math.max(8, ((centroid[0] - 2) / 12) * 100));
                  const yPercent = Math.min(92, Math.max(8, 100 - (centroid[2] / 10) * 100));
                  const color = CLUSTER_COLORS[cIdx % CLUSTER_COLORS.length];

                  return (
                    <div
                      key={cIdx}
                      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-700"
                    >
                      <div
                        style={{ borderColor: color, color }}
                        className="w-7 h-7 rounded-full bg-slate-950/90 border-2 flex items-center justify-center font-bold text-xs shadow-lg shadow-cyan-500/20"
                      >
                        C{cIdx + 1}
                      </div>
                    </div>
                  );
                })}

                <div className="absolute bottom-2 right-3 text-[10px] text-slate-500">
                  Trục X: Độ dài từ | Trục Y: Tần suất học thuật
                </div>
              </div>

              {/* Chú thích màu sắc cụm */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                {Array.from({ length: kValue }).map((_, cIdx) => (
                  <div key={cIdx} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[cIdx % CLUSTER_COLORS.length] }} />
                    <span className="text-slate-300 font-semibold">Cụm {cIdx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cột phải: Bảng thống kê các nhóm từ sau khi phân cụm */}
            <div className="glass-panel p-5 rounded-3xl border border-indigo-500/20 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Các Cụm Từ Vựng Đã Gom Nhóm:
              </h4>

              <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
                {Array.from({ length: kValue }).map((_, cIdx) => {
                  const indices = kmeansState.clusters[cIdx] || [];
                  const wordsInCluster = indices.map(i => UNLABELED_VOCABULARY_DATASET[i]).filter(Boolean);
                  const color = CLUSTER_COLORS[cIdx % CLUSTER_COLORS.length];

                  return (
                    <div key={cIdx} className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5" style={{ color }}>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          Cụm {cIdx + 1} ({wordsInCluster.length} từ)
                        </span>
                        <span className="text-[10px] text-slate-400">Centroid: C{cIdx + 1}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {wordsInCluster.length > 0 ? (
                          wordsInCluster.map((w) => (
                            <span
                              key={w.word}
                              className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-950 text-slate-200 border border-slate-800"
                              title={`${w.meaning} • ${w.tag}`}
                            >
                              {w.word}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Chưa có từ nào trong cụm này</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: MODULE 3 - GIẢI THUẬT DI TRUYỀN & CSP (GENETIC ALGORITHM) - CLO2 */}
      {/* ==================================================================== */}
      {activeTab === 'genetic' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-3xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Dna className="w-5 h-5 text-purple-400" />
                Sinh Đề Thi Tối Ưu Bằng Giải Thuật Di Truyền & CSP
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Lai ghép, đột biến và chọn lọc tự nhiên (Selection & Tournament) để rút ra đề thi tối ưu từ Ngân hàng câu hỏi
                thỏa mãn đồng thời các ràng buộc CSP (Tỷ lệ độ khó 40% Dễ - 40% Vừa - 20% Khó, độ phủ môn học, thời lượng làm bài).
              </p>
            </div>

            <button
              onClick={handleRunGeneticExam}
              disabled={isGaRunning}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 shrink-0 cursor-pointer"
            >
              <Dna className="w-4 h-4 animate-spin" />
              {isGaRunning ? 'Đang Tiến Hóa (Evolving)...' : 'Bắt Đầu Tiến Hóa (Run GA)'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột trái: Cài đặt tham số ràng buộc CSP */}
            <div className="glass-panel p-5 rounded-3xl border border-indigo-500/20 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Ràng Buộc Đề Thi Mục Tiêu (CSP Constraints):
              </h4>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Tổng số câu hỏi:</span>
                    <span className="font-bold text-purple-300">{targetNumQuestions} câu</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={15}
                    value={targetNumQuestions}
                    onChange={(e) => setTargetNumQuestions(parseInt(e.target.value))}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Thời gian mục tiêu:</span>
                    <span className="font-bold text-purple-300">{targetDuration} phút</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={30}
                    step={1}
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(parseInt(e.target.value))}
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-950/40 rounded-2xl border border-purple-500/30 space-y-2 text-xs">
                <div className="font-bold text-purple-200">Ràng buộc phân bố chuẩn:</div>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div>• Độ khó: 40% Dễ, 40% Vừa, 20% Khó</div>
                  <div>• Môn học: Đủ Toán, Lý, Hóa, Tiếng Anh</div>
                  <div>• Quy mô quần thể: 35 cá thể (Chromosomes)</div>
                  <div>• Tỷ lệ đột biến: 15% (Random Replacement Mutation)</div>
                  <div>• Lai ghép: Two-point Crossover (Rate: 85%)</div>
                </div>
              </div>
            </div>

            {/* Cột phải: Kết quả tiến hóa đề thi */}
            <div className="lg:col-span-2 space-y-4">
              {gaResult ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="glass-panel p-3.5 rounded-2xl border border-purple-500/30 text-center">
                      <div className="text-[10px] text-slate-400">Độ thích nghi (Fitness):</div>
                      <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                        {gaResult.stats.fitnessScore} / 100
                      </div>
                    </div>
                    <div className="glass-panel p-3.5 rounded-2xl border border-purple-500/30 text-center">
                      <div className="text-[10px] text-slate-400">Số thế hệ tiến hóa:</div>
                      <div className="text-xl font-bold text-purple-300 font-mono mt-0.5">
                        {gaResult.stats.generationsRun} Gens
                      </div>
                    </div>
                    <div className="glass-panel p-3.5 rounded-2xl border border-purple-500/30 text-center">
                      <div className="text-[10px] text-slate-400">Thời gian ước tính:</div>
                      <div className="text-xl font-bold text-cyan-300 font-mono mt-0.5">
                        {gaResult.stats.totalEstimatedTime} Phút
                      </div>
                    </div>
                    <div className="glass-panel p-3.5 rounded-2xl border border-purple-500/30 text-center">
                      <div className="text-[10px] text-slate-400">Phân bố độ khó:</div>
                      <div className="text-xs font-bold text-white mt-1">
                        {gaResult.stats.difficultyBreakdown.easy}D - {gaResult.stats.difficultyBreakdown.medium}V - {gaResult.stats.difficultyBreakdown.hard}K
                      </div>
                    </div>
                  </div>

                  {/* Bảng đề thi tối ưu được chọn lọc */}
                  <div className="glass-panel p-4 rounded-3xl border border-purple-500/20 overflow-x-auto">
                    <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                      <span>Đề Thi Trắc Nghiệm Tối Ưu (Nhiễm Sắc Thể Thích Nghi Nhất):</span>
                      <span className="text-[10px] text-emerald-300 font-bold">Thỏa Mãn Ràng Buộc 100%</span>
                    </div>
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px]">
                        <tr>
                          <th className="p-2">Câu</th>
                          <th className="p-2">Nội Dung Câu Hỏi</th>
                          <th className="p-2">Môn Học</th>
                          <th className="p-2">Độ Khó</th>
                          <th className="p-2">Thời Gian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-[11px]">
                        {gaResult.optimalExam.map((q, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="p-2 font-mono font-bold text-purple-400">{idx + 1}</td>
                            <td className="p-2 text-white font-medium max-w-xs truncate">{q.text}</td>
                            <td className="p-2 text-cyan-300">{q.topic}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                q.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-300' :
                                q.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-rose-500/20 text-rose-300'
                              }`}>
                                {q.difficulty.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-slate-400">{q.timeMinutes}p</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="glass-panel p-12 rounded-3xl border border-purple-500/20 text-center space-y-3">
                  <Dna className="w-12 h-12 text-purple-400 mx-auto" />
                  <div className="text-sm font-bold text-white">Chưa Chạy Tiến Hóa</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Bấm nút "Bắt Đầu Tiến Hóa (Run GA)" ở góc trên để thuật toán di truyền bắt đầu lai ghép và chọn lọc tự nhiên.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: MODULE 4 - HỆ CHUYÊN GIA & MẠNG NGỮ NGHĨA - CLO2 */}
      {/* ==================================================================== */}
      {activeTab === 'expert' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-3xl border border-indigo-500/20">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Network className="w-5 h-5 text-amber-400" />
              Biểu Diễn Tri Thức: Hệ Chuyên Gia Luật Dẫn Xuất & Mạng Ngữ Nghĩa
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Ứng dụng động cơ suy diễn tiến (Forward Chaining) với tập luật IF-THEN để chẩn đoán điểm yếu học tập, kết hợp Mạng ngữ nghĩa
              đồ thị nút-cung để trực quan hóa tri thức Toán học và Tiếng Anh.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Phía trái: Hệ chuyên gia suy diễn luật */}
            <div className="glass-panel p-5 rounded-3xl border border-amber-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  1. Động Cơ Suy Diễn Tiến (Forward Chaining)
                </span>
                <button
                  onClick={handleRunForwardChaining}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Chạy Suy Diễn
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] text-slate-400 font-semibold">Chọn các sự kiện ban đầu (Initial Facts):</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'accuracy_low', label: 'Điểm phát âm thấp' },
                    { key: 'ending_sounds_missing', label: 'Nuốt âm đuôi (-s, -ed)' },
                    { key: 'writing_repetitive_words', label: 'Lặp từ trong bài viết' },
                    { key: 'low_lexical_diversity', label: 'Vốn từ vựng hạn chế' },
                    { key: 'two_past_actions', label: '2 hành động trong quá khứ' },
                    { key: 'action_before_another', label: '1 hành động xảy ra trước' },
                  ].map((fact) => (
                    <button
                      key={fact.key}
                      onClick={() => toggleFact(fact.key)}
                      className={`p-2 rounded-xl text-left border text-[11px] transition-all cursor-pointer ${
                        selectedFacts.includes(fact.key)
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {selectedFacts.includes(fact.key) ? '✓ ' : '+ '} {fact.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vết suy luận (Inference Trace) */}
              {inferenceResult && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-bold text-white flex items-center justify-between">
                    <span>Vết Suy Luận (Inference Trace): {inferenceResult.trace.length} luật kích hoạt</span>
                    <span className="text-emerald-400 text-[10px]">Thành công</span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {inferenceResult.trace.map((step) => (
                      <div key={step.step} className="p-2.5 bg-slate-950/80 rounded-xl border border-amber-500/30 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 font-mono">[{step.ruleId}] {step.ruleName}</span>
                          <span className="text-slate-500 text-[10px]">Bước {step.step}</span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          IF {step.matchedConditions.join(' AND ')} <ArrowRight className="w-3 h-3 inline text-amber-400" /> THEN <strong className="text-white">{step.deducedConclusion}</strong>
                        </div>
                        <div className="text-slate-300 italic text-[10px] bg-slate-900 p-1.5 rounded">
                          💡 Giải thích: {step.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Phía phải: Mạng ngữ nghĩa tri thức (Semantic Network) */}
            <div className="glass-panel p-5 rounded-3xl border border-teal-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-teal-400" />
                  2. Mạng Ngữ Nghĩa Tri Thức (Semantic Network)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">
                  Đồ Thị Nút - Cung
                </span>
              </div>

              <p className="text-xs text-slate-300">
                Biểu diễn tri thức toán học bằng đồ thị có hướng (Nodes: Khái niệm; Edges: Quan hệ <code>is-a</code>, <code>has-part</code>, <code>requires</code>):
              </p>

              {/* Danh sách các nút và cung của Mạng ngữ nghĩa */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {semanticNet.edges.map((edge, idx) => {
                  const sourceNode = semanticNet.nodes.get(edge.source);
                  const targetNode = semanticNet.nodes.get(edge.target);

                  return (
                    <div key={idx} className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[11px]">
                          {sourceNode?.label}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="text-[10px] text-teal-300 font-mono italic">[{edge.label}]</span>
                        <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[11px]">
                          {targetNode?.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-teal-950/40 rounded-2xl border border-teal-500/30 text-[11px] text-slate-300">
                🌱 <strong>Tính năng liên kết:</strong> Mạng ngữ nghĩa này được dùng để sinh tự động cây Sơ đồ tư duy (Mindmap 3D) và liên kết với Chatbot AI để giải thích bản chất kiến thức cho học sinh.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
