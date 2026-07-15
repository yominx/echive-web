import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 정적 SPA. Firebase/XLSX는 코드 분할되어 필요할 때 로드됩니다.
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    outDir: "dist",
  },
});
