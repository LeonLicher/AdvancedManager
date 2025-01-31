import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        sassOptions: {
          silenceDeprecations: ['legacy-js-api']
        }
      }
    }
  },
  plugins: [react()],
  base: "/AdvancedManager/",
  optimizeDeps: {
    include: ["firebase/app", "firebase/firestore"],
  },
});
