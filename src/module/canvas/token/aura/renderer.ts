import { AuraColors, AuraData } from "@actor/types";
import { TokenPF2e } from "..";
import { EffectAreaSquare } from "../../effect-area-square";
import { ItemTrait } from "@item/data/base";
import { getAreaSquares } from "./util";
import { TokenAuraData } from "@scene/token-document/aura";

/** Visual and statial facilities for auras emanated by a token's actor */
class AuraRenderer extends PIXI.Graphics implements TokenAuraData {
    /** The token associated with this aura */
    token: TokenPF2e;

    /** The radius of the aura in feet */
    radius: number;

    /** Border and fill colors in hexadecimal */
    private colors: TokenAuraColors;

    /** Whether the aura includes the creature from which it is emanating */
    includesSelf: boolean;

    /** Traits associated with this aura: used to configure collision detection */
    traits: Set<ItemTrait>;

    /** Standard line thickness for circle shape and label markers */
    static readonly LINE_THICKNESS = 3;

    constructor(params: TokenAuraConstructorParams) {
        super();

        this.token = params.token;
        this.colors = this.#convertColors(params.colors);
        this.radius = params.radius;
        this.includesSelf = params.includesSelf ?? true;
        this.traits = new Set(params.traits);

        this.draw();
    }

    get bounds(): NormalizedRectangle {
        const { token, radiusPixels } = this;

        return new NormalizedRectangle(
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

    /** The aura radius from the center in pixels */
    get radiusPixels(): number {
        return 0.5 * this.token.w + (this.radius / (canvas.dimensions?.distance ?? 0)) * canvas.grid.size;
    }

    /** The squares covered by this aura */
    get squares(): EffectAreaSquare[] {
        return getAreaSquares(this);
    }

    /** Whether this aura should be rendered to the user */
    get shouldRender(): boolean {
        if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE || !canvas.scene?.active) return false;

        return (
            this.token.actor?.alliance === "party" ||
            !this.token.scene?.data.tokenVision ||
            this.traits.has("visual") ||
            this.traits.has("auditory") ||
            game.user.isGM
        );
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
        const highlightLayer = grid.getHighlightLayer(this.highlightId)?.clear();
        if (!(highlightLayer && this.shouldRender)) return;

        for (const square of this.squares) {
            square.highlight(highlightLayer, this.colors);
        }
        this.#drawLabel();
    }

    /**
     * Convert HTML color strings to hexadecimal values
     * Due to a bug in the core BaseGrid class, black (0) is treated as the color being excluded
     */
    #convertColors(colors: AuraColors | undefined): TokenAuraColors {
        if (colors) {
            return {
                border: foundry.utils.colorStringToHex(colors.border) || 1,
                fill: foundry.utils.colorStringToHex(colors.fill) || 1,
            };
        } else {
            const user =
                game.users.find((u) => u.character?.id === this.token.actor?.id) ??
                game.users.find((u) => u.isGM && u.active) ??
                game.user;

            return { border: 1, fill: foundry.utils.colorStringToHex(user.color ?? "#0000000") || 1 };
        }
    }

    /** Add a numeric label and marker dot indicating the emanation radius */
    #drawLabel(): void {
        const style = CONFIG.canvasTextStyle.clone();
        const gridSize = canvas.dimensions?.size ?? 100;
        style.fontSize = Math.max(Math.round(gridSize * 0.36 * 12) / 12, 36);
        style.align = "center";

        const label = [this.radius, canvas.scene?.data.gridUnits ?? game.system.data.gridUnits].join("");
        const text = new PreciseText(label, style);
        text.position.set(this.center.x, this.center.y - this.radiusPixels);

        canvas.grid
            .getHighlightLayer(this.highlightId)
            ?.lineStyle(AuraRenderer.LINE_THICKNESS, 0x000000)
            .beginFill(0x000000, 0.5)
            .drawCircle(text.position.x, text.position.y, 6)
            .addChild(text);
    }
}

interface TokenAuraColors {
    border: number;
    fill: number;
}

interface TokenAuraConstructorParams extends AuraData {
    token: TokenPF2e;
    includesSelf?: boolean;
}

export { AuraRenderer, TokenAuraColors };
