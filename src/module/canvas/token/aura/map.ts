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
            if (!this.token.actor.auras.has(slug)) {
                this.delete(slug);
            }
        }

        for (const [slug, data] of this.token.actor.auras.entries() ?? []) {
            const aura = this.get(slug) ?? new AuraRenderer({ token: this.token, ...data });
            if (!this.token.children.includes(aura)) {
                this.set(slug, this.token.addChild(aura));
            } else if (aura.radius !== data.radius) {
                // The radius changed: remove old aura and set new one
                this.delete(slug);
                this.set(slug, new AuraRenderer({ token: this.token, ...data }));
            }
        }

        this.refresh();
    }

    refresh(): void {
        if (this.size === 0) return;

        this.clearHighlights();
        if (this.token.isMoving) return;

        if (this.token.isHovered) {
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
        if (!aura?.destroyed) aura?.destroy();
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
