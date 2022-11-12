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
     * The scene must be active, have an active combat, or a GM must be the only user logged in.
     */
    get shouldRender(): boolean {
        if (canvas.scene?.grid.type !== CONST.GRID_TYPES.SQUARE || !canvas.scene.tokenVision) {
            return false;
        }

        const soleUserIsGM = game.user.isGM && game.users.filter((u) => u.active).length === 1;
        const sceneOfFocus = game.combats.active?.combatant?.token?.scene ?? game.scenes.active ?? null;
        const sceneIsInFocus = canvas.scene === sceneOfFocus;

        return (
            (sceneIsInFocus || soleUserIsGM) &&
            (this.token.actor?.alliance === "party" ||
                this.traits.has("visual") ||
                this.traits.has("auditory") ||
                game.user.isGM)
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
        const userColor = Number(foundry.utils.Color.fromString(user.color ?? "#0000000")) || 0;

        if (colors) {
            return {
                border: Number(foundry.utils.Color.fromString(colors.border)) || 0,
                fill: Number(foundry.utils.Color.fromString(colors.fill)) || userColor,
            };
        } else {
            return { border: 0, fill: userColor };
        }
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
