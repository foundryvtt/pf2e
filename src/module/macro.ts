export class MacroPF2e extends Macro {
    /** @override */
    get visible(): boolean {
        return this.permission >= CONST.ENTITY_PERMISSIONS.OBSERVER;
    }
}

export interface MacroPF2e {
    data: foundry.data.MacroData<MacroPF2e>;
}
