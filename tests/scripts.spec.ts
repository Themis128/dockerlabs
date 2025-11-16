import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

test.describe('Python Scripts Validation', () => {
  const pythonScripts = [
    'test_connections.py',
    'test_ssh_auth.py',
    'test_password_auth.py',
    'test_auth_paramiko.py',
    'connect_ssh.py',
    'connect_ssh_paramiko.py',
    'connect_telnet.py',
    'list_pis.py',
    'get_pi_command.py',
    'enable_telnet_remote.py',
    'verify_ssh_config.py',
  ];

  test('all Python scripts should exist', () => {
    for (const script of pythonScripts) {
      const scriptPath = path.join(process.cwd(), script);
      expect(fs.existsSync(scriptPath)).toBeTruthy();
    }
  });

  test('Python scripts should have valid syntax', () => {
    for (const script of pythonScripts) {
      const scriptPath = path.join(process.cwd(), script);
      if (fs.existsSync(scriptPath)) {
        try {
          execSync(`python -m py_compile "${scriptPath}"`, {
            stdio: 'pipe',
            cwd: process.cwd()
          });
        } catch (error) {
          throw new Error(`Syntax error in ${script}: ${error}`);
        }
      }
    }
  });

  test('Python scripts should have shebang line', () => {
    for (const script of pythonScripts) {
      const scriptPath = path.join(process.cwd(), script);
      if (fs.existsSync(scriptPath)) {
        const content = fs.readFileSync(scriptPath, 'utf-8');
        expect(content).toMatch(/^#!\/usr\/bin\/env python3/);
      }
    }
  });
});
