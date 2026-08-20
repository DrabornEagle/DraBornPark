import { rmSync } from 'node:fs';

rmSync('.expo/types', { recursive: true, force: true });
console.log('Cleared stale Expo Router generated types.');
