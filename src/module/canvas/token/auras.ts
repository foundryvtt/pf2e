import { ActorPF2e } from "@actor";
import { TokenAura } from "./aura";
import { TokenPF2e } from "./object";

export class TokenAuras extends Map<string, TokenAura> {
    constructor(private readonly token: TokenPF2e) {
        super();
    }

    /** The ID of the highlight layer for this aura's token */
    get highlightId(): string {
        return this.token.highlightId;
    }

    /** Add and remove auras as needed, notify tokens of new auras */
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
            const aura = this.get(slug) ?? new TokenAura({ token: this.token, ...data });
            if (!this.token.children.includes(aura)) {
                this.set(slug, this.token.addChild(aura));

                // Skip notification on initial game load
                if (game.ready) this.notifyActors();
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

    /**
     * Notify tokens' actors if they are inside an aura in this collection
     * @param [specific] Only notify a single specific actor
     */
    async notifyActors(specific?: TokenPF2e): Promise<void> {
        const auraActor = this.token.actor;
        if (!auraActor || this.size === 0) return;

        const tokensToCheck = (specific ? [specific] : canvas.tokens.placeables).filter(
            (t): t is TokenPF2e & { actor: ActorPF2e } => !!t.actor?.canUserModify(game.user, "update")
        );

        for (const [key, aura] of this.entries()) {
            const auraData = auraActor.auras.get(key);
            if (!auraData) continue;

            const containedTokens = tokensToCheck.filter(
                (t) => (aura.includesSelf || t !== aura.token) && aura.containsToken(t)
            );

            // Get unique actors and notify
            const affectedActors = new Set(containedTokens.map((t) => t.actor));
            for (const actor of affectedActors) {
                await actor.applyAreaEffects(auraData, { origin: auraActor });
            }
        }

        // Get unique actors and check
        const actorsToCheck = new Set(tokensToCheck.map((t) => t.actor));
        for (const actor of actorsToCheck) {
            await actor.checkAreaEffects();
        }
    }

    /** Deallocate the aura's GPU memory before removing from map */
    override delete(key: string): boolean {
        const aura = this.get(key);
        if (!aura?.destroyed) aura?.destroy();
        this.notifyActors();

        return super.delete(key);
    }

    /** Destroy highlight layer before clearing map */
    override clear(): void {
        this.clearHighlights();
        for (const child of this.token.children) {
            if (child instanceof TokenAura) {
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
