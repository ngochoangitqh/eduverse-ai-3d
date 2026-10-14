/**
 * ============================================================================
 * MODULE 1: MACHINE LEARNING - HỌC CÓ GIÁM SÁT (SUPERVISED LEARNING) - CLO3
 * 1. Naïve Bayes Classifier (Gaussian & Multinomial)
 * 2. Cây Quyết Định (Decision Tree - Information Gain / Gini)
 * 3. Hồi Quy Tuyến Tính (Linear Regression with Gradient Descent)
 * 4. Perceptron (Single-layer Neural Unit with Step/Sigmoid Activation)
 * ============================================================================
 */

// ==========================================
// 1. NAÏVE BAYES CLASSIFIER (Phân loại trình độ IELTS/TOEIC)
// P(C|X) = P(C) * Π P(x_i|C) / P(X)
// ==========================================
export class NaiveBayesClassifier {
  constructor() {
    this.classCounts = {};
    this.totalSamples = 0;
    this.featureStats = {}; // { class: { featureIndex: { mean, variance } } }
    this.classes = [];
  }

  fit(X, y) {
    this.totalSamples = X.length;
    this.classes = Array.from(new Set(y));
    const numFeatures = X[0].length;

    // Khởi tạo bộ đếm
    this.classes.forEach(c => {
      this.classCounts[c] = 0;
      this.featureStats[c] = [];
      for (let i = 0; i < numFeatures; i++) {
        this.featureStats[c].push({ values: [] });
      }
    });

    // Thu thập dữ liệu theo từng nhãn lớp
    for (let i = 0; i < X.length; i++) {
      const c = y[i];
      this.classCounts[c]++;
      for (let j = 0; j < numFeatures; j++) {
        this.featureStats[c][j].values.push(X[i][j]);
      }
    }

    // Tính Mean và Variance (Gaussian Naïve Bayes)
    this.classes.forEach(c => {
      for (let j = 0; j < numFeatures; j++) {
        const vals = this.featureStats[c][j].values;
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (vals.length || 1) + 1e-4; // epsilon tránh chia cho 0
        this.featureStats[c][j] = { mean, variance };
      }
    });

    return this;
  }

  // Gaussian Probability Density Function: f(x) = (1 / sqrt(2*pi*var)) * exp(-(x - mean)^2 / (2*var))
  _calculateGaussianProb(x, mean, variance) {
    const exponent = Math.exp(-Math.pow(x - mean, 2) / (2 * variance));
    return (1 / Math.sqrt(2 * Math.PI * variance)) * exponent;
  }

  predict(x) {
    let bestClass = null;
    let maxPosterior = -Infinity;
    const scores = {};

    this.classes.forEach(c => {
      // Prior P(C) = count(C) / total
      let logLikelihood = Math.log(this.classCounts[c] / this.totalSamples);

      for (let j = 0; j < x.length; j++) {
        const { mean, variance } = this.featureStats[c][j];
        const prob = Math.max(this._calculateGaussianProb(x[j], mean, variance), 1e-9);
        logLikelihood += Math.log(prob);
      }

      scores[c] = logLikelihood;
      if (logLikelihood > maxPosterior) {
        maxPosterior = logLikelihood;
        bestClass = c;
      }
    });

    // Chuyển đổi log-likelihood thành xác suất phần trăm chuẩn hóa
    const expScores = {};
    let sumExp = 0;
    this.classes.forEach(c => {
      expScores[c] = Math.exp(scores[c] - maxPosterior);
      sumExp += expScores[c];
    });
    const probabilities = {};
    this.classes.forEach(c => {
      probabilities[c] = Math.round((expScores[c] / sumExp) * 100);
    });

    return { prediction: bestClass, probabilities };
  }
}

// ==========================================
// 2. LINEAR REGRESSION (Dự đoán điểm tổng thể từ điểm thành phần)
// y = w1*x1 + w2*x2 + ... + wn*xn + b
// Học trọng số qua Gradient Descent
// ==========================================
export class LinearRegressionModel {
  constructor(learningRate = 0.01, epochs = 200) {
    this.lr = learningRate;
    this.epochs = epochs;
    this.weights = [];
    this.bias = 0;
    this.lossHistory = [];
  }

