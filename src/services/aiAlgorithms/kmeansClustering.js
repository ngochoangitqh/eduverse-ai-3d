/**
 * ============================================================================
 * MODULE 2: MACHINE LEARNING - HỌC KHÔNG GIÁM SÁT (UNSUPERVISED LEARNING) - CLO3
 * Thuật toán Phân Cụm K-Means (K-Means Clustering)
 * Tự động gom nhóm từ vựng tiếng Anh chưa gán nhãn dựa trên khoảng cách Euclidean
 * ============================================================================
 */

export class KMeansClustering {
  constructor(k = 3, maxIterations = 50) {
    this.k = k;
    this.maxIterations = maxIterations;
    this.centroids = [];
    this.clusters = []; // Mảng chứa mảng index các điểm của từng cụm
    this.history = []; // Lưu lại từng epoch để trực quan hóa động
    this.data = [];
  }

  // Khoảng cách Euclidean: d(p, q) = sqrt(sum((p_i - q_i)^2))
  static euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  // Khởi tạo Centroids bằng phương pháp K-Means++ (tránh kẹt ở nghiệm cục bộ xấu)
  _initCentroidsPlusPlus(X) {
    const centroids = [];
    // Chọn ngẫu nhiên tâm cụm đầu tiên
    const firstIdx = Math.floor(Math.random() * X.length);
    centroids.push([...X[firstIdx]]);

    while (centroids.length < this.k) {
      const distances = X.map(x => {
        const minDist = Math.min(...centroids.map(c => KMeansClustering.euclideanDistance(x, c)));
        return minDist * minDist;
      });

      const sumDist = distances.reduce((a, b) => a + b, 0);
      let rand = Math.random() * sumDist;
      let selectedIdx = 0;

      for (let i = 0; i < distances.length; i++) {
        rand -= distances[i];
        if (rand <= 0) {
          selectedIdx = i;
          break;
        }
      }
      centroids.push([...X[selectedIdx]]);
    }

    return centroids;
  }

  // Gán mỗi điểm vào centroid gần nhất
  _assignClusters(X, centroids) {
    const clusters = Array.from({ length: this.k }, () => []);

    X.forEach((point, pointIdx) => {
      let minDistance = Infinity;
      let closestCluster = 0;

      centroids.forEach((centroid, clusterIdx) => {
        const dist = KMeansClustering.euclideanDistance(point, centroid);
        if (dist < minDistance) {
          minDistance = dist;
          closestCluster = clusterIdx;
        }
      });

      clusters[closestCluster].push(pointIdx);
    });

    return clusters;
  }

  // Cập nhật tâm cụm bằng tọa độ trung bình (Mean)
  _updateCentroids(X, clusters) {
    const numFeatures = X[0].length;
    return clusters.map((pointIndices, clusterIdx) => {
      if (pointIndices.length === 0) {
        // Cụm rỗng: giữ nguyên centroid cũ
        return this.centroids[clusterIdx];
      }

      const newCentroid = new Array(numFeatures).fill(0);
      pointIndices.forEach(idx => {
        for (let j = 0; j < numFeatures; j++) {
          newCentroid[j] += X[idx][j];
        }
      });

      return newCentroid.map(val => val / pointIndices.length);
    });
  }

  // Tính WCSS (Within-Cluster Sum of Squares) hay Inertia: Thang đo chất lượng phân cụm
  calculateWCSS(X, centroids, clusters) {
    let wcss = 0;
    clusters.forEach((pointIndices, cIdx) => {
      const centroid = centroids[cIdx];
      pointIndices.forEach(pIdx => {
        wcss += Math.pow(KMeansClustering.euclideanDistance(X[pIdx], centroid), 2);
      });
    });
    return Number(wcss.toFixed(2));
  }

  // Huấn luyện K-Means hoàn chỉnh
  fit(X) {
    this.data = X;
    this.centroids = this._initCentroidsPlusPlus(X);
    this.history = [];

    for (let iter = 0; iter < this.maxIterations; iter++) {
      this.clusters = this._assignClusters(X, this.centroids);
      const wcss = this.calculateWCSS(X, this.centroids, this.clusters);

      // Lưu lịch sử để vẽ animation
      this.history.push({
        iteration: iter + 1,
        centroids: JSON.parse(JSON.stringify(this.centroids)),
        clusters: JSON.parse(JSON.stringify(this.clusters)),
        wcss
      });

      const newCentroids = this._updateCentroids(X, this.clusters);

      // Kiểm tra điều kiện hội tụ (tâm cụm không còn di chuyển đáng kể)
      let maxShift = 0;
      for (let i = 0; i < this.k; i++) {
        const shift = KMeansClustering.euclideanDistance(this.centroids[i], newCentroids[i]);
        if (shift > maxShift) maxShift = shift;
      }

      this.centroids = newCentroids;
      if (maxShift < 1e-4) {
        break; // Hội tụ thành công
      }
    }

    return this;
  }

