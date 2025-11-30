#!/usr/bin/env node

import { Command } from 'commander';
import { spawn, execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bareRoot = dirname(__dirname); // Go up to project root

const program = new Command();

program
  .name('bare')
  .description('Multi-repository worktree manager')
  .version('1.0.0');

program
  .command('start')
  .description('Start the bare dashboard')
  .option('-p, --port <port>', 'port to run on', '3000')
  .option('--no-update', 'skip auto-update')
  .action(async (options) => {
    if (options.update !== false) {
      try {
        console.log('Checking for updates...');
        execSync('git pull origin main', { cwd: bareRoot, stdio: 'inherit' });

        console.log('Installing dependencies...');
        execSync('npm install', { cwd: bareRoot, stdio: 'inherit' });

        console.log('');
      } catch (error) {
        console.warn('Warning: Auto-update failed, continuing with current version...');
      }
    }

    const args = ['dev', bareRoot];

    if (options.port) {
      args.push('-p', options.port);
    }

    const child = spawn('next', args, {
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      console.error('Failed to start:', error);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  });

program.parse();
