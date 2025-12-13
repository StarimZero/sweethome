import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // 빌드 결과물이 저장될 폴더 이름
    emptyOutDir: true // 빌드 시 기존 파일 삭제
  }
})
