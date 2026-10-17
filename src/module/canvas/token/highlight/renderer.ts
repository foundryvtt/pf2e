import { TokenMarkRuleElement } from "@module/rules/rule-element/token-mark/rule-element.ts";
import type { TokenPF2e } from "../index.ts";
import { reduceItemName } from "@item/helpers.ts";

abstract class TokenHighlightRenderer {
    /** Layer graphics object to which highlight lines and text will be drawn */
    #container: PIXI.Container | null = null;
    get container(): PIXI.Container {
        if (!this.#container) {
            this.#container = new PIXI.Container();
            this.token.layer.addChild(this.#container);
        }
        return this.#container;
    }

    /** Origin token from which the line is extended */
    token: TokenPF2e;

    /** Color for highlight line and text */
    static color: number;

    constructor(token: TokenPF2e) {
        this.token = token;
    }

    /** Canvas must be ready with a scene in focus */
    protected get canvasReady(): boolean {
        return canvas.ready && !!canvas.scene;
    }

    /** The token must be controlled or the user's assigned character, and it must not be a preview or animating. */
    protected get tokenIsEligible(): boolean {
        return !!(
            ((this.token.controlled && this.token.isOwner) ||
                (this.token.actor && this.token.actor?.id === game.user.character?.id)) &&
            !(this.token.isPreview || this.token.isAnimating)
        );
    }

    /**
     * Check whether the scene and the token satisfy the requirements for drawing the highlight
     */
    protected get shouldRender(): boolean {
        return this.canvasReady && this.tokenIsEligible;
    }

    /** Destroys and removes layer graphics, incuding any text children */
    clear(): void {
        this.#container?.destroy({ children: true });
        this.#container = null;
    }

    /** Alias of `clear` */
    destroy(): void {
        this.clear();
    }
}

/** Visual rendering of lines from token to flanking buddies token on highlight */
class FlankingHighlightRenderer extends TokenHighlightRenderer {
    static override color = CONFIG.Canvas.dispositionColors.CONTROLLED;

    #graphics: PIXI.Graphics | null = null;
    get graphics(): PIXI.Graphics {
        if (!this.#graphics) {
            this.#graphics = new PIXI.Graphics();
            this.container.addChild(this.#graphics);
        }
        return this.#graphics;
    }

    constructor(token: TokenPF2e) {
        super(token);
    }

    /** Draw flanking highlight if conditions are met */
    draw(): void {
        this.clear();
        if (canvas.tokens.highlightObjects && game.user.targets.size && this.shouldRender) {
            for (const target of game.user.targets) {
                this.drawForTarget(target);
            }
        }
    }

    /**
     * For a given target, find flanking buddies and draw flanking highlight lines between token and buddies
     * @param target Potentially flanked target
     */
    drawForTarget(target: TokenPF2e): void {
        const buddies = this.token.buddiesFlanking(target, { ignoreFlankable: true });
        this.drawBuddyLines(buddies);
    }

    /**
     * Draw flanking highlight lines between this token and buddies
     * @param buddies Flanking buddy tokens
     */
    drawBuddyLines(buddies: TokenPF2e[]): void {
        for (const token of buddies) {
            this.drawBuddyLine(token);
        }
    }

    /**
     * Draw flanking highlight line between this token and a single buddy.
     * @param buddy Flanking buddy token
     */
    drawBuddyLine(buddy: TokenPF2e): void {
        drawLine(this.graphics, this.token.center, buddy.center, FlankingHighlightRenderer.color, false);

        // Add text indicator
        drawLabel(
            this.graphics,
            this.token.center,
            buddy.center,
            FlankingHighlightRenderer.color,
            _loc("PF2E.Token.Flanking"),
        );
    }

    override clear(): void {
        super.clear();
        this.#graphics = null;
    }
}

/** Visual rendering of lines from token to flanking buddies token on highlight */
class TokenMarkHighlightRenderer extends TokenHighlightRenderer {
    static override color: number = CONFIG.Canvas.dispositionColors.FRIENDLY;
    static onsetTimeMS = 300;
    static fadeInTimeMs = 150;
    static fadeOutTimeMs = 300;

    // Highlight is currently displayed for the item with this id
    #effectId: string | null = null;
    #animations: Set<string> | null = null;

