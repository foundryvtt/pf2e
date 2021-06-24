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
        Hooks.call('onTokenHUDClear', this, this.object);
    };
}
