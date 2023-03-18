/**
 * A Macro configuration sheet
 *
 * @see {@link Macro} The Macro Entity which is being configured
 */
declare class MacroConfig<TMacro extends Macro> extends DocumentSheet<TMacro> {
    override getData(options?: DocumentSheetOptions): MacroConfigData<TMacro>;

    override activateListeners(html: JQuery): void;
}

declare interface MacroConfigData<TMacro extends Macro> extends DocumentSheetData<TMacro> {
    macroTypes: ["chat", "script"];
    macroScopes: (typeof CONST)["MACRO_SCOPES"];
}
