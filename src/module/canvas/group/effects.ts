import type { AmbientLightPF2e, TokenPF2e } from "../index.ts";

class EffectsCanvasGroupPF2e extends fc.groups.EffectsCanvasGroup<TokenPF2e | AmbientLightPF2e> {
    static #colorFilter = new PIXI.ColorMatrixFilter();

    /** (De)saturate darkness lights if a vision source has darkvision. */
    override refreshLighting(): void {
        super.refreshLighting();
        const darknessFilters = (this.darkness.filters ??= []);
        const colorFilter = EffectsCanvasGroupPF2e.#colorFilter;
        const withDarkvision = this.visionSources.find(
            (s) => "hasDarkvision" in s.object.document && s.object.document.hasDarkvision,
        );
        const tokenDoc = withDarkvision?.object.document;
        if (!tokenDoc || !("actor" in tokenDoc) || withDarkvision.isBlinded) {
            darknessFilters.findSplice((f) => f === colorFilter);
            return;
        }
        const adjustment = tokenDoc.actor?.flags[SYSTEM_ID]?.colorDarkvision ? "saturate" : "desaturate";
        colorFilter[adjustment]();
        if (!darknessFilters.includes(colorFilter)) {
            darknessFilters.push(colorFilter);
        }
    }
}

export { EffectsCanvasGroupPF2e };
