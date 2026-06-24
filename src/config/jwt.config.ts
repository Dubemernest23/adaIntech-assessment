import fs from 'fs';
import path from 'path';

const isTest = process.env.NODE_ENV === 'test';

const loadKey = (filePath: string, fallback: string): string => {
  if (isTest) return fallback;
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    throw new Error(
      `RSA key not found at ${filePath}.\n` +
        `Generate the key pair before starting the server:\n` +
        `  Linux / macOS : npm run generate:keys\n` +
        `  Windows       : npm run generate:keys:win\n`,
    );
  }
};

const privateKeyPath = path.join(__dirname, '../../src/keys/private.key');
const publicKeyPath = path.join(__dirname, '../../src/keys/public.key');

export const jwtConfig = {
  privateKey: loadKey(privateKeyPath, 'test-private-key'),
  publicKey: loadKey(publicKeyPath, 'test-public-key'),
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  algorithm: 'RS256' as const,
};