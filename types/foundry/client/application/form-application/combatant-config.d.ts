/** Configure or create a single Combatant within a Combat entity. */
declare class CombatantConfig<TCombatant extends Combatant> extends DocumentSheet<TCombatant> {
    static get defaultOptions(): DocumentSheetOptions;

    get title(): string;

    protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
