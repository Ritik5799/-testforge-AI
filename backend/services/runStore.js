import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
const dataFile = path.join(dataDir, "runs.json");

async function ensureFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try { await fs.access(dataFile); }
  catch { await fs.writeFile(dataFile, "[]", "utf8"); }
}
async function readRuns() {
  await ensureFile();
  return JSON.parse(await fs.readFile(dataFile, "utf8"));
}
async function writeRuns(runs) {
  await ensureFile();
  const tempFile = `${dataFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(runs, null, 2), "utf8");
  await fs.rename(tempFile, dataFile);
}
export async function getAllRuns() {
  return (await readRuns()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export async function getRun(id) {
  return (await readRuns()).find((run) => run.id === id) || null;
}
export async function saveRun(run) {
  const runs = await readRuns();
  runs.push(run);
  await writeRuns(runs);
  return run;
}
export async function updateRun(id, patch) {
  const runs = await readRuns();
  const index = runs.findIndex((run) => run.id === id);
  if (index < 0) return null;
  const { logsAppend = [], ...fields } = patch;
  runs[index] = {
    ...runs[index],
    ...fields,
    updatedAt: new Date().toISOString(),
    logs: [...(runs[index].logs || []), ...logsAppend]
  };
  await writeRuns(runs);
  return runs[index];
}