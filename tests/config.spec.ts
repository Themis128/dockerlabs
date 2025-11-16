import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Configuration Validation', () => {
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
    expect(typeof pis).toBe('object');

    for (const [piNumber, piData] of Object.entries(pis as Record<string, any>)) {
      expect(piData).toHaveProperty('name');
      expect(typeof piData.name).toBe('string');
    }
  });

  test('nuxt.config.ts should exist and be valid', () => {
    const configPath = path.join(process.cwd(), 'nuxt.config.ts');
    expect(fs.existsSync(configPath)).toBeTruthy();

    const configContent = fs.readFileSync(configPath, 'utf-8');
    // Basic validation - file should contain Nuxt config
    expect(configContent).toContain('defineNuxtConfig');
  });

  test('tsconfig.json should exist and be valid JSON', () => {
    const configPath = path.join(process.cwd(), 'tsconfig.json');
    expect(fs.existsSync(configPath)).toBeTruthy();

    const configContent = fs.readFileSync(configPath, 'utf-8');
    expect(() => JSON.parse(configContent)).not.toThrow();
  });

  test('package.json should have required scripts', () => {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    expect(packageContent).toHaveProperty('scripts');
    expect(packageContent.scripts).toHaveProperty('dev');
    expect(packageContent.scripts).toHaveProperty('build');
    expect(packageContent.scripts).toHaveProperty('test');
  });

  test('package.json should have Nuxt dependency', () => {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    expect(packageContent).toHaveProperty('dependencies');
    expect(packageContent.dependencies).toHaveProperty('nuxt');
    expect(packageContent.dependencies.nuxt).toMatch(/^\^?4\./);
  });

  test('.env.example should exist', () => {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    expect(fs.existsSync(envExamplePath)).toBeTruthy();
  });

  test('.env.example should contain required variables', () => {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envContent = fs.readFileSync(envExamplePath, 'utf-8');

    expect(envContent).toContain('PYTHON_SERVER_URL');
    expect(envContent).toContain('API_BASE_URL');
  });
});
