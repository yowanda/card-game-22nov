// Tidecaller Duel — make.fun entry program (Node 22, standard library only).
// Copies game/ and screenshots/ from this repository to the output directory
// and writes /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Runs with no network and writes only inside MAKEFUN_OUTPUT_DIR (or /output).
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoDir = dirname(fileURLToPath(new URL("main.ts", import.meta.url)));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, "game"), { recursive: true });
mkdirSync(join(outDir, "screenshots"), { recursive: true });

cpSync(join(repoDir, "game"), join(outDir, "game"), { recursive: true, force: true });
cpSync(join(repoDir, "screenshots"), join(outDir, "screenshots"), {
  recursive: true,
  force: true,
});

writeFileSync(
  join(outDir, "dossier.json"),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
