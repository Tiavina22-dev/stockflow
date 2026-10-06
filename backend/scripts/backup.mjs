import 'dotenv/config';
import { resolve } from 'node:path';
import { backupRoot, backupStatus, createBackup, verifyArchive } from './backup-tools.mjs';

try {
  const args = process.argv.slice(2);
  if (args[0] === '--verify') {
    if (!args[1]) throw new Error('Dossier de sauvegarde requis.');
    await verifyArchive(resolve(args[1])); console.log('Sauvegarde vérifiée.');
  } else if (args[0] === '--status') console.log(JSON.stringify(await backupStatus()));
  else {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL requis.');
    const result = await createBackup({ root: await backupRoot(), databaseUrl: process.env.DATABASE_URL, uploadDirectory: resolve(process.env.UPLOAD_DIR ?? '.local/uploads'), dueOnly: args.includes('--due') });
    console.log(JSON.stringify(result));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
