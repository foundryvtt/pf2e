export {};

declare global {
    interface ActiveEffectConfigOptions extends DocumentSheetOptions {
        classes: string[];
        title: string;
        template: string;
        width: number;
        height: string;
        tabs: [
            {
                navSelector: ".tabs";
                contentSelector: "form";
                initial: "details";
            }
        ];
    }

    interface ActiveEffectConfigData<
        TDocument extends ActiveEffect<
            Actor<TokenDocument<Scene | null> | null> | Item<Actor<TokenDocument<Scene | null> | null> | null> | null
        >
    > extends DocumentSheetData<TDocument> {
        effect: TDocument;
        isActorEffect: boolean;
        isItemEffect: boolean;
        submitText: string;
        modes: Record<number, string>;
    }

    class ActiveEffectConfig<
        TDocument extends ActiveEffect<
            Actor<TokenDocument<Scene | null> | null> | Item<Actor<TokenDocument<Scene | null> | null> | null> | null
        >
    > extends DocumentSheet<TDocument> {
        static override get defaultOptions(): ActiveEffectConfigOptions;

        override getData(options?: DocumentSheetOptions): ActiveEffectConfigData<TDocument>;

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

        protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
    }
}
