import React, { useState } from 'react';
import {
  X, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus,
  Flame, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck
} from 'lucide-react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetUserPassword,
  logoutUser,
  formatAuthError
} from '../../services/firebaseService';
import { isFirebaseConfigured } from '../../config/firebase';

export default function AuthModal({ isOpen, onClose, currentUser, onOpenConfig }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSwitchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu!');
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      setSuccessMessage('Đăng nhập thành công!');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập Email và Mật khẩu!');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải chứa ít nhất 6 ký tự!');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp!');
      return;
    }
    setLoading(true);
    try {
      await registerWithEmail(email.trim(), password, displayName.trim());
      setSuccessMessage('Đăng ký tài khoản thành công!');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1200);
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      await loginWithGoogle();
      setSuccessMessage('Đăng nhập Google thành công!');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập Email cần lấy lại mật khẩu!');
      return;
    }
    setLoading(true);
    try {
      await resetUserPassword(email.trim());
      setSuccessMessage(`Đã gửi email khôi phục mật khẩu tới "${email}". Vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác/spam)!`);
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setSuccessMessage('Đã đăng xuất tài khoản.');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi đăng xuất');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-md border border-indigo-500/40 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Nền Gradient trang trí */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cảnh báo cấu hình Firebase nếu chưa cấu hình */}
        {!isFirebaseConfigured() && (
          <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">Firebase chưa được cấu hình</p>
              <p className="text-[11px] text-slate-300">
                Để đăng nhập/đăng ký, bạn cần dán đoạn mã Firebase Console vào phần Cài Đặt.
              </p>
              {onOpenConfig && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenConfig();
                  }}
                  className="text-cyan-400 hover:underline font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                >
                  Mở Cài Đặt Firebase Ngay <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* TRƯỜNG HỢP 1: NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP (USER PROFILE VIEW) */}
        {currentUser ? (
          <div className="space-y-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 p-1 mx-auto shadow-lg shadow-indigo-500/20">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center text-2xl font-bold text-cyan-300">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <div className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium mb-1.5">
                <ShieldCheck className="w-3 h-3" /> Tài khoản đã xác thực
              </div>
              <h3 className="font-display font-bold text-xl text-white">
                {currentUser.displayName || 'Học viên EduVerse'}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">UID:</span>
                <span className="font-mono text-[10px] text-cyan-300">{currentUser.uid.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Đồng bộ Cloud:</span>
                <span className="text-emerald-400 font-semibold">Đang hoạt động (Firestore)</span>
              </div>
            </div>

            {successMessage && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> {successMessage}
              </div>
            )}

            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 font-bold text-xs transition-all cursor-pointer"
            >
              {loading ? 'Đang đăng xuất...' : 'Đăng Xuất Tài Khoản'}
            </button>
          </div>
        ) : (
          /* TRƯỜNG HỢP 2: FORM ĐĂNG NHẬP / ĐĂNG KÝ / QUÊN MẬT KHẨU */
          <div className="space-y-5">
            {/* Header Form */}
            <div className="text-center space-y-1">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 mb-2">
                {mode === 'login' && <LogIn className="w-5 h-5 text-cyan-400" />}
                {mode === 'register' && <UserPlus className="w-5 h-5 text-purple-400" />}
                {mode === 'forgot' && <Mail className="w-5 h-5 text-amber-400" />}
              </div>
              <h3 className="font-display font-bold text-xl text-white">
                {mode === 'login' && 'Đăng Nhập EduVerse'}
                {mode === 'register' && 'Đăng Ký Tài Khoản'}
                {mode === 'forgot' && 'Khôi Phục Mật Khẩu'}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'login' && 'Đăng nhập để đồng bộ tiến độ học và bài giải đa môn'}
                {mode === 'register' && 'Tạo tài khoản học sinh để bắt đầu hành trình AI'}
                {mode === 'forgot' && 'Nhập email để nhận đường dẫn đặt lại mật khẩu'}
              </p>
            </div>

            {/* Thông báo Lỗi / Thành công */}
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form Fields */}
            {mode === 'forgot' ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Email tài khoản</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ban@example.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-bold text-xs text-white transition-all shadow-md cursor-pointer"
                >
                  {loading ? 'Đang gửi email...' : 'Gửi Yêu Cầu Khôi Phục'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('login')}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    ← Quay lại Đăng nhập
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={mode === 'login' ? handleEmailLogin : handleEmailRegister} className="space-y-3.5">
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Họ và tên</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hocsinh@example.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300">Mật khẩu</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('forgot')}
                        className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Xác nhận mật khẩu</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 rounded-xl font-bold text-xs text-white transition-all shadow-md cursor-pointer mt-2"
                >
                  {loading
                    ? (mode === 'login' ? 'Đang đăng nhập...' : 'Đang khởi tạo tài khoản...')
                    : (mode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản Mới')}
                </button>
              </form>
            )}

            {mode !== 'forgot' && (
              <>
                {/* Dải phân cách "Hoặc" */}
                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900/90 px-3 text-[10px] text-slate-400 uppercase tracking-wider font-semibold absolute">
                    Hoặc tiếp tục với
                  </span>
                </div>

                {/* Đăng nhập nhanh Google */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Đăng nhập với Google</span>
                </button>

                {/* Footer chuyển đổi Login <-> Register */}
                <div className="text-center pt-2 text-xs text-slate-400">
                  {mode === 'login' ? (
                    <p>
                      Chưa có tài khoản?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('register')}
                        className="text-cyan-400 font-bold hover:underline cursor-pointer"
                      >
                        Đăng ký ngay
                      </button>
                    </p>
                  ) : (
                    <p>
                      Đã có tài khoản?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('login')}
                        className="text-cyan-400 font-bold hover:underline cursor-pointer"
                      >
                        Đăng nhập ngay
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
