import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";

// Reliable __dirname equivalent for ESM. `import.meta.dirname` exists on
// recent Node, but esbuild's bundled ESM output leaves it as-is and it
// evaluates to undefined in some runtimes — fileURLToPath is portable.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupVite(app: Express, server: Server) {
  // Vite + vite.config are dev-only. Loading them via runtime-computed
  // paths keeps esbuild from inlining vite.config.ts (which evaluates
  // `import.meta.dirname` at module-init) into the production server
  // bundle. esbuild's static analyzer follows string-literal dynamic
  // imports but bails on path.resolve-style runtime URLs.
  const viteUrl = "vite";
  const { createServer: createViteServer } = await import(viteUrl);
  const viteConfigUrl = new URL("../../vite.config.ts", import.meta.url).href;
  const viteConfig = (await import(viteConfigUrl)).default;

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production the server bundle lives at /app/dist/index.js and the
  // client files at /app/dist/public/ (vite build writes there per
  // vite.config.ts `build.outDir`). In dev source-mode (NODE_ENV !==
  // production but somehow reaching serveStatic) the same dist/public
  // is the correct path because pnpm dev runs setupVite instead.
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(__dirname, "../..", "dist", "public")
      : path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
