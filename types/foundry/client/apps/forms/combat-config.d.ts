/** The Application responsible for configuring the CombatTracker and its contents. */
declare class CombatTrackerConfig<TObject extends Combat = Combat> extends FormApplication<TObject> {
    static override get defaultOptions(): FormApplicationOptions;

    override getData(options?: Partial<FormApplicationOptions>): Promise<FormApplicationData<TObject>>;

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;

    override activateListeners(html: JQuery): void;

    protected override _onChangeInput(event: Event): Promise<void>;
}
