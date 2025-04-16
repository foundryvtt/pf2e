class EffectsCanvasGroupPF2e extends fc.groups.EffectsCanvasGroup {
    /** Is rules-based vision enabled and applicable to the scene? */
    get rulesBasedVision(): boolean {
        return game.pf2e.settings.rbv && canvas.ready && !!canvas.scene?.tokenVision;
    }
}

export { EffectsCanvasGroupPF2e };
