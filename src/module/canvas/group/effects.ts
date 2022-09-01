class EffectsCanvasGroupPF2e extends EffectsCanvasGroup {
    /** Temporarily disable the refreshLighting hook */
    noRefreshHooks = false;

    /** Is rules-based vision enabled and applicable to the scene? */
    get rulesBasedVision(): boolean {
        return game.settings.get("pf2e", "automation.rulesBasedVision") && canvas.ready && !!canvas.scene?.tokenVision;
    }

    /** Add a noHook option that can be intercepted by system hook listener */
    override refreshLighting(noHook = false): void {
        this.noRefreshHooks = noHook;
        super.refreshLighting();
        this.noRefreshHooks = false;
    }
}

export { EffectsCanvasGroupPF2e };
