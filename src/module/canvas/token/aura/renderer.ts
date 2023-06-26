import { AuraColors, AuraData } from "@actor/types.ts";
import { TokenPF2e } from "../index.ts";
import { EffectAreaSquare } from "../../effect-area-square.ts";
import { ItemTrait } from "@item/data/base.ts";
import { getAreaSquares } from "./util.ts";
import { TokenAuraData } from "@scene/token-document/aura/index.ts";

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
    private colors: TokenAuraColors;

    /** Standard line thickness for circle shape and label markers */
    static readonly LINE_THICKNESS = 3;

    constructor(params: AuraRendererParams) {
        super();

        this.token = params.token;
        this.colors = this.#convertColors(params.colors);
        this.radius = params.radius;
        this.radiusPixels = 0.5 * this.token.w + (this.radius / (canvas.dimensions?.distance ?? 0)) * canvas.grid.size;
        this.traits = new Set(params.traits);

        this.draw();
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

    /** The center of an aura is the center of its originating token */
    get center(): Point {
        return this.token.center;
    }

    /** ID of `GridHighlight` container for this aura's token */
    private get highlightId(): string {
        return this.token.highlightId;
    }

    /** The squares covered by this aura */
    get squares(): EffectAreaSquare[] {
        return getAreaSquares(this);
    }

    /**
     * Whether this aura should be rendered to the user:
     * The scene must be active, or a GM must be the only user logged in. If rendering for a player, the aura must
     * emanate from an ally.
     */
    get shouldRender(): boolean {
        if (canvas.scene?.grid.type !== CONST.GRID_TYPES.SQUARE || !canvas.scene.tokenVision) {
            return false;
        }

        return canvas.scene.isInFocus && (this.token.actor?.alliance === "party" || game.user.isGM);
    }

    /** Draw the aura's circular emanation */
    draw(): void {
        this.visible = false;
        if (!this.shouldRender) return;

        this.beginFill(this.colors.fill, 0)
            .lineStyle(AuraRenderer.LINE_THICKNESS, this.colors.border, 0.75)
            .drawCircle(this.token.w / 2, this.token.h / 2, this.radiusPixels)
            .endFill();

        this.visible = true;
    }

    /** Highlight the affected grid squares of this aura and indicate the radius */
    highlight(): void {
        const { dimensions, grid } = canvas;
        if (!dimensions) return;

        // For now, only highlight if there is an active combat
        const { shouldRender } = this;
        if (!game.combats.active?.started && shouldRender) return this.#drawLabel();

        const highlightLayer = grid.getHighlightLayer(this.highlightId)?.clear();
        if (!(highlightLayer && shouldRender)) return;

        for (const square of this.squares) {
            square.highlight(highlightLayer, this.colors);
        }
        this.#drawLabel();
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

    /** Add a numeric label and marker dot indicating the emanation radius */
    #drawLabel(): void {
        const style = CONFIG.canvasTextStyle.clone();
        const gridSize = canvas.dimensions?.size ?? 100;
        style.fontSize = Math.max(Math.round(gridSize * 0.36 * 12) / 12, 36);
        style.align = "center";

        const gridUnits = canvas.scene?.grid.units.trim() || game.system.gridUnits;
        const label = [this.radius, gridUnits].join("");
        const text = new PreciseText(label, style);
        text.position.set(this.center.x, this.center.y - this.radiusPixels);

        canvas.grid
            .getHighlightLayer(this.highlightId)
            ?.lineStyle(AuraRenderer.LINE_THICKNESS, 0x000000)
            .beginFill(0x000000, 0.5)
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
