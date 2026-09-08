/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 供 Docker 多阶段构建产出独立运行层（.next/standalone），本地 dev / start 不受影响
  output: "standalone",
}

export default nextConfig
