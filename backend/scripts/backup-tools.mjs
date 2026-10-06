import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, copyFile, mkdir, readdir, readFile, rename, stat, writeFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const runFile = promisify(execFile);
export const dayInMadagascar = date => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Indian/Antananarivo' }).format(date);
export async function documentsDirectory() {
  if (process.platform === 'win32') {
    const { stdout } = await runFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', "[Environment]::GetFolderPath('MyDocuments')"], { windowsHide: true });
    if (!stdout.trim()) throw new Error('Le répertoire Documents Windows est introuvable.');
    return stdout.trim();
  }
  return join(homedir(), 'Documents');
}
export async function backupRoot() { return process.env.BACKUP_DIR ? resolve(process.env.BACKUP_DIR) : join(await documentsDirectory(), 'StockFlow', 'Sauvegardes'); }
export function postgresEnvironment(databaseUrl) {
  const url = new URL(databaseUrl);
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) throw new Error('Une base PostgreSQL est requise.');
  return { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGSSLMODE: url.searchParams.get('sslmode') ?? 'prefer' };
}
export async function postgresTool(name) {
  const explicit = process.env[name === 'pg_dump' ? 'PG_DUMP_PATH' : 'PG_RESTORE_PATH'];
  if (explicit) return resolve(explicit);
  if (process.platform === 'win32') {
    const local = resolve('.local/tools/postgresql/pgsql/bin', `${name}.exe`);
    try { await access(local); return local; } catch { /* Outil installé sur PATH sinon. */ }
  }
  return process.platform === 'win32' ? `${name}.exe` : name;
}
async function checksum(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export async function filesIn(folder, prefix = '') {
  const files = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isSymbolicLink()) throw new Error('Les liens symboliques ne sont pas autorisés dans les sauvegardes.');
    if (item.isDirectory()) files.push(...await filesIn(join(folder, item.name), name));
    else if (item.isFile()) files.push(name);
  }
  return files.sort();
}
function contained(folder, entry) {
  const target = resolve(folder, entry);
  const rel = relative(folder, target);
  if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) throw new Error('Chemin de fichier invalide dans le manifeste.');
  return target;
}
export async function verifyArchive(folder) {
  const manifest = JSON.parse(await readFile(join(folder, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || !manifest.files?.['database.dump'] || !Object.keys(manifest.files).length) throw new Error('Manifeste incomplet.');
  for (const [entry, expected] of Object.entries(manifest.files)) {
    const path = contained(folder, entry);
    if ((await stat(path)).size !== expected.size || await checksum(path) !== expected.sha256) throw new Error(`Sauvegarde corrompue : ${entry}`);
  }
  return manifest;
}
export async function backupStatus(root = undefined) {
  root ??= await backupRoot();
  const read = async name => { try { return JSON.parse(await readFile(join(root, name), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
  return { directory: root, schedule: { daily: true, weeklyEveryDays: 7, timeZone: 'Indian/Antananarivo', retention: 'aucune purge automatique' }, lastSuccess: await read('last-success.json'), lastFailure: await read('last-failure.json') };
}
async function saveJson(path, value) {
  const tmp = `${path}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), { flag: 'wx' });
  await rename(tmp, path);
}
async function lock(root) {
  const path = join(root, '.lock');
  try { await mkdir(path); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    let owner;
    try { owner = JSON.parse(await readFile(join(path, 'owner.json'), 'utf8')); }
    catch { if (Date.now() - (await stat(path)).mtimeMs < 120000) return null; }
    if (owner?.pid) {
      try { process.kill(owner.pid, 0); return null; } catch (err) { if (err.code !== 'ESRCH') return null; }
    }
    await rename(path, join(root, `.stale-lock-${randomUUID()}`));
    await mkdir(path);
  }
  await writeFile(join(path, 'owner.json'), JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
  return async () => {
    // Supprimer seulement le verrou créé par cet appel, dans le répertoire de sauvegarde vérifié.
    const owner = JSON.parse(await readFile(join(path, 'owner.json'), 'utf8'));
    if (owner.pid !== process.pid || resolve(path) !== resolve(root, '.lock')) throw new Error('Verrou de sauvegarde inattendu.');
    await rm(path, { recursive: true });
  };
}
export async function createBackup({ root, databaseUrl, uploadDirectory, dueOnly = false, now = new Date() }) {
  root = resolve(root);
  uploadDirectory = resolve(uploadDirectory);
  const nesting = relative(uploadDirectory, root);
  if (!nesting || (!nesting.startsWith(`..${sep}`) && nesting !== '..' && !isAbsolute(nesting))) throw new Error('La sauvegarde doit être en dehors du dossier des fichiers source.');
  await mkdir(root, { recursive: true });
  const release = await lock(root);
  if (!release) return { skipped: true, reason: 'already-running' };
  try {
    const { lastSuccess } = await backupStatus(root);
    if (dueOnly && lastSuccess && dayInMadagascar(new Date(lastSuccess.createdAt)) === dayInMadagascar(now)) return { skipped: true, reason: 'already-backed-up-today' };
    const env = postgresEnvironment(databaseUrl);
    const id = `${now.toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
    const pending = join(root, `.partial-${id}`);
    const final = join(root, `daily-${id}`);
    await mkdir(pending);
    await runFile(await postgresTool('pg_dump'), ['--format=custom', '--no-owner', '--no-acl', '--no-password', '--file', join(pending, 'database.dump')], { env, windowsHide: true, timeout: 600000, maxBuffer: 2 * 1024 * 1024 });
    await runFile(await postgresTool('pg_restore'), ['--list', join(pending, 'database.dump')], { windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
    // Les fichiers sont écrits avant leurs liens en base et ne sont jamais remplacés/purgés.
    // Copier après le dump inclut les fichiers référencés, même pendant un nouvel upload.
    let sourceFiles = [];
    try { sourceFiles = await filesIn(uploadDirectory); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    for (const entry of sourceFiles) {
      const target = contained(pending, `uploads/${entry}`);
      await mkdir(dirname(target), { recursive: true }); await copyFile(contained(uploadDirectory, entry), target);
    }
    const files = {};
    for (const entry of await filesIn(pending)) {
      const path = contained(pending, entry);
      files[entry] = { size: (await stat(path)).size, sha256: await checksum(path) };
    }
    const manifest = { version: 1, createdAt: now.toISOString(), database: env.PGDATABASE, kind: 'daily', files };
    await writeFile(join(pending, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
    await verifyArchive(pending);
    await rename(pending, final);
    let lastWeeklyAt = lastSuccess?.lastWeeklyAt ?? null;
    if (!lastWeeklyAt || now.getTime() - new Date(lastWeeklyAt).getTime() >= 7 * 86400000) {
      const weeklyPending = join(root, `.partial-weekly-${id}`);
      const weekly = join(root, `weekly-${id}`);
      await mkdir(weeklyPending);
      for (const entry of [...Object.keys(files), 'manifest.json']) {
        const target = contained(weeklyPending, entry); await mkdir(dirname(target), { recursive: true }); await copyFile(contained(final, entry), target);
      }
      await verifyArchive(weeklyPending); await rename(weeklyPending, weekly); lastWeeklyAt = now.toISOString();
    }
    const result = { createdAt: now.toISOString(), directory: final, lastWeeklyAt, fileCount: Object.keys(files).length };
    await saveJson(join(root, 'last-success.json'), result);
    return result;
  } catch (error) {
    // Ne jamais consigner l'URL ou la sortie d'un outil qui pourrait contenir un secret.
    await saveJson(join(root, 'last-failure.json'), { createdAt: now.toISOString(), message: 'Sauvegarde échouée : contrôler les outils PostgreSQL, la connexion et l’espace disque.' });
    throw new Error('Sauvegarde échouée ; les sauvegardes précédentes sont conservées.', { cause: error });
  } finally { await release(); }
}
