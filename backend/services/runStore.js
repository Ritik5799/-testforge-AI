
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
const dataFile = path.join(dataDir, "runs.json");

// Prevent simultaneous save/update operations from overwriting each other.
let mutationQueue = Promise.resolve();

function serializeMutation(task) {
  const result = mutationQueue.then(task);
  mutationQueue = result.catch(() => {});
  return result;
}

async function ensureFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await fs.writeFile(dataFile, "[]", { encoding: "utf8", flag: "wx" })
      .catch(async (writeError) => {
        if (writeError.code !== "EEXIST") throw writeError;
      });
  }
}

async function readRuns() {
  await ensureFile();
  const content = await fs.readFile(dataFile, "utf8");
  return JSON.parse(content);
}

async function writeRuns(runs) {
  await ensureFile();

  const tempFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(runs, null, 2), "utf8");

  try {
    await fs.rename(tempFile, dataFile);
  } catch (error) {
    if (error.code !== "EPERM" && error.code !== "EACCES") {
      await fs.unlink(tempFile).catch(() => {});
      throw error;
    }

    // Windows fallback if replacing the existing file is denied.
    try {
      await fs.unlink(dataFile);
      await fs.rename(tempFile, dataFile);
    } catch (fallbackError) {
      await fs.unlink(tempFile).catch(() => {});
      throw fallbackError;
    }
  }
}

export async function getAllRuns() {
  return (await readRuns()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

export async function getRun(id) {
  return (await readRuns()).find((run) => run.id === id) || null;
}

export function saveRun(run) {
  return serializeMutation(async () => {
    const runs = await readRuns();
    runs.push(run);
    await writeRuns(runs);
    return run;
  });
}

export function updateRun(id, patch) {
  return serializeMutation(async () => {
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
  });
}
