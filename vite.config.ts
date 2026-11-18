import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    // 监听所有网卡：手机必须能通过局域网 IP 访问登录页与扫码确认页。
    // 只写 port 时 Vite 默认绑定 localhost（回环），手机访问 10.x.x.x:5173 会直接连接失败。
    host: '0.0.0.0',
    strictPort: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true
        // 注意：这里坚决不要加 rewrite，原样把 /api 传递给后端（8888 为 Nginx 负载均衡网关，转发至 8081/8082 Tomcat 集群）
      }
    }
  }
})