  fit(X, y) {
    const nSamples = X.length;
    const nFeatures = X[0].length;
    this.weights = new Array(nFeatures).fill(0).map(() => Math.random() * 0.1);
    this.bias = 0;
    this.lossHistory = [];

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      let dW = new Array(nFeatures).fill(0);
      let dB = 0;
      let totalLoss = 0;

      for (let i = 0; i < nSamples; i++) {
        // Dự đoán y_pred = dot(X[i], weights) + bias
        let yPred = this.bias;
        for (let j = 0; j < nFeatures; j++) {
          yPred += X[i][j] * this.weights[j];
        }

        const error = yPred - y[i];
        totalLoss += error * error;

        for (let j = 0; j < nFeatures; j++) {
          dW[j] += (2 / nSamples) * error * X[i][j];
        }
        dB += (2 / nSamples) * error;
      }

      // Cập nhật weights và bias
      for (let j = 0; j < nFeatures; j++) {
        this.weights[j] -= this.lr * dW[j];
      }
      this.bias -= this.lr * dB;

      const mse = totalLoss / nSamples;
      if (epoch % 20 === 0 || epoch === this.epochs - 1) {
        this.lossHistory.push({ epoch, mse: Number(mse.toFixed(4)) });
      }
    }

    return this;
  }

  predict(x) {
    let yPred = this.bias;
    for (let j = 0; j < x.length; j++) {
      yPred += x[j] * this.weights[j];
    }
    return Number(yPred.toFixed(2));
  }
}

// ==========================================
// 3. DECISION TREE CLASSIFIER (Cây Quyết Định - Phân loại lộ trình học)
// ==========================================
export class DecisionTreeNode {
  constructor(feature = null, threshold = null, left = null, right = null, value = null) {
    this.feature = feature;
    this.threshold = threshold;
    this.left = left;
    this.right = right;
    this.value = value; // Nhãn nếu là node lá
  }

  isLeaf() {
    return this.value !== null;
  }
}

