import { typescript } from '@betterer/typescript';

export default {
    'stricter compilation': typescript('./tsconfig.json', {
        strict: true,
        noFallthroughCasesInSwitch: true,
        noImplicitReturns: true,
        noPropertyAccessFromIndexSignature: true,
        noUnusedParameters: true,
        noUncheckedIndexedAccess: true,
    }).include('./packs/*.ts', './src/**/*.ts', './tests/**/*.ts', './webpack.config.ts'),
};
