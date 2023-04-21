import { AuraColors, AuraData } from "@actor/types.ts";
import { ItemTrait } from "@item/data/base.ts";
import { measureDistanceCuboid } from "@module/canvas/index.ts";
import { EffectAreaSquare } from "@module/canvas/effect-area-square.ts";
import { getAreaSquares } from "@module/canvas/token/aura/util.ts";
import { ScenePF2e } from "@scene/document.ts";
import { TokenDocumentPF2e } from "../document.ts";
import type { TokenAuraData } from "./types.ts";

class TokenAura implements TokenAuraData {
    slug: string;

    token: TokenDocumentPF2e;

    level: number | null;

    /** The radius of the aura in feet */
    radius: number;

    traits: Set<ItemTrait>;

    colors: AuraColors | null;

    #squares?: EffectAreaSquare[];

    constructor(args: TokenAuraParams) {
        this.slug = args.slug;
        this.token = args.token;
        this.level = args.level;
        this.radius = args.radius;
        this.traits = args.traits;
        this.colors = args.colors ?? null;
    }

    /** The aura radius from the center in pixels */
    get radiusPixels(): number {
        const gridSize = this.scene.grid.distance;
        const gridSizePixels = this.scene.grid.size;
        const tokenWidth = this.token.width * gridSizePixels;
        return 0.5 * tokenWidth + (this.radius / gridSize) * gridSizePixels;
    }

    private get scene(): ScenePF2e {
        return this.token.scene!;
    }

    get bounds(): PIXI.Rectangle {
        const { token, radiusPixels } = this;
        const tokenWidth = token.width * this.scene.grid.size;
        const tokenBounds = token.bounds;

        return new PIXI.Rectangle(
            tokenBounds.x - (radiusPixels - tokenWidth / 2),
            tokenBounds.y - (radiusPixels - tokenWidth / 2),
            radiusPixels * 2,
            radiusPixels * 2
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
        // 1. If the token is the one emitting the aura, return true early
        if (token === this.token) return true;

        // 2. If this aura is out of range, return false early
        if (this.token.object!.distanceTo(token.object!) > this.radius) return false;

        // 3. Check whether any aura square intersects the token's space
        return this.squares.some((s) => s.active && measureDistanceCuboid(s, token.bounds) === 0);
    }

    /**
     * Notify tokens' actors if they are inside an aura in this collection
     * @param [specific] A limited list of tokens whose actors will be notified
     */
    async notifyActors(specific?: TokenDocumentPF2e[]): Promise<void> {
        const auraActor = this.token.actor;
        if (!(auraActor && this.scene.isInFocus)) return;

        const tokensToCheck = (specific ? specific : this.token.scene?.tokens.contents ?? []).filter(
            (t) => !!t.actor?.canUserModify(game.user, "update")
        );

        const auraData = auraActor.auras.get(this.slug);
        if (!auraData) return;

        const containedTokens = tokensToCheck.filter((t) => this.containsToken(t));

        // Get unique actors and notify
        const affectedActors = new Set(containedTokens.flatMap((t) => t.actor ?? []));
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
    traits: Set<ItemTrait>;
}

export { TokenAura, TokenAuraData };
