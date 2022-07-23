/** Support some v10 document properties */
export function createV10Shims(): void {
    if (game.release.generation !== 9) return;

    for (const documentName of [...CONST.DOCUMENT_TYPES, "Token"] as const) {
        Object.defineProperty(CONFIG[documentName].documentClass.prototype, "flags", {
            get() {
                return this.data.flags;
            },
            enumerable: true,
        });
    }

    for (const Document of [Actor, Item]) {
        Object.defineProperty(Document.prototype, "system", {
            get() {
                return this.data.data;
            },
            enumerable: true,
        });
    }
}
