export {};

declare global {
    namespace globalThis {
        const _templateCache: Record<string, Function>;
    }
}
