import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "伯仲叔教育管理",
    short_name: "伯仲叔教育",
    description: "伯杨、仲杨、叔杨的私有家庭教育日程与成长管理应用。",
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
        description: "查看伯仲叔家庭教育周报",
        url: "/#weekly-report",
        icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }]
      }
    ]
  };
}
