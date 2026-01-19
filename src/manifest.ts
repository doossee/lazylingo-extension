import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  name: "LazyLingo",
  description: "Add words to your LazyLingo deck instantly",
  version: "1.0.0",
  manifest_version: 3,
  permissions: ["activeTab", "scripting", "storage", "contextMenus"],
  action: {
    default_popup: "index.html",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content.ts"],
    },
    {
      matches: ["http://localhost:5173/auth/callback*"],
      js: ["src/auth-callback.ts"],
      run_at: "document_start",
    },
  ],
  host_permissions: ["http://localhost:3000/*"],
});
