import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { GithubApiService } from "./src/Services/GithubApiService.ts";
import { ServiceError } from "./src/Types/index.ts";
import { Card } from "./src/card.ts";
import { COLORS } from "./src/theme.ts";

const [username, outputPath = "./assets/trophy.svg", themeName = "default"] = process.argv.slice(2);
if (!username) {
  console.error("Usage: npm run render -- USERNAME [OUTPUT_PATH] [THEME]");
  process.exit(1);
}

const result = await new GithubApiService().requestUserInfo(username);
if (result instanceof ServiceError) {
  console.error(`Could not render trophies: ${result.message}`);
  process.exit(2);
}

const theme = COLORS[themeName] ?? COLORS.default;
const svg = new Card([], [], -1, 10, 115, 10, 10, false, false).render(result, theme);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, svg, "utf8");
console.log(`Wrote ${outputPath}`);
