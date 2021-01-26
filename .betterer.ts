import { typescript } from '@betterer/typescript';

export default {
    'stricter compilation': typescript('./tsconfig.json', {
        strict: true,
        noEmit: true,
    }).include(
        './packs/packbuilder.ts',
        './src/**/*.ts',
        './static/macros/*.js',
        './tests/**/*.ts',
        './webpack.config.ts'
    ),
};
