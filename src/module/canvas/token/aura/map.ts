import { AuraRenderer } from "./renderer.ts";
import { TokenPF2e } from "../object.ts";

export class AuraRenderers extends Map<string, AuraRenderer> {
    constructor(private readonly token: TokenPF2e) {
        super();
    }

    /** The ID of the highlight layer for this aura's token */
    get highlightId(): string {
        return this.token.highlightId;
    }

    /** Draw this token's auras on the canvas */
    draw(): void {
        this.clear();
        if (!(canvas.ready && this.token.actor)) {
            return;
        }

        for (const [slug, aura] of this.token.document.auras.entries()) {
            const renderer = new AuraRenderer({ ...aura, token: this.token });
            this.set(slug, this.token.addChild(renderer));
        }

        this.refresh();
    }

    refresh(): void {
        if (this.size === 0) return;

        this.clearHighlights();
        if (this.token.isPreview || this.token.isAnimating) return;

        if (this.token.hover) {
            const { highlightId } = this;
            const highlight = canvas.grid.highlightLayers[highlightId] ?? canvas.grid.addHighlightLayer(highlightId);
            highlight.clear();

            for (const aura of this.values()) {
                aura.highlight();
            }
        }
    }

    /** Deallocate the aura's GPU memory before removing from map */
    override delete(key: string): boolean {
        const aura = this.get(key);
        if (!aura) return false;
        this.token.removeChild(aura);
        if (!aura.destroyed) aura.destroy();

        return super.delete(key);
    }

    /** Destroy highlight layer before clearing map */
    override clear(): void {
        this.clearHighlights();
        for (const child of this.token.children) {
            if (child instanceof AuraRenderer) {
                this.token.removeChild(child);
                if (!child.destroyed) child.destroy();
            }
        }

        return super.clear();
    }

    clearHighlights(): void {
        canvas.grid.destroyHighlightLayer(this.highlightId);
    }
}
