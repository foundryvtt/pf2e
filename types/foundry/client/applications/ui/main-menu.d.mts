import { ApplicationConfiguration } from "../_module.mjs";
import ApplicationV2 from "../api/application.mjs";
import HandlebarsApplicationMixin, { HandlebarsTemplatePart } from "../api/handlebars-application.mjs";

interface MainMenuItem {
    label: string;
    icon: string;
    enbaled: boolean | (() => boolean);
    onClick: (arg0: Event) => void;
}

/**
 * The main menu application which is toggled via the ESC key.
 */
export default class MainMenu extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * Configuration of Main Menu items.
     */
    static ITEMS: Record<string, MainMenuItem>;

    /**
     * A record of menu items which are currently enabled.
     */
    get items(): Record<string, MainMenuItem>;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _onFirstRender(): Promise<void>;

    protected override _prepareContext(): Promise<{ items: Record<string, MainMenuItem> }>;

    /**
     * Toggle display of the menu, or render it in the first place.
     */
    toggle(): Promise<void>;
}

export {};
