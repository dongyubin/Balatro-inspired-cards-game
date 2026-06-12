import tailwindcss from "@tailwindcss/vite";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const SITE_URL_TOKEN = "%SITE_URL%";
const pagePaths = [
  "index.html",
  "how-to-play/index.html",
  "about/index.html",
  "privacy/index.html",
  "terms/index.html",
  "changelog/index.html"
];

function normalizeSiteUrl(value) {
  return value?.trim().replace(/\/+$/, "");
}

export default defineConfig(({ command }) => {
  const siteUrl = normalizeSiteUrl(process.env.SITE_URL);

  if (command === "build" && !siteUrl) {
    throw new Error(
      "SITE_URL is required for production builds. Example: SITE_URL=https://example.com npm run build"
    );
  }

  const resolvedSiteUrl = siteUrl || "http://localhost:5173";

  return {
    plugins: [
      {
        name: "inject-site-url",
        transformIndexHtml(html) {
          return html.replaceAll(SITE_URL_TOKEN, resolvedSiteUrl);
        },
        async closeBundle() {
          for (const file of ["robots.txt", "sitemap.xml"]) {
            const outputPath = resolve("dist", file);
            const content = await readFile(outputPath, "utf8");
            await writeFile(
              outputPath,
              content.replaceAll(SITE_URL_TOKEN, resolvedSiteUrl),
              "utf8"
            );
          }
        }
      },
      tailwindcss(),
      {
        name: "inject-critical-first-paint",
        transformIndexHtml: {
          order: "post",
          handler(html) {
            const criticalStyle =
              "<style data-critical-css>html{background:#08090c}body{margin:0;opacity:0}</style>";
            let output = html;

            if (!output.includes("data-critical-css")) {
              output = output.replace("</head>", `    ${criticalStyle}\n  </head>`);
            }

            return output.replace(
              /(\s*<script type="module"[^>]*><\/script>)(\s*<link rel="stylesheet"[^>]*>)/g,
              "$2$1"
            );
          }
        }
      }
    ],
    build: {
      target: "es2020",
      rollupOptions: {
        input: Object.fromEntries(
          pagePaths.map((path) => [path.replace(/\/index\.html$|\.html$/g, "") || "home", resolve(path)])
        )
      }
    }
  };
});
