const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");
const repositoryName = (process.env.GITHUB_REPOSITORY || "jun4696/hito_kyori_memo_mvp").split("/")[1];
const basePath = `/${repositoryName}/`;

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing Expo web export: ${indexPath}`);
}

const html = fs.readFileSync(indexPath, "utf8");
const updatedHtml = html.replace(/(["'=])\/_expo\//g, `$1${basePath}_expo/`);

fs.writeFileSync(indexPath, updatedHtml);
