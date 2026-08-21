import axios from 'axios';

// 1. Khởi tạo instance Axios
const api = axios.create({
  // Tự động ưu tiên lấy từ file .env (Vite) hoặc dùng URL mặc định của Laravel
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000, // Giới hạn thời gian chờ request (10 giây)
});

// 2. Request Interceptor: Tự động đính kèm Token Sanctum vào mỗi request gửi đi
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Đính kèm Branch ID nếu Admin đang chọn xem 1 cơ sở cụ thể
    const activeBranchId = localStorage.getItem('active_branch_id');
    if (activeBranchId) {
      config.headers['X-Branch-Id'] = activeBranchId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Response Interceptor: Xử lý tự động khi Token hết hạn hoặc không hợp lệ (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Kiểm tra xem request bị lỗi có phải là request Đăng nhập (/login) hay không
    const isLoginEndpoint = error.config?.url?.includes('/login');

    // Chỉ tự động Đăng xuất & Chuyển trang khi:
    // - Bị lỗi 401 (Unauthenticated)
    // - VÀ KHÔNG PHẢI đang thực hiện thao tác bấm nút Đăng nhập
    if (error.response && error.response.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Thêm xử lý lỗi 403
    if (error.response && error.response.status === 403) {
        // Tạm thời dùng alert vì sonner/toast có thể khó truy cập ngoài React tree, 
        // ở mức Axios toàn cục, alert hoặc custom event là tốt nhất.
        alert(error.response.data.message || 'Bạn không có quyền thực hiện thao tác này!');
    }

    return Promise.reject(error);
  }
);

export default api;