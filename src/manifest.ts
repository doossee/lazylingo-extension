import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  name: "LazyLingo",
  description: "Add words to your LazyLingo vault on GitHub",
  version: "0.2.0",
  manifest_version: 3,
  permissions: ["storage"],
  host_permissions: [
    "https://api.github.com/*",
    "https://github.com/login/*",
    "https://api.dictionaryapi.dev/*",
    "https://api.mymemory.translated.net/*",
  ],
  action: {
    default_popup: "index.html",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
});