export class DecisionTreeClassifier {
  constructor(maxDepth = 4, minSamplesSplit = 2) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.root = null;
  }

  fit(X, y) {
    this.root = this._buildTree(X, y, 0);
    return this;
  }

  _entropy(y) {
    const counts = {};
    y.forEach(label => { counts[label] = (counts[label] || 0) + 1; });
    let ent = 0;
    const n = y.length;
    Object.values(counts).forEach(count => {
      const p = count / n;
      if (p > 0) ent -= p * Math.log2(p);
    });
    return ent;
  }

  _bestSplit(X, y) {
    let bestGain = -1;
    let bestFeature = null;
    let bestThreshold = null;
    const currentEntropy = this._entropy(y);
    const nFeatures = X[0].length;

    for (let f = 0; f < nFeatures; f++) {
      const values = X.map(row => row[f]);
      const uniqueVals = Array.from(new Set(values)).sort((a, b) => a - b);

      for (let i = 0; i < uniqueVals.length - 1; i++) {
        const threshold = (uniqueVals[i] + uniqueVals[i + 1]) / 2;
        const leftIdxs = [];
        const rightIdxs = [];

        for (let j = 0; j < X.length; j++) {
          if (X[j][f] <= threshold) leftIdxs.push(j);
          else rightIdxs.push(j);
        }

        if (leftIdxs.length === 0 || rightIdxs.length === 0) continue;

        const leftY = leftIdxs.map(idx => y[idx]);
        const rightY = rightIdxs.map(idx => y[idx]);

        const gain = currentEntropy - (
          (leftY.length / y.length) * this._entropy(leftY) +
          (rightY.length / y.length) * this._entropy(rightY)
        );

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    return { bestGain, bestFeature, bestThreshold };
  }

  _mostCommon(y) {
    const counts = {};
    let max = -1;
    let label = y[0];
    y.forEach(val => {
      counts[val] = (counts[val] || 0) + 1;
      if (counts[val] > max) {
        max = counts[val];
        label = val;
      }
    });
    return label;
  }

  _buildTree(X, y, depth) {
    const numSamples = X.length;
    const numLabels = new Set(y).size;

    // Điều kiện dừng: đạt độ sâu tối đa hoặc đã thuần nhất
    if (depth >= this.maxDepth || numLabels === 1 || numSamples < this.minSamplesSplit) {
      return new DecisionTreeNode(null, null, null, null, this._mostCommon(y));
    }

    const { bestGain, bestFeature, bestThreshold } = this._bestSplit(X, y);
    if (bestGain <= 0 || bestFeature === null) {
      return new DecisionTreeNode(null, null, null, null, this._mostCommon(y));
    }

    const leftX = [], leftY = [], rightX = [], rightY = [];
    for (let i = 0; i < X.length; i++) {
      if (X[i][bestFeature] <= bestThreshold) {
        leftX.push(X[i]);
        leftY.push(y[i]);
      } else {
        rightX.push(X[i]);
        rightY.push(y[i]);
      }
    }

    const left = this._buildTree(leftX, leftY, depth + 1);
    const right = this._buildTree(rightX, rightY, depth + 1);
    return new DecisionTreeNode(bestFeature, bestThreshold, left, right);
  }

  predict(x) {
    let node = this.root;
    while (!node.isLeaf()) {
      if (x[node.feature] <= node.threshold) {
        node = node.left;
      } else {
        node = node.right;
      }
    }
    return node.value;
  }
}

// ==========================================
// 4. PERCEPTRON (Đơn vị tế bào thần kinh học nhị phân / phân loại)
// f(x) = step(w*x + b)
// ==========================================
export class Perceptron {
  constructor(learningRate = 0.05, epochs = 50) {
    this.lr = learningRate;
    this.epochs = epochs;
    this.weights = [];
    this.bias = 0;
  }

  fit(X, y) {
    const nFeatures = X[0].length;
    this.weights = new Array(nFeatures).fill(0);
    this.bias = 0;

    for (let epoch = 0; epoch < this.epochs; epoch++) {
      for (let i = 0; i < X.length; i++) {
        let linearOutput = this.bias;
        for (let j = 0; j < nFeatures; j++) {
          linearOutput += X[i][j] * this.weights[j];
        }
        const yPred = linearOutput >= 0 ? 1 : 0;
        const update = this.lr * (y[i] - yPred);

        for (let j = 0; j < nFeatures; j++) {
          this.weights[j] += update * X[i][j];
        }
        this.bias += update;
      }
    }
    return this;
  }

  predict(x) {
    let linearOutput = this.bias;
    for (let j = 0; j < x.length; j++) {
      linearOutput += x[j] * this.weights[j];
    }
    return linearOutput >= 0 ? 1 : 0;
  }
}

// ============================================================================
// DỮ LIỆU MẪU ĐỂ HUẤN LUYỆN TRỰC TIẾP TRÊN TRÌNH DUYỆT (DEMO DATASET)
// ============================================================================
export const SAMPLE_STUDENT_DATASET = [
  // [GrammarScore(0-10), VocabScore(0-10), FluencyScore(0-10), AccuracyScore(0-10)] -> Band Label
  { x: [3.5, 4.0, 3.0, 3.5], y: 'Beginner (Band 3.5 - 4.5)' },
  { x: [4.0, 4.5, 4.0, 4.0], y: 'Beginner (Band 3.5 - 4.5)' },
  { x: [4.5, 4.0, 3.5, 4.0], y: 'Beginner (Band 3.5 - 4.5)' },
  { x: [5.5, 5.0, 5.5, 5.0], y: 'Intermediate (Band 5.0 - 6.0)' },
  { x: [6.0, 5.5, 6.0, 5.5], y: 'Intermediate (Band 5.0 - 6.0)' },
  { x: [5.0, 6.0, 5.5, 6.0], y: 'Intermediate (Band 5.0 - 6.0)' },
  { x: [6.5, 6.0, 6.5, 6.0], y: 'Intermediate (Band 5.0 - 6.0)' },
  { x: [7.0, 7.5, 7.0, 7.5], y: 'Advanced (Band 6.5 - 7.5)' },
  { x: [7.5, 7.0, 7.5, 7.0], y: 'Advanced (Band 6.5 - 7.5)' },
  { x: [8.0, 7.5, 8.0, 7.5], y: 'Advanced (Band 6.5 - 7.5)' },
  { x: [8.5, 8.5, 8.0, 8.5], y: 'Master (Band 8.0 - 9.0)' },
  { x: [9.0, 8.5, 9.0, 8.5], y: 'Master (Band 8.0 - 9.0)' },
  { x: [9.0, 9.5, 9.0, 9.5], y: 'Master (Band 8.0 - 9.0)' },
];

export const SAMPLE_REGRESSION_DATASET = [
  // [TaskAchievement, CoherenceCohesion, LexicalResource, GrammaticalRange] -> Overall Band Score
  { x: [4.0, 4.0, 4.0, 4.0], y: 4.0 },
  { x: [5.0, 5.0, 5.0, 5.0], y: 5.0 },
  { x: [5.5, 6.0, 5.5, 5.0], y: 5.5 },
  { x: [6.0, 6.5, 6.0, 6.0], y: 6.0 },
  { x: [6.5, 7.0, 6.5, 6.5], y: 6.5 },
  { x: [7.0, 7.5, 7.0, 7.0], y: 7.0 },
  { x: [7.5, 8.0, 7.5, 7.5], y: 7.5 },
  { x: [8.0, 8.5, 8.0, 8.0], y: 8.0 },
  { x: [8.5, 9.0, 8.5, 8.5], y: 8.5 },
  { x: [9.0, 9.0, 9.0, 9.0], y: 9.0 },
];
