import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Education Management System",
    short_name: "Family Education",
    description: "A private family education schedule, growth, and resource management system.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    orientation: "portrait",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any"
      }
    ],
    shortcuts: [
      {
        name: "新增日程",
        short_name: "日程",
        description: "快速进入日程编辑器",
        url: "/#calendar",
        icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }]
      },
      {
        name: "家长周报",
        short_name: "周报",
        description: "查看家庭教育周报",
        url: "/#weekly-report",
        icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }]
      }
    ]
  };
}
