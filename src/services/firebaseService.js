import {
  auth, db, storage, googleProvider, isFirebaseConfigured
} from '../config/firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

/**
 * ====================================================
 * 1. DỊCH VỤ XÁC THỰC NGƯỜI DÙNG (AUTHENTICATION)
 * ====================================================
 */

export const loginWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase chưa được cấu hình! Vui lòng nhập Firebase Config trong Cài Đặt.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const loginWithEmail = async (email, password) => {
  if (!auth) {
    throw new Error('Firebase chưa được cấu hình!');
  }
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const registerWithEmail = async (email, password, displayName = '') => {
  if (!auth) {
    throw new Error('Firebase chưa được cấu hình!');
  }
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential.user;
};

export const logoutUser = async () => {
  if (!auth) return;
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => {
  return auth?.currentUser || null;
};

export const resetUserPassword = async (email) => {
  if (!auth) {
    throw new Error('Firebase chưa được cấu hình!');
  }
  await sendPasswordResetEmail(auth, email);
};

export const formatAuthError = (err) => {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Email không hợp lệ hoặc sai định dạng!';
    case 'auth/user-not-found':
      return 'Không tìm thấy tài khoản nào khớp với Email này!';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email hoặc mật khẩu không chính xác!';
    case 'auth/email-already-in-use':
      return 'Email này đã được đăng ký tài khoản trước đó!';
    case 'auth/weak-password':
      return 'Mật khẩu quá ngắn hoặc quá yếu! Vui lòng đặt tối thiểu 6 ký tự.';
    case 'auth/popup-closed-by-user':
      return 'Cửa sổ đăng nhập Google đã bị đóng trước khi xác thực hoàn tất.';
    case 'auth/operation-not-allowed':
      return 'Phương thức đăng nhập này chưa được kích hoạt trong Firebase Console (Authentication > Sign-in method).';
    case 'auth/too-many-requests':
      return 'Quá nhiều yêu cầu không hợp lệ. Vui lòng thử lại sau ít phút!';
    default:
      return err?.message || 'Đã có lỗi xảy ra trong quá trình xác thực.';
  }
};

/**
 * ====================================================
 * 2. LƯU TRỮ VÀ ĐỒNG BỘ DỮ LIỆU (FIRESTORE)
 * ====================================================
 */

/**
 * Lưu bài tập đã giải vào Firestore
 */
export const saveSolutionToCloud = async (solutionData) => {
  const user = getCurrentUser();
  if (!user || !db) return null;

  try {
    const colRef = collection(db, 'users', user.uid, 'solutions');
    const docRef = await addDoc(colRef, {
      ...solutionData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('Lỗi lưu lời giải lên Firestore:', err);
    throw err;
  }
};

/**
 * Lấy danh sách bài tập đã giải gần đây của học sinh
 */
export const getSavedSolutionsFromCloud = async (maxCount = 20) => {
  const user = getCurrentUser();
  if (!user || !db) return [];

  try {
    const colRef = collection(db, 'users', user.uid, 'solutions');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(maxCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Lỗi tải danh sách bài tập từ Firestore:', err);
    return [];
  }
};

/**
 * Lưu phiên chat gia sư vào Firestore
 */
export const saveChatSessionToCloud = async (chatMessages, title = 'Phiên học với Gia sư AI') => {
  const user = getCurrentUser();
  if (!user || !db || chatMessages.length === 0) return null;

  try {
    const colRef = collection(db, 'users', user.uid, 'chats');
    const docRef = await addDoc(colRef, {
      title,
      messages: chatMessages,
      turnCount: chatMessages.length,
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('Lỗi lưu lịch sử chat lên Firestore:', err);
    throw err;
  }
};

/**
 * Lấy lịch sử chat đã lưu
 */
export const getSavedChatSessionsFromCloud = async (maxCount = 10) => {
  const user = getCurrentUser();
  if (!user || !db) return [];

  try {
    const colRef = collection(db, 'users', user.uid, 'chats');
    const q = query(colRef, orderBy('updatedAt', 'desc'), limit(maxCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Lỗi tải lịch sử chat từ Firestore:', err);
    return [];
  }
};

/**
 * Cập nhật phiên chat đã có trên Firestore
 */
export const updateChatSessionInCloud = async (sessionId, chatMessages, title = null) => {
  const user = getCurrentUser();
  if (!user || !db || !sessionId) return;

  try {
    const docRef = doc(db, 'users', user.uid, 'chats', sessionId);
    const dataToUpdate = {
      messages: chatMessages,
      turnCount: chatMessages.length,
      updatedAt: serverTimestamp(),
    };
    if (title) dataToUpdate.title = title;
    await setDoc(docRef, dataToUpdate, { merge: true });
  } catch (err) {
    console.error('Lỗi cập nhật phiên chat trên Firestore:', err);
  }
};

/**
 * Xóa một phiên chat trên Firestore
 */
export const deleteChatSessionFromCloud = async (sessionId) => {
  const user = getCurrentUser();
  if (!user || !db || !sessionId) return;

  try {
    const docRef = doc(db, 'users', user.uid, 'chats', sessionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Lỗi xóa lịch sử chat trên Firestore:', err);
    throw err;
  }
};

/**
 * Lưu bộ từ vựng 3D / Flashcard vào Firestore
 */
export const saveFlashcardsToCloud = async (topic, cards) => {
  const user = getCurrentUser();
  if (!user || !db || cards.length === 0) return null;

  try {
    const colRef = collection(db, 'users', user.uid, 'flashcards');
    const docRef = await addDoc(colRef, {
      topic,
      cards,
      cardCount: cards.length,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('Lỗi lưu flashcard lên Firestore:', err);
    throw err;
  }
};

/**
 * Tải danh sách bộ từ vựng đã tạo
 */
export const getSavedFlashcardsFromCloud = async () => {
  const user = getCurrentUser();
  if (!user || !db) return [];

  try {
    const colRef = collection(db, 'users', user.uid, 'flashcards');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Lỗi tải flashcards từ Firestore:', err);
    return [];
  }
};

/**
 * ====================================================
 * 3. TẢI FILE / ẢNH LÊN FIREBASE STORAGE
 * ====================================================
 */

export const uploadProblemImage = async (file) => {
  const user = getCurrentUser();
  if (!storage) throw new Error('Firebase Storage chưa được khởi tạo!');

  const userId = user ? user.uid : 'anonymous';
  const fileRef = ref(storage, `problems/${userId}/${Date.now()}_${file.name}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};
