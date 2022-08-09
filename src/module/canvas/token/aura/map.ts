import { AuraRenderer } from "./renderer";
import { TokenPF2e } from "../object";

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
        if (!(canvas.ready && this.token.actor)) {
            this.clear();
            return;
        }

        for (const slug of this.keys()) {
            if (!this.token.document.auras.has(slug)) {
                this.delete(slug);
            }
        }

        for (const [slug, aura] of this.token.document.auras.entries() ?? []) {
            const renderer = this.get(slug) ?? new AuraRenderer({ ...aura, token: this.token });
            if (!this.token.children.includes(renderer)) {
                this.set(slug, this.token.addChild(renderer));
            } else if (renderer.radiusPixels !== aura.radiusPixels) {
                // The radius changed: remove old aura and set new one
                this.delete(slug);
                this.set(slug, this.token.addChild(new AuraRenderer({ ...aura, token: this.token })));
            }
        }

        this.refresh();
    }

    refresh(): void {
        if (this.size === 0) return;

        this.clearHighlights();
        if (this.token.isMoving) return;

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
