import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

test.describe('Raspberry Pi Connectivity Tests', () => {
  let config: any;

  test.beforeAll(() => {
    const configPath = path.join(process.cwd(), 'pi-config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  });

  test('test_connections.py should be executable', () => {
    const scriptPath = path.join(process.cwd(), 'test_connections.py');
    expect(fs.existsSync(scriptPath)).toBeTruthy();

    // Check if script can be imported (syntax check)
    try {
      execSync(`python -m py_compile "${scriptPath}"`, {
        stdio: 'pipe',
        cwd: process.cwd()
      });
    } catch (error) {
      throw new Error(`test_connections.py has syntax errors: ${error}`);
    }
  });

  test('test_ssh_auth.py should be executable', () => {
    const scriptPath = path.join(process.cwd(), 'test_ssh_auth.py');
    expect(fs.existsSync(scriptPath)).toBeTruthy();

    try {
      execSync(`python -m py_compile "${scriptPath}"`, {
        stdio: 'pipe',
        cwd: process.cwd()
      });
    } catch (error) {
      throw new Error(`test_ssh_auth.py has syntax errors: ${error}`);
    }
  });

  test('all Pi IPs should be valid format', () => {
    const pis = config.raspberry_pis;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

    for (const [key, pi] of Object.entries(pis)) {
      const piAny = pi as any;
      expect(piAny.ip).toMatch(ipRegex);

      // Validate each octet is 0-255
      const octets = piAny.ip.split('.');
      expect(octets.length).toBe(4);
      for (const octet of octets) {
        const num = parseInt(octet, 10);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(255);
      }
    }
  });

  test('all Pi MAC addresses should be valid format', () => {
    const pis = config.raspberry_pis;
    const macRegex = /^([0-9A-F]{2}-){5}[0-9A-F]{2}$/i;

    for (const [key, pi] of Object.entries(pis)) {
      const piAny = pi as any;
      expect(piAny.mac).toMatch(macRegex);
    }
  });

  test('connection types should be valid', () => {
    const pis = config.raspberry_pis;
    const validConnections = ['Wired', '2.4G', '5G'];

    for (const [key, pi] of Object.entries(pis)) {
      const piAny = pi as any;
      expect(validConnections).toContain(piAny.connection);
    }
  });
});
