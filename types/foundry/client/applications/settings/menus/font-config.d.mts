import {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationFormConfiguration,
    ApplicationRenderContext,
} from "@client/applications/_types.mjs";
import ApplicationV2 from "@client/applications/api/application.mjs";
import HandlebarsApplicationMixin, {
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "@client/applications/api/handlebars-application.mjs";
import { FontDefinition, FontFamilyDefinition } from "@client/config.mjs";

interface NewFontDefinition {
    family: string;
    weight?: number;
    style?: string;
    src?: string;
    preview?: string;
}

interface FontConfigConfiguration extends ApplicationConfiguration, NewFontDefinition {
    family: string;
    weight?: number;
    style?: string;
    src?: string;
    preview?: string;
}

/**
 * A V2 application responsible for configuring custom fonts for the world.
 */
export default class FontConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options?: DeepPartial<FontConfigConfiguration>);

    /**
     * Font types.
     */
    static FONT_TYPES: Readonly<{
        FILE: "file";
        SYSTEM: "system";
    }>;

    /**
     * The Foundry game setting key storing the world's fonts.
     */
    static SETTING: "fonts";

    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * The new or in-progress font object we're editing.
     */
    object: NewFontDefinition;

    /* -------------------------------------------- */
    /*  Static Font Management                      */
    /* -------------------------------------------- */

    /**
     * Returns a list of loaded font families.
     */
    static getAvailableFonts(): string[];

    /**
     * Returns a record of loaded font families, formatted for selectOptions.
     */
    static getAvailableFontChoices(): Record<string, string>;

    /**
     * Load a font definition for a given family.
     * @param family The font family name (case-sensitive).
     * @param definition The font family definition.
     * @returns Returns true if the font was successfully loaded.
     */
    static loadFont(family: string, definition: FontFamilyDefinition): Promise<boolean>;

    /**
     * Ensure that fonts have loaded and are ready for use.
     * Enforce a maximum timeout in milliseconds.
     * Proceed after that point even if fonts are not yet available.
     * @param ms The maximum time to spend loading fonts before proceeding.
     * @internal
     */
    static _loadFonts(ms?: number): Promise<void>;

    /**
     * Collect font definitions from both config and user settings.
     */
    protected static _collectDefinitions(): Record<string, FontFamilyDefinition>[];

    /**
     * Create a FontFace from a definition.
     * @param family The font family name.
     * @param definition The font definition.
     * @returns The new FontFace.
     */
    protected static _createFontFace(family: string, definition: FontDefinition): FontFace;

    /**
     * Format a font definition for display.
     * @param family The font family name.
     * @param definition The font definition.
     * @returns The formatted definition.
     */
    protected static _formatFont(family: string, definition: FontDefinition): string;

    /* -------------------------------------------- */
    /*  Application                                 */
    /* -------------------------------------------- */

    protected override _onRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;

    protected override _prepareContext(): Promise<ApplicationRenderContext>;

    /**
     * Build an array of font data objects for a specific font family definition.
     * @param family The name of the font family.
     * @param definition The font family definition, expected to have a `fonts` array.
     * @returns An array of font data objects.
     */
    protected _getDataForDefinition(
        family: string,
        definition: FontFamilyDefinition,
    ): { family: string; index: number; selected: boolean; font: string }[];

    protected override _onClickAction(event: PointerEvent, htmlElement: HTMLElement): void;

    protected override _onChangeForm(formConfig: ApplicationFormConfiguration, event: Event): void;

    /**
     * Add a new font definition.
     */
    protected _onAddFont(): Promise<void>;

    /**
     * Delete a font from definitions.
     */
    protected _onDeleteFont(event: PointerEvent): Promise<void>;

    /**
     * Select a font to preview/edit.
     */
    protected _onSelectFont(event: PointerEvent): void;

    override close(options?: ApplicationClosingOptions): Promise<this>;
}

export {};
