import { AuraAppearanceData, AuraData, AuraEffectData } from "@actor/types.ts";
import { ItemTrait } from "@item/base/data/system.ts";
import { EffectAreaSquare } from "@module/canvas/effect-area-square.ts";
import { measureDistanceCuboid } from "@module/canvas/index.ts";
import { getAreaSquares } from "@module/canvas/token/aura/util.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import type { TokenAuraData } from "./types.ts";

class TokenAura implements TokenAuraData {
    slug: string;

    token: TokenDocumentPF2e;

    level: number | null;

    /** The radius of the aura in feet */
    radius: number;

    traits: ItemTrait[];

    effects: AuraEffectData[];

    appearance: AuraAppearanceData;

    #squares?: EffectAreaSquare[];

    constructor(params: TokenAuraParams) {
        this.slug = params.slug;
        this.token = params.token;
        this.level = params.level;
        this.radius = params.radius;
        this.traits = params.traits;
        this.effects = params.effects;
        this.appearance = params.appearance;
    }

    /** The aura radius from the center in pixels */
    get radiusPixels(): number {
        const gridSize = this.scene.grid.distance;
        const gridSizePixels = this.scene.grid.size;
        const tokenWidth = this.token.mechanicalBounds.width;
        return 0.5 * tokenWidth + (this.radius / gridSize) * gridSizePixels;
    }

    get scene(): ScenePF2e {
        return this.token.scene!;
    }

    get bounds(): PIXI.Rectangle {
        const { token, radiusPixels } = this;
        const bounds = token.mechanicalBounds;
        return new PIXI.Rectangle(
            bounds.x - (radiusPixels - bounds.width / 2),
            bounds.y - (radiusPixels - bounds.width / 2),
            radiusPixels * 2,
            radiusPixels * 2,
        );
    }

    get center(): Point {
        return this.token.center;
    }

    /** The squares covered by this aura */
    get squares(): EffectAreaSquare[] {
        return (this.#squares ??= getAreaSquares(this));
    }

    /** Does this aura overlap with (at least part of) a token? */
    containsToken(token: TokenDocumentPF2e): boolean {
        // If either token is hidden or not rendered, return false early
        if (this.token.hidden || token.hidden || !this.token.object || !token.object) {
            return false;
        }

        // If the token is the one emitting the aura, return true early
        if (token === this.token) return true;

        // If this aura is out of range, return false early
        if (this.token.object.distanceTo(token.object) > this.radius) return false;

        // Check whether any aura square intersects the token's space
        return this.squares.some((s) => s.active && measureDistanceCuboid(s, token.mechanicalBounds) === 0);
    }

    /** Notify tokens' actors if they are inside this aura. */
    async notifyActors(): Promise<void> {
        if (!this.scene.isInFocus) return;

        const auraActor = this.token.actor;
        const auraData = auraActor?.auras.get(this.slug);
        if (!(auraActor && auraData?.effects.length)) return;

        const auradTokens = this.scene.tokens.filter(
            (t) => t.actor?.primaryUpdater === game.user && this.containsToken(t),
        );
        const affectedActors = new Set(auradTokens.flatMap((t) => t.actor ?? []));

        const origin = { actor: auraActor, token: this.token };
        for (const actor of affectedActors) {
            await actor.applyAreaEffects(auraData, origin);
        }
    }
}

interface TokenAuraParams extends Omit<AuraData, "effects" | "traits"> {
    slug: string;
    level: number | null;
    radius: number;
    token: TokenDocumentPF2e;
    traits: ItemTrait[];
    effects: AuraEffectData[];
}

export { TokenAura, TokenAuraData };
