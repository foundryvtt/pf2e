import { typescript } from '@betterer/typescript';

export default {
    'stricter compilation': typescript('./tsconfig.json', {
        strict: true,
        noImplicitReturns: true,
        noUnusedParameters: true,
    }).include('./packs/scripts/**/.ts', './src/**/*.ts', './tests/**/*.ts', './webpack.config.ts'),
};