  // Chạy từng bước (Step-by-step Execution) để minh họa sư phạm
  step(X) {
    if (this.centroids.length === 0) {
      this.data = X;
      this.centroids = this._initCentroidsPlusPlus(X);
      this.clusters = this._assignClusters(X, this.centroids);
      return { iteration: 1, centroids: this.centroids, clusters: this.clusters, converged: false };
    }

    const newCentroids = this._updateCentroids(X, this.clusters);
    let maxShift = 0;
    for (let i = 0; i < this.k; i++) {
      const shift = KMeansClustering.euclideanDistance(this.centroids[i], newCentroids[i]);
      if (shift > maxShift) maxShift = shift;
    }

    this.centroids = newCentroids;
    this.clusters = this._assignClusters(X, this.centroids);
    const converged = maxShift < 1e-4;

    return {
      iteration: (this.history.length || 0) + 1,
      centroids: this.centroids,
      clusters: this.clusters,
      wcss: this.calculateWCSS(X, this.centroids, this.clusters),
      converged
    };
  }

  predict(point) {
    let minDistance = Infinity;
    let closestCluster = 0;
    this.centroids.forEach((centroid, idx) => {
      const dist = KMeansClustering.euclideanDistance(point, centroid);
      if (dist < minDistance) {
        minDistance = dist;
        closestCluster = idx;
      }
    });
    return closestCluster;
  }
}

// ============================================================================
// BỘ DỮ LIỆU TỪ VỰNG TIẾNG ANH CHƯA GÁN NHÃN ĐỂ GOM NHÓM (UNLABELED VOCABULARY)
// Vector đặc trưng chuẩn hóa [Độ dài từ (Length), Độ phức tạp âm tiết (Complexity), Tần suất học thuật (Academic Score)]
// ============================================================================
export const UNLABELED_VOCABULARY_DATASET = [
  // Nhóm cơ bản / giao tiếp hàng ngày (Daily Basic)
  { word: 'cat', meaning: 'con mèo', features: [3, 1, 1.2], tag: 'Giao tiếp hằng ngày' },
  { word: 'dog', meaning: 'con chó', features: [3, 1, 1.1], tag: 'Giao tiếp hằng ngày' },
  { word: 'happy', meaning: 'vui vẻ', features: [5, 2, 2.0], tag: 'Giao tiếp hằng ngày' },
  { word: 'water', meaning: 'nước', features: [5, 2, 1.5], tag: 'Giao tiếp hằng ngày' },
  { word: 'friend', meaning: 'bạn bè', features: [6, 1, 2.2], tag: 'Giao tiếp hằng ngày' },
  { word: 'school', meaning: 'trường học', features: [6, 1, 2.5], tag: 'Giao tiếp hằng ngày' },

  // Nhóm học thuật & nghiên cứu (IELTS/Academic Writing)
  { word: 'meticulous', meaning: 'tỉ mỉ, cẩn thận', features: [10, 4, 8.5], tag: 'IELTS Academic' },
  { word: 'ubiquitous', meaning: 'phổ biến khắp nơi', features: [10, 4, 9.0], tag: 'IELTS Academic' },
  { word: 'paradigm', meaning: 'mô hình, hệ chuẩn', features: [8, 3, 8.2], tag: 'IELTS Academic' },
  { word: 'hypothesis', meaning: 'giả thuyết khoa học', features: [10, 4, 8.8], tag: 'IELTS Academic' },
  { word: 'substantiate', meaning: 'chứng minh, xác thực', features: [12, 4, 9.2], tag: 'IELTS Academic' },
  { word: 'comprehensive', meaning: 'toàn diện, bao quát', features: [13, 4, 8.0], tag: 'IELTS Academic' },

  // Nhóm công nghệ & Khoa học máy tính (Tech & Science)
  { word: 'algorithm', meaning: 'thuật toán', features: [9, 3, 7.5], tag: 'Công nghệ & AI' },
  { word: 'database', meaning: 'cơ sở dữ liệu', features: [8, 3, 6.8], tag: 'Công nghệ & AI' },
  { word: 'encryption', meaning: 'mã hóa bảo mật', features: [10, 3, 8.0], tag: 'Công nghệ & AI' },
  { word: 'bandwidth', meaning: 'băng thông mạng', features: [9, 2, 6.5], tag: 'Công nghệ & AI' },
  { word: 'computation', meaning: 'tính toán số học', features: [11, 4, 7.8], tag: 'Công nghệ & AI' },

  // Nhóm kinh tế & thương mại (Business / TOEIC)
  { word: 'negotiate', meaning: 'đàm phán, thương lượng', features: [9, 4, 6.2], tag: 'Kinh doanh & TOEIC' },
  { word: 'revenue', meaning: 'doanh thu công ty', features: [7, 3, 6.0], tag: 'Kinh doanh & TOEIC' },
  { word: 'investment', meaning: 'khoản đầu tư', features: [10, 3, 6.5], tag: 'Kinh doanh & TOEIC' },
  { word: 'stakeholder', meaning: 'bên liên quan', features: [11, 3, 7.0], tag: 'Kinh doanh & TOEIC' },
  { word: 'merger', meaning: 'sáp nhập doanh nghiệp', features: [6, 2, 5.8], tag: 'Kinh doanh & TOEIC' },
];
