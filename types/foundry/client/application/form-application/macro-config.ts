/**
 * A Macro configuration sheet
 *
 * @see {@link Macro} The Macro Entity which is being configured
 */
declare class MacroConfig<MacroType extends Macro> extends DocumentSheet<MacroType> {
    override getData(options?: DocumentSheetOptions): MacroConfigData;

    override activateListeners(html: JQuery): void;
}

declare interface MacroConfigData extends DocumentSheetData {
    macroTypes: Game['system']['entityTypes']['Macro'] | ['chat'];
    macroScopes: typeof CONST['MACRO_SCOPES'];
}
