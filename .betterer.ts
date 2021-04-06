import { typescript } from '@betterer/typescript';
import { eslint } from '@betterer/eslint';

export default {
    'stricter compilation': typescript('./tsconfig.json', {
        strict: true,
        noImplicitReturns: true,
        strictPropertyInitialization: true,
    }).include(
        './packs/scripts/*.ts',
        './packs/scripts/packman/*.ts',
        './src/**/*.ts',
        './tests/**/*.ts',
        './webpack.config.ts',
    ),
};
