import { EnrichContent } from "./ui/enrich-content";

/** Patch EntityCollection and Compendium classes to fix Foundry bug causing new compendium entities to be created from
 *  derived data
 */
export function patchTokenClasses(): void {
    /**
     * Setting a hook on TokenHUD.clear(), which clears the HUD by fading out it's active HTML and recording the new display state.
     * The hook call passes the TokenHUD and Token objects.
     */
    TokenHUD.prototype.clear = function clear(this: TokenHUD) {
        BasePlaceableHUD.prototype.clear.call(this);
        Hooks.call("onTokenHUDClear", this, this.object);
    };
}

/**
 * Patches the TextEditor to fix a core bug and eventually add new PF2e specific functionality
 */
export function patchTextEditor(): void {
    const baseEnrichHTML = TextEditor.enrichHTML;
    TextEditor.enrichHTML = function enrichHTML(content: string, options?: EnrichHTMLOptions) {
        content = EnrichContent.enrichString(content, options);

        content = baseEnrichHTML.call(this, content, options);

        const $html = $("<div/>");
        $html.html(content);

        // remove elements the user does not have permission to see
        $html.find('[data-visibility="none"]').remove();

        if (!game.user.isGM) {
            $html.find('[data-visibility="gm"]').remove();
        }

        // Fix a core bug where roll data doesn't apply to the formula
        const rollData = options?.rollData;
        if (rollData) {
            $html.find("a.inline-roll").each((_idx, element) => {
                const formula = element.dataset.formula;
                if (formula) {
                    element.dataset.formula = Roll.replaceFormulaData(formula, rollData);
                }
            });
        }

        return $html.html();
    };
}
