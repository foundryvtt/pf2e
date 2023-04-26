/** Configure or create a single Combatant within a Combat entity. */
declare class CombatantConfig<TCombatant extends Combatant<Combat | null>> extends DocumentSheet<TCombatant> {
    static override get defaultOptions(): DocumentSheetOptions;

    override get title(): string;

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