    // keep track of the already running animations
    get animations(): Set<string> {
        return (this.#animations ??= new Set<string>());
    }

    /** Draw the highlight for the parameter effect id, remove the highlight if nullish */
    draw(id: string | null): void {
        if (!id) {
            this.#effectId = null;
            return;
        }
        if (!this.shouldRender) return;

        // Check if the item with this id is on the token actor, it's an effect, and has TokenMark rules
        const item = this.token.actor?.items.get(id);
        if (!item?.isOfType("effect") || !item?.rules.some((e) => e instanceof TokenMarkRuleElement)) return;
        this.#effectId = id;

        // If this effect's animation is already running, no need to do anything anymore
        // The animation itself handles fadeout
        if (this.animations.has(id)) return;

        const tokenMarks = item.rules.filter((r) => r instanceof TokenMarkRuleElement);
        // The target must be visible to the user, and exist on the current scene
        const targets = tokenMarks
            .map((r) => ({
                token: canvas.tokens.placeables.find((t) => t.isVisible && t.document.uuid === r.uuid),
                label: reduceItemName(r.label),
            }))
            .filter((t) => t.token);
        if (targets.length === 0) return;

        const g = new PIXI.Graphics();
        for (const { token, label } of targets) {
            if (!token) continue;
            this.drawLines(g, token, label);
        }

        // Add animation to gradually change container's alpha
        // Can't change container's or graphics' alpha property as that directly translates to constituent lines and polygons, making the overlaps extremely visible
        const alpha = new PIXI.AlphaFilter(0);
        g.filters = [alpha];

        this.animations.add(id);
        this.container.addChild(g);

        // Can't use foundry.canvas.animation.CanvasAnimation.animate as it runs from a current state to a predetermined end state in a finite animation
        // Increase alpha while currently hovered item's id is the same as the highighted item id, otherwise lower it and disable both the animation and the graphic object at 0
        const f = () => {
            if (this.#effectId === item.id) {
                alpha.alpha = Math.min(
                    1,
                    alpha.alpha + canvas.app.ticker.deltaMS / TokenMarkHighlightRenderer.fadeInTimeMs,
                );
            } else {
                alpha.alpha = Math.max(
                    0,
                    alpha.alpha - canvas.app.ticker.deltaMS / TokenMarkHighlightRenderer.fadeOutTimeMs,
                );
                if (alpha.alpha <= 0) {
                    canvas.app.ticker.remove(f, this);
                    this.animations.delete(id);
                    this.container.removeChild(g);
                }
            }
        };
        canvas.app.ticker.add(f, this);
    }

    /**
     * Draw TokenMark highight line and label
     */
    drawLines(g: PIXI.Graphics, target: TokenPF2e, label: string): void {
        drawLine(g, this.token.center, target.center, TokenMarkHighlightRenderer.color, true);
        drawLabel(g, this.token.center, target.center, TokenMarkHighlightRenderer.color, label);
    }

    override clear(): void {
        super.clear();
        this.#effectId = null;
    }
}

function drawLine(graphics: PIXI.Graphics, pointA: PIXI.Point, pointB: PIXI.Point, color: number, ordered: boolean) {
    const t = CONFIG.Canvas.objectBorderThickness;
    const o = Math.round(t * 1.5);
    const c = Math.round(t * 2);

    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;

    const l = Math.sqrt(dx ** 2 + dy ** 2);
    const cos = dx / l;
    const sin = dy / l;

    const lineEnd = ordered ? new PIXI.Point(pointB.x - cos * c, pointB.y - sin * c) : pointB;

    // Draw outline
    // Line
    graphics.lineStyle(o, 0x000000).moveTo(pointA.x, pointA.y).lineTo(lineEnd.x, lineEnd.y);

    // Shapes
    // Origin circle
    graphics
        .beginFill(0x000000)
        .lineStyle(t / 2, 0x000000)
        .drawCircle(pointA.x, pointA.y, c);
    if (ordered) {
        // Arrowhead
        drawArrowhead(graphics, pointB, Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x), c * 2);
    } else {
        // Circle
        graphics.drawCircle(pointB.x, pointB.y, c);
    }

    // Draw foreground
    // Line
    graphics.lineStyle(t, color).moveTo(pointA.x, pointA.y).lineTo(lineEnd.x, lineEnd.y);

    // Shapes
    // Origin circle
    graphics.beginFill(color).lineStyle(0, 0x000000, 0).drawCircle(pointA.x, pointA.y, c);
    if (ordered) {
        // Arrowhead
        drawArrowhead(graphics, pointB, Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x), c * 2);
    } else {
        // Circle
        graphics.drawCircle(pointB.x, pointB.y, c);
    }
}

function drawArrowhead(graphics: PIXI.Graphics, { x, y }: PIXI.Point, angle: number, length: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotation = new PIXI.Matrix(cos, sin, -sin, cos, x, y);
    const l = length;
    const points = [
        { x: 0, y: 0 },
        { x: -l, y: -l / 2 },
        { x: -l, y: l / 2 },
    ];
    points.forEach((p) => rotation.apply(p, p));

    graphics.drawPolygon(points);
}

function drawLabel(
    graphics: PIXI.Graphics,
    pointA: PIXI.Point,
    pointB: PIXI.Point,
    color: number,
    label: string,
): void {
    // Midpoint coordinate between tokens
    const midX = Math.round((pointA.x + pointB.x) / 2);
    const midY = Math.round((pointA.y + pointB.y) / 2);

    // Vector between tokens
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;

    // Line angle in fraction of revolutions [-0.5, 0.5]
    const rev = Math.atan2(dy, dx) / PIXI.PI_2;
    // Write the text above the line (if vertical - write from source to target)
    const perpRev = dy === 0 ? 0.75 : dx >= 0 ? rev - 0.25 : rev + 0.25;

    const offsetPixels = 20.0;
    const perpX = midX + Math.cos(perpRev * PIXI.PI_2) * offsetPixels;
    const perpY = midY + Math.sin(perpRev * PIXI.PI_2) * offsetPixels;

    // Styling
    const style = CONFIG.canvasTextStyle.clone();
    const dimensions = canvas.dimensions;
    style.fontSize = dimensions.size >= 200 ? 28 : dimensions.size < 50 ? 20 : 24;
    style.fill = color;
    style.stroke = 0x000000;

    const text = new fc.containers.PreciseText(label, style);
    text.anchor.set(0.5, 0.5);

    // Text just needs to be rotated additional 90 degrees clockwise
    text.rotation = (perpRev + 0.25) * PIXI.PI_2;

    text.position.set(perpX, perpY);
    graphics.addChild(text);
}

export { FlankingHighlightRenderer, TokenMarkHighlightRenderer };
