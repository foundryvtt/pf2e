export function patchTokenClasses(): void {
    /**
     * Setting a hook on TokenHUD.clear(), which clears the HUD by fading out it's active HTML and recording the new display state.
     * The hook call passes the TokenHUD and Token objects.
     */
    TokenHUD.prototype.clear = function clear(this: TokenHUD) {
        BasePlaceableHUD.prototype.clear.call(this);
        Hooks.call("clearTokenHUD", this, this.object);
    };
}
