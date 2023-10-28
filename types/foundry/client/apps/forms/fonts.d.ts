export {};

declare global {
    /** A class responsible for configuring custom fonts for the world. */
    class FontConfig extends FormApplication {
        /**
         * An application for configuring custom world fonts.
         * @param [object]  The default settings for new font definition creation.
         * @param [options] Additional options to configure behaviour.
         */
        constructor(object?: NewFontDefinition, options?: Partial<FormApplicationOptions>);

        static override get defaultOptions(): FormApplicationOptions;

        /** Whether a font is distributed to connected clients or found on their OS. */
        static FONT_TYPES: {
            FILE: "file";
            SYSTEM: "system";
        };

        override getData(options?: Partial<FormApplicationOptions>): FormApplicationData;

        /**
         * Template data for a given font definition.
         * @param family     The font family.
         * @param definition The font family definition.
         */
        protected _getDataForDefinition(
            family: string,
            definition: FontFamilyDefinition,
        ): { family: string; index: number; selected?: true; font: unknown }[];

        override activateListeners(html: JQuery): void;

        protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;

        /**
         * Handle application controls.
         * @param event The click event.
         */
        protected _onClickControl(event: MouseEvent): void;

        protected override _onChangeInput(event: Event): Promise<void>;

        /** Update available font fields based on the font type selected. */
        protected _updateFontFields(): void;

        /** Add a new custom font definition. */
        protected _onAddFont(): Promise<void>;

        /**
         * Delete a font.
         * @param event The click event.
         */
        protected _onDeleteFont(event: MouseEvent): Promise<void>;

        /**
         * Select a font to preview.
         * @param event The click event.
         */
        protected _onSelectFont(event: MouseEvent): void;

        /* -------------------------------------------- */
        /*  Font Management Methods                     */
        /* -------------------------------------------- */

        /** Define the setting key where this world's font information will be stored. */
        static SETTING: "fonts";

        /** Get the list of fonts that successfully loaded. */
        static getAvailableFonts(): string[];

        /** Get the list of fonts formatted for display with selectOptions. */
        static getAvailableFontChoices(): Record<string, string>;

        /* -------------------------------------------- */

        /**
         * Load a font definition.
         * @param  family    The font family name (case-sensitive).
         * @param definition The font family definition.
         * @returns Returns true if the font was successfully loaded.
         */
        static loadFont(family: string, definition: FontFamilyDefinition): Promise<boolean>;

        /**
         * Ensure that fonts have loaded and are ready for use.
         * Enforce a maximum timeout in milliseconds.
         * Proceed after that point even if fonts are not yet available.
         * @param [ms=4500] The maximum time to spend loading fonts before proceeding.
         */
        protected static _loadFonts(ms?: number): Promise<void>;

        /**
         * Create FontFace object from a FontDefinition.
         * @param family The font family name.
         * @param font   The font definition.
         * @protected
         */
        protected static _createFontFace(family: string, font: FontDefinition): FontFace;

        /**
         * Format a font definition for display.
         * @param family     The font family.
         * @param definition The font definition.
         * @returns The formatted definition.
         */
        protected static _formatFont(family: string, definition: FontDefinition): string;
    }

    interface NewFontDefinition {
        family?: string;
        weight?: number;
        style?: string;
        src?: string;
        /** The text to preview the font */
        preview?: string;
    }
}
