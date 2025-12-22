#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const envPath = path.join(__dirname, '.env');
const envTestPath = path.join(__dirname, '.env.test');
const envBackupPath = path.join(__dirname, '.env.backup');

// Backup original .env
fs.copyFileSync(envPath, envBackupPath);
console.log('✓ Backed up .env to .env.backup');

// Copy .env.test to .env
fs.copyFileSync(envTestPath, envPath);
console.log('✓ Copied .env.test to .env for testing');

// Run tests
const command = process.argv.slice(2).join(' ') || 'npx playwright test tests/system/contact-flow.spec.ts:47 --reporter=list --project=chromium';
console.log(`\n▶ Running: ${command}\n`);

const child = exec(command, (error, stdout, stderr) => {
  // Restore original .env
  fs.copyFileSync(envBackupPath, envPath);
  fs.unlinkSync(envBackupPath);
  console.log('\n✓ Restored original .env');
  
  if (error) {
    console.error(stderr);
    process.exit(error.code || 1);
  } else {
    console.log(stdout);
    process.exit(0);
  }
});

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

// Handle interruption
process.on('SIGINT', () => {
  child.kill();
  fs.copyFileSync(envBackupPath, envPath);
  fs.unlinkSync(envBackupPath);
  console.log('\n✓ Restored original .env (interrupted)');
  process.exit(1);
});
