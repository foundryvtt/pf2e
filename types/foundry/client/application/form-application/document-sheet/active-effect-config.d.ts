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
                navSelector: '.tabs';
                contentSelector: 'form';
                initial: 'details';
            },
        ];
    }

    interface ActiveEffectConfigData<TDocument extends ActiveEffect = ActiveEffect>
        extends DocumentSheetData<TDocument> {
        effect: TDocument;
        isActorEffect: boolean;
        isItemEffect: boolean;
        submitText: string;
        modes: Record<number, string>;
    }

    class ActiveEffectConfig<TDocument extends ActiveEffect = ActiveEffect> extends DocumentSheet<TDocument> {
        /** @override */
        static get defaultOptions(): ActiveEffectConfigOptions;

        /** @override */
        getData(options?: DocumentSheetOptions): ActiveEffectConfigData<TDocument>;

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
            formData: Record<string, unknown> & { changes?: foundry.data.EffectChangeData[] },
        ): Promise<void>;
    }
}
