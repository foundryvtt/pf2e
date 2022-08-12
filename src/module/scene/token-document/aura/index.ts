import { ItemTrait } from "@item/data/base";
import { EffectAreaSquare } from "@module/canvas/effect-area-square";
import { getAreaSquares } from "@module/canvas/token/aura/util";
import { ScenePF2e } from "@scene/document";
import { TokenAuraData } from "./types";
import { TokenDocumentPF2e } from "../document";
import { measureDistanceRect } from "@module/canvas";
import { ActorPF2e } from "@actor";
import { AuraColors, AuraData } from "@actor/types";

class TokenAura implements TokenAuraData {
    slug: string;

    token: Embedded<TokenDocumentPF2e>;

    /** The radius of the aura in feet */
    radius: number;

    traits: Set<ItemTrait>;

    colors: AuraColors | null;

    /** Does this aura affect its emanating token? */
    private includesSelf: boolean;

    constructor(args: TokenAuraParams) {
        this.slug = args.slug;
        this.token = args.token;

        this.radius = args.radius;

        this.traits = args.traits;
        this.colors = args.colors ?? null;
        this.includesSelf = args.includesSelf;
    }

    /** The aura radius from the center in pixels */
    get radiusPixels(): number {
        const gridSize = this.scene.grid.distance;
        const gridSizePixels = this.scene.grid.size;
        const tokenWidth = this.token.width * gridSizePixels;
        return 0.5 * tokenWidth + (this.radius / gridSize) * gridSizePixels;
    }

    private get scene(): ScenePF2e {
        return this.token.scene;
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
        return getAreaSquares(this);
    }

    /** Does this aura overlap with (at least part of) a token? */
    containsToken(token: Embedded<TokenDocumentPF2e>): boolean {
        // 1. If the token is the one emitting the aura, return early according to whether it `includesSelf`
        if (token === this.token) return this.includesSelf;

        // 2. If this aura is out of range, return false early
        if (this.token.object.distanceTo(token.object) > this.radius) return false;

        // 3. Check whether any aura square intersects the token's space
        return this.squares.some((s) => s.active && measureDistanceRect(s, token.bounds) === 0);
    }

    /**
     * Notify tokens' actors if they are inside an aura in this collection
     * @param [specific] A limited list of tokens whose actors will be notified
     */
    async notifyActors(specific?: TokenDocumentPF2e[]): Promise<void> {
        const auraActor = this.token.actor;

        // Get either the scene with an active combat or the active scene
        const sceneOfFocus = game.combats.active?.combatant?.token?.scene ?? game.scenes.active ?? null;
        if (!(auraActor && sceneOfFocus && this.scene === sceneOfFocus)) return;

        const tokensToCheck = (specific ? specific : this.token.scene?.tokens.contents ?? []).filter(
            (t): t is Embedded<TokenDocumentPF2e> & { actor: ActorPF2e } =>
                !!t.actor?.canUserModify(game.user, "update")
        );

        const auraData = auraActor.auras.get(this.slug);
        if (!auraData) return;

        const containedTokens = tokensToCheck.filter(
            (t) => (this.includesSelf || t !== this.token) && this.containsToken(t)
        );

        // Get unique actors and notify
        const affectedActors = new Set(containedTokens.map((t) => t.actor));
        for (const actor of affectedActors) {
            await actor.applyAreaEffects(auraData, { origin: auraActor });
        }
    }
}

interface TokenAuraParams extends Omit<AuraData, "effects" | "traits"> {
    slug: string;
    radius: number;
    token: Embedded<TokenDocumentPF2e>;
    traits: Set<ItemTrait>;
    includesSelf: boolean;
}

export { TokenAura, TokenAuraData };
