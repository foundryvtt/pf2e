import { AuraColors, AuraData } from "@actor/types";
import { measureDistanceRect } from "../helpers";
import { TokenPF2e } from ".";
import { EffectAreaSquare } from "../effect-area-square";
import { ItemTrait } from "@item/data/base";

/** Visual and statial facilities for auras emanated by a token's actor */
class TokenAura extends PIXI.Graphics {
    /** The token associated with this aura */
    token: TokenPF2e;

    /** The radius of the aura in feet */
    radius: number;

    /** Border and fill colors in hexadecimal */
    colors: TokenAuraColors;

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

    /** The center of an aura is the center of its originating token */
    get center(): Point {
        return this.token.center;
    }

    /** ID of `GridHighlight` container for this aura's token */
    get highlightId(): string {
        return this.token.highlightId;
    }

    /** The aura radius in pixels */
    get radiusPixels(): number {
        return 0.5 * this.token.w + (this.radius / (canvas.dimensions?.distance ?? 0)) * canvas.grid.size;
    }

    /** The squares covered by this aura */
    get squares(): EffectAreaSquare[] {
        if (!canvas.dimensions) return [];
        const squareWidth = canvas.dimensions.size;
        const { radiusPixels } = this;
        const bounds = new NormalizedRectangle(
            this.token.bounds.x - (radiusPixels - this.token.bounds.width / 2),
            this.token.bounds.y - (radiusPixels - this.token.bounds.width / 2),
            radiusPixels * 2,
            radiusPixels * 2
        );
        const rowCount = Math.ceil(bounds.width / squareWidth);
        const emptyVector = Array<null>(rowCount - 1).fill(null);

        const genColumn = (square: EffectAreaSquare): EffectAreaSquare[] => {
            return emptyVector.reduce(
                (colSquares) => {
                    const squareAbove = colSquares.at(-1)!;
                    const squareBelow = new EffectAreaSquare(
                        square.x,
                        squareAbove.y + squareWidth,
                        squareWidth,
                        squareWidth
                    );
                    colSquares.push(squareBelow);
                    return colSquares;
                },
                [square]
            );
        };

        const topLeftSquare = new EffectAreaSquare(bounds.x, bounds.y, squareWidth, squareWidth);
        const collisionType =
            this.traits.has("visual") && !this.traits.has("auditory")
                ? "sight"
                : this.traits.has("auditory") && !this.traits.has("visual")
                ? "sound"
                : "movement";

        return emptyVector
            .reduce(
                (squares: EffectAreaSquare[][]) => {
                    const lastSquare = squares.at(-1)!.at(-1)!;
                    const column = genColumn(
                        new EffectAreaSquare(lastSquare.x + squareWidth, topLeftSquare.y, squareWidth, squareWidth)
                    );
                    squares.push(column);
                    return squares;
                },
                [genColumn(topLeftSquare)]
            )
            .flat()
            .filter((s) => measureDistanceRect(this.token.bounds, s) <= this.radius)
            .map((square) => {
                const ray = new Ray(this.center, square.center);
                square.active = !canvas.walls.checkCollision(ray, { type: collisionType });
                return square;
            });
    }

    /** Draw the aura's circular emanation */
    draw(): void {
        this.visible = false;
        if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) return;

        this.beginFill(this.colors.fill, 0)
            .lineStyle(TokenAura.LINE_THICKNESS, this.colors.border, 0.75)
            .drawCircle(this.token.w / 2, this.token.h / 2, this.radiusPixels)
            .endFill();

        this.visible = true;
    }

    /** Highlight the affected grid squares of this aura and indicate the radius */
    highlight(): void {
        const { dimensions, grid } = canvas;
        if (!(dimensions && grid.type === CONST.GRID_TYPES.SQUARE)) return;
        const highlightLayer = grid.getHighlightLayer(this.highlightId)?.clear();
        if (!highlightLayer) return;

        for (const square of this.squares) {
            square.highlight(highlightLayer, this.colors);
        }
        this.#drawLabel();
    }

    /** Does this aura overlap with (at least part of) a token? */
    containsToken(token: TokenPF2e): boolean {
        // 1. If the token is the one emitting the aura, return early according to whether it `includesSelf`
        if (token === this.token) return this.includesSelf;

        // 2. If this aura's circle doesn't intersect with the token's space, return false early
        const sides: [Point, Point][] = [
            // Top!
            [token, { x: token.x + token.w, y: token.y }],
            // Right!
            [
                { x: token.x + token.w, y: token.y },
                { x: token.x + token.w, y: token.y + token.h },
            ],
            // Bottom!
            [
                { x: token.x + token.w, y: token.y + token.h },
                { x: token.x, y: token.y + token.h },
            ],
            // Left!
            [{ x: token.x, y: token.y + token.h }, token],
        ];
        const intersectors = sides.filter(
            (s) => !foundry.utils.lineCircleIntersection(...s, this.center, this.radiusPixels, 0).outside
        );
        if (intersectors.length === 0) return false;

        // 3. Check whether any aura square intersects the token's space
        return this.squares.some((s) => s.active && measureDistanceRect(s, token.bounds) === 0);
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
            ?.lineStyle(TokenAura.LINE_THICKNESS, 0x000000)
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

export { TokenAura, TokenAuraColors };
