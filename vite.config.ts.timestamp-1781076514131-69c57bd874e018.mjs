// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import fs from "fs";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
function copyHtaccess() {
  return {
    name: "copy-htaccess",
    closeBundle() {
      const src = path.resolve(__vite_injected_original_dirname, "public/.htaccess");
      const dest = path.resolve(__vite_injected_original_dirname, "dist/.htaccess");
      if (fs.existsSync(src)) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, dest);
      }
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), copyHtaccess()],
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  server: {
    historyApiFallback: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmZ1bmN0aW9uIGNvcHlIdGFjY2VzcygpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnY29weS1odGFjY2VzcycsXG4gICAgY2xvc2VCdW5kbGUoKSB7XG4gICAgICBjb25zdCBzcmMgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncHVibGljLy5odGFjY2VzcycpO1xuICAgICAgY29uc3QgZGVzdCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdkaXN0Ly5odGFjY2VzcycpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoc3JjKSkge1xuICAgICAgICBjb25zdCBkZXN0RGlyID0gcGF0aC5kaXJuYW1lKGRlc3QpO1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGVzdERpcikpIGZzLm1rZGlyU3luYyhkZXN0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgZnMuY29weUZpbGVTeW5jKHNyYywgZGVzdCk7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCksIGNvcHlIdGFjY2VzcygpXSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgaGlzdG9yeUFwaUZhbGxiYWNrOiB0cnVlLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUNsQixPQUFPLFFBQVE7QUFDZixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFLekMsU0FBUyxlQUFlO0FBQ3RCLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLGNBQWM7QUFDWixZQUFNLE1BQU0sS0FBSyxRQUFRLGtDQUFXLGtCQUFrQjtBQUN0RCxZQUFNLE9BQU8sS0FBSyxRQUFRLGtDQUFXLGdCQUFnQjtBQUNyRCxVQUFJLEdBQUcsV0FBVyxHQUFHLEdBQUc7QUFDdEIsY0FBTSxVQUFVLEtBQUssUUFBUSxJQUFJO0FBQ2pDLFlBQUksQ0FBQyxHQUFHLFdBQVcsT0FBTyxFQUFHLElBQUcsVUFBVSxTQUFTLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDdEUsV0FBRyxhQUFhLEtBQUssSUFBSTtBQUFBLE1BQzNCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjtBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDO0FBQUEsRUFDakMsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sb0JBQW9CO0FBQUEsRUFDdEI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
