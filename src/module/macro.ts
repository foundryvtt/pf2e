export class MacroPF2e extends Macro {
    /** Raise permission requirement of world macro visibility to observer */
    override get visible(): boolean {
        return this.permission >= CONST.ENTITY_PERMISSIONS.OBSERVER;
    }
}
