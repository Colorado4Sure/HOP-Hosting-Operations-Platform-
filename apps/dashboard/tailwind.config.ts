import type { Config } from 'tailwindcss';
import sharedConfig from '@hop/ui/tailwind';

const config: Config = {
  ...sharedConfig,
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/**/*.{ts,tsx,js}',
  ],
};

export default config;
