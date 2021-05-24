declare interface ActiveEffectConfigOptions extends FormApplicationOptions {
    classes: string[];
    title: string;
    template: string;
    width: number;
    height: string;
    tabs: [
        {
            navSelector: '.tabs';
            contentSelector: 'form';
            initial: 'details';
        },
    ];
}

declare class ActiveEffectConfig extends FormApplication<ActiveEffect> {
    /** @override */
    static get defaultOptions(): ActiveEffectConfigOptions;

    /** @override */
    getData(options?: FormApplicationOptions): FormApplicationData<ActiveEffect> & {
        effect: ActiveEffectConfig['object']['data'];
        isActorEffect: boolean;
        isItemEffect: boolean;
        submitText: string;
        modes: Record<number, string>;
    };

    /**
     * Provide centralized handling of mouse clicks on control buttons.
     * Delegate responsibility out to action-specific handlers depending on the button action.
     * @param event The originating click event
     */
    protected _onEffectControl(event: Event): void;

    /**
     * Handle adding a new change to the changes array.
     * @param button    The clicked action button
     */
    private _addEffectChange(button: HTMLElement): HTMLElement;

    /** @override */
    protected _updateObject(
        event: Event,
        formData: Record<string, unknown> & { changes?: foundry.data.EffectChangeSource },
    ): ReturnType<ActiveEffect['update']>;
}
