import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Raspberry Pi Configuration', () => {
  test('pi-config.json should exist and be valid JSON', () => {
    const configPath = path.join(process.cwd(), 'pi-config.json');
    expect(fs.existsSync(configPath)).toBeTruthy();

    const configContent = fs.readFileSync(configPath, 'utf-8');
    expect(() => JSON.parse(configContent)).not.toThrow();
  });

  test('pi-config.json should have required structure', () => {
    const configPath = path.join(process.cwd(), 'pi-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    expect(config).toHaveProperty('raspberry_pis');
    expect(config).toHaveProperty('default_username');
    expect(config).toHaveProperty('default_ssh_port');
    expect(config).toHaveProperty('default_telnet_port');

    expect(typeof config.default_username).toBe('string');
    expect(typeof config.default_ssh_port).toBe('number');
    expect(typeof config.default_telnet_port).toBe('number');
  });

  test('each Raspberry Pi should have required fields', () => {
    const configPath = path.join(process.cwd(), 'pi-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const pis = config.raspberry_pis;
    expect(Object.keys(pis).length).toBeGreaterThan(0);

    for (const [key, pi] of Object.entries(pis)) {
      const piConfig = pi as { name: string; ip: string; mac: string; connection: string };
      expect(piConfig).toHaveProperty('name');
      expect(piConfig).toHaveProperty('ip');
      expect(piConfig).toHaveProperty('mac');
      expect(piConfig).toHaveProperty('connection');

      expect(typeof piConfig.name).toBe('string');
      expect(typeof piConfig.ip).toBe('string');
      expect(typeof piConfig.mac).toBe('string');
      expect(typeof piConfig.connection).toBe('string');

      // Validate IP format (basic check)
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      expect(piConfig.ip).toMatch(ipRegex);

      // Validate MAC format (basic check)
      const macRegex = /^([0-9A-F]{2}-){5}[0-9A-F]{2}$/i;
      expect(piConfig.mac).toMatch(macRegex);
    }
  });

  test('should have at least one Ethernet and one WiFi connection', () => {
    const configPath = path.join(process.cwd(), 'pi-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const pis = config.raspberry_pis;
    const ethernetPis = Object.values(pis).filter((pi: any) => pi.connection === 'Wired');
    const wifiPis = Object.values(pis).filter((pi: any) => pi.connection === '2.4G');

    expect(ethernetPis.length).toBeGreaterThan(0);
    expect(wifiPis.length).toBeGreaterThan(0);
  });
});
