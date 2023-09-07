import { AuraColors, AuraData } from "@actor/types.ts";
import { ItemTrait } from "@item/data/base.ts";
import { TokenAuraData } from "@scene/token-document/aura/index.ts";
import { EffectAreaSquare } from "../../effect-area-square.ts";
import { TokenPF2e } from "../index.ts";
import { getAreaSquares } from "./util.ts";

/** Visual rendering of auras emanated by a token's actor */
class AuraRenderer extends PIXI.Graphics implements TokenAuraData {
    /** The token associated with this aura */
    token: TokenPF2e;

    /** The radius of the aura in feet */
    radius: number;

    /** The aura radius from the center in pixels */
    radiusPixels: number;

    /** Traits associated with this aura: used to configure collision detection */
    traits: Set<ItemTrait>;

    /** Border and fill colors in hexadecimal */
    colors: TokenAuraColors;

    /** Standard line thickness for circle shape and label markers */
    static readonly LINE_THICKNESS = 3;

    constructor(params: AuraRendererParams) {
        super();

        this.token = params.token;
        this.colors = this.#convertColors(params.colors);
        this.radius = params.radius;
        this.radiusPixels = 0.5 * this.token.w + (this.radius / (canvas.dimensions?.distance ?? 0)) * canvas.grid.size;
        this.traits = new Set(params.traits);
    }

    get bounds(): PIXI.Rectangle {
        const { token, radiusPixels } = this;

        return new PIXI.Rectangle(
            token.bounds.x - (radiusPixels - token.bounds.width / 2),
            token.bounds.y - (radiusPixels - token.bounds.width / 2),
            radiusPixels * 2,
            radiusPixels * 2
        );
    }

    /** ID of `GridHighlight` container for this aura's token */
    get highlightLayer(): GridHighlight | null {
        return canvas.grid?.getHighlightLayer(this.token.highlightId) ?? null;
    }

    /** The squares covered by this aura */
    get squares(): EffectAreaSquare[] {
        return getAreaSquares(this);
    }

    /** Whether this aura's parent token is in an active encounter */
    get inEncounter(): boolean {
        return !!this.token.combatant?.encounter.started;
    }

    /** Draw the aura's circular emanation */
    draw(): void {
        this.#drawRing();
        if (this.token.controlled || this.token.hover || this.token.layer.highlightObjects || this.inEncounter) {
            this.visible = true;
        }
    }

    /** Highlight the affected grid squares of this aura and indicate the radius */
    highlight(): void {
        const { dimensions } = canvas;
        if (!dimensions) return;

        this.#drawLabel();

        // For now, only highlight if there is an active combat
        if (this.inEncounter) {
            const { highlightLayer } = this;
            if (!highlightLayer) return;

            for (const square of this.squares) {
                square.highlight(highlightLayer, this.colors);
            }
        }
    }

    /**
     * Convert HTML color strings to hexadecimal values
     * Due to a bug in the core BaseGrid class, black (0) is treated as the color being excluded
     */
    #convertColors(colors: AuraColors | null): TokenAuraColors {
        const user =
            game.users.find((u) => !!u.character && u.character.id === this.token.actor?.id) ??
            game.users.find((u) => u.isGM && u.active) ??
            game.user;

        return {
            border: Number(foundry.utils.Color.fromString(colors?.border ?? "#000000")),
            fill: Number(foundry.utils.Color.fromString(colors?.fill ?? user.color ?? "#000000")),
        };
    }

    #drawRing(): void {
        if (this.geometry.drawCalls.length > 0) return;

        this.beginFill(this.colors.fill, 0)
            .lineStyle(AuraRenderer.LINE_THICKNESS, this.colors.border, 0.75)
            .drawCircle(this.token.w / 2, this.token.h / 2, this.radiusPixels)
            .endFill();
    }

    /** Add a numeric label and marker dot indicating the emanation radius */
    #drawLabel(): void {
        const style = CONFIG.canvasTextStyle.clone();
        const gridSize = canvas.dimensions?.size ?? 100;
        style.fontSize = Math.max(Math.round(gridSize * 0.36 * 12) / 12, 36);
        style.align = "center";

        const gridUnits = canvas.scene?.grid.units.trim() || game.system.gridUnits;
        const label = [this.radius, gridUnits].join("");
        const text = new PreciseText(label, style);
        const { center } = this.token;
        text.position.set(center.x, center.y - this.radiusPixels);

        this.highlightLayer
            ?.beginFill(0x000000, 0.5)
            .lineStyle(AuraRenderer.LINE_THICKNESS, 0x000000)
            .drawCircle(text.position.x, text.position.y, 6)
            .endFill()
            .addChild(text);
    }
}

interface TokenAuraColors {
    border: number;
    fill: number;
}

interface AuraRendererParams extends Omit<AuraData, "effects" | "traits"> {
    token: TokenPF2e;
    traits: Set<ItemTrait>;
}

export { AuraRenderer, TokenAuraColors };
