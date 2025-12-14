import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // [1] 빌드 설정 (Render 배포 시 사용됨) - 기존 설정 유지
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  // [2] 개발 서버 설정 (로컬 개발 시 필수!) - 새로 추가하는 부분
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      // Swagger 문서도 보고 싶다면 추가
      '/docs': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/openapi.json': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
