export {};

declare global {
    /** Allows for viewing and editing of Keybinding Actions */
    class KeybindingsConfig extends PackageConfiguration {
        static override get defaultOptions(): FormApplicationOptions;

        static override get categoryOrder(): string[];

        protected _categorizeEntry(namespace: string): { id: string; title: string };

        protected _prepareCategoryData(): { categories: object[]; total: number };

        /**
         * Add faux-keybind actions that represent the possible Mouse Controls
         * @param categories The current Map of Categories to add to
         * @returns The number of Actions added
         */
        protected _addMouseControlsReference(categories: Map<string, object>): number;

        /** Given an Binding and its parent Action, detects other Actions that might conflict with that binding */
        _detectConflictingActions(
            actionId: string,
            action: KeybindingActionConfig,
            binding: KeybindingAction,
        ): KeybindingAction[];

        /** Transforms a Binding into a human-readable string representation */
        static _humanizeBinding(binding: KeybindingActionBinding): string;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        override activateListeners(html: JQuery): void;

        protected override _onResetDefaults(event: Event): Promise<void>;

        /** Handle Control clicks */
        protected _onClickBindingControl(event: MouseEvent): void;

        /** Handle left-click events to show / hide a certain category */
        protected _onClickAdd(event: MouseEvent): Promise<void>;

        /** Handle left-click events to show / hide a certain category */
        protected _onClickDelete(event: MouseEvent): Promise<void>;

        /** Inserts a Binding into the Pending Edits object, creating a new Map entry as needed */
        protected _addPendingEdit(
            namespace: string,
            action: string,
            bindingIndex: number,
            binding: KeybindingActionBinding,
        ): void;

        /** Toggle visibility of the Edit / Save UI */
        protected _onClickEditableBinding(event: MouseEvent): void;

        /** Toggle visibility of the Edit UI */
        protected _onDoubleClickKey(event: MouseEvent): void;

        /** Save the new Binding value and update the display of the UI */
        protected _onClickSaveBinding(event: MouseEvent): Promise<void>;

        /** Given a clicked Action element, finds the parent Action */
        protected _getParentAction(event: MouseEvent | KeyboardEvent): object;

        /** Given a Clicked binding control element, finds the parent Binding */
        protected _getParentBinding(event: MouseEvent | KeyboardEvent): {
            bindingHTML: HTMLElement | null;
            bindingId: string | undefined;
        };

        /** Iterates over all Pending edits, merging them in with unedited Bindings and then saving and resetting the UI */
        protected _savePendingEdits(): Promise<void>;

        /** Processes input from the keyboard to form a list of pending Binding edits */
        protected _onKeydownBindingInput(event: KeyboardEvent): void;

        // Not actually implemented but requires by `FormApplication`
        protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<unknown>;
    }
}
