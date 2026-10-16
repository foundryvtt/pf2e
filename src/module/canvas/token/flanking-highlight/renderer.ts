import { TokenMarkRuleElement } from "@module/rules/rule-element/token-mark/rule-element.ts";
import type { TokenPF2e } from "../index.ts";
import { reduceItemName } from "@item/helpers.ts";
import { EffectPF2e } from "@item";

abstract class TokenHighlightRenderer {
    /** Layer graphics object to which flanking highlight lines and text will be drawn */
    #layer: PIXI.Graphics | null = null;

    /** Origin token from which the line is extended */
    token: TokenPF2e;

    /** Color for highlight line and text */
    static color: number;

    constructor(token: TokenPF2e) {
        this.token = token;
    }

    protected get canvasReady(): boolean {
        return canvas.ready && !!canvas.scene;
    }

    /** Get existing layer graphics object or create one if one does not exist */
    get layer(): PIXI.Graphics {
        return this.#layer ?? this.#addLayer();
    }

    /** Creates layer graphics object */
    #addLayer(): PIXI.Graphics {
        this.#layer = new PIXI.Graphics();
        return this.token.layer.addChild(this.#layer);
    }

    /** Destroys and removes layer graphics, incuding any text children */
    clear(): void {
        this.#layer?.destroy({ children: true });
        this.#layer = null;
    }

    /** Alias of `clear` */
    destroy(): void {
        this.clear();
    }
}

/** Visual rendering of lines from token to flanking buddies token on highlight */
class FlankingHighlightRenderer extends TokenHighlightRenderer {
    static override color = CONFIG.Canvas.dispositionColors.CONTROLLED;

    constructor(token: TokenPF2e) {
        super(token);
    }

    /**
     * Whether the flank highlight should be rendered to the user:
     * Canvas must be ready with a scene in focus, the user must own or have selected this token,
     * and the token must not be a preview or animating.
     */
    get #shouldRender(): boolean {
        return this.canvasReady && this.#tokenIsEligible;
    }

    /** The token must be controlled or the user's assigned character, and it must not be a preview or animating. */
    get #tokenIsEligible(): boolean {
        return !!(
            ((this.token.controlled && this.token.isOwner) ||
                (this.token.actor && this.token.actor?.id === game.user.character?.id)) &&
            !(this.token.isPreview || this.token.isAnimating)
        );
    }

    /** Draw flanking highlight if conditions are met */
    draw(): void {
        this.clear();
        if (canvas.tokens.highlightObjects && game.user.targets.size && this.#shouldRender) {
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
        drawLine(this.layer, this.token.center, buddy.center, FlankingHighlightRenderer.color, false);

        // Add text indicator
        drawLabel(
            this.layer,
            this.token.center,
            buddy.center,
            FlankingHighlightRenderer.color,
            _loc("PF2E.Token.Flanking"),
        );
    }
}

/** Visual rendering of lines from token to flanking buddies token on highlight */
class TokenMarkHighlightRenderer extends TokenHighlightRenderer {
    static override color: number = CONFIG.Canvas.dispositionColors.FRIENDLY;

    effect: EffectPF2e | null = null;
    graphics: Map<string, PIXI.Graphics> | null = null;
    container: PIXI.Container | null = null;

    /**
     * Whether the flank highlight should be rendered to the user:
     * Canvas must be ready with a scene in focus, the user must own or have selected this token,
     * and the token must not be a preview or animating.
     */
    get #shouldRender(): boolean {
        return this.canvasReady && this.#tokenIsEligible;
    }

    /** The token must be controlled or the user's assigned character, and it must not be a preview or animating. */
    get #tokenIsEligible(): boolean {
        return !!(
            ((this.token.controlled && this.token.isOwner) ||
                (this.token.actor && this.token.actor?.id === game.user.character?.id)) &&
            !(this.token.isPreview || this.token.isAnimating)
        );
    }

    /** Draw flanking highlight if conditions are met */
    draw(): void {
        this.clear();
        const tokenMarks = this.effect?.rules.filter((r) => r instanceof TokenMarkRuleElement);
        if (!tokenMarks) return;
        if (canvas.tokens.highlightObjects && this.#shouldRender) {
            for (const target of canvas.tokens.placeables.filter((t) => t.isVisible)) {
                this.drawForTarget(
                    target,
                    tokenMarks.filter((r) => r.uuid === target.document.uuid),
                );
            }
        }
    }

    /**
     * For a given target, find flanking buddies and draw flanking highlight lines between token and buddies
     * @param target Potentially flanked target
     */
    drawForTarget(target: TokenPF2e, tokenMarks: TokenMarkRuleElement[]): void {
        if (tokenMarks.length === 0) return;
        this.drawLines(
            target,
            tokenMarks.map((r) => reduceItemName(r.label)),
        );
    }

    /**
     * Draw flanking highlight line between this token and a single buddy.
     * @param buddy Flanking buddy token
     */
    drawLines(target: TokenPF2e, labels: string[]): void {
        drawLine(this.layer, this.token.center, target.center, TokenMarkHighlightRenderer.color, true);
        drawLabel(this.layer, this.token.center, target.center, TokenMarkHighlightRenderer.color, labels.join());
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

    // Draw backround
    // line
    graphics.lineStyle(o, 0x000000).moveTo(pointA.x, pointA.y).lineTo(lineEnd.x, lineEnd.y);

    // shapes
    // start circle
    graphics
        .beginFill(0x000000)
        .lineStyle(t / 2, 0x000000)
        .drawCircle(pointA.x, pointA.y, c);
    if (ordered) {
        // arrowhead
        drawArrowhead(graphics, pointB, Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x), c * 2);
    } else {
        // circle
        graphics.drawCircle(pointB.x, pointB.y, c);
    }

    // Draw foreground
    // line
    graphics.lineStyle(t, color).moveTo(pointA.x, pointA.y).lineTo(lineEnd.x, lineEnd.y);

    // shapes
    // start circle
    graphics.beginFill(color).lineStyle(0, 0x000000, 0).drawCircle(pointA.x, pointA.y, c);
    if (ordered) {
        // arrowhead
        drawArrowhead(graphics, pointB, Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x), c * 2);
    } else {
        // circle
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

function drawLabel(graphics: PIXI.Graphics, pointA: PIXI.Point, buddy: PIXI.Point, color: number, label: string): void {
    // Midpoint coordinate between tokens
    const mid_x = Math.round((pointA.x + buddy.x) / 2);
    const mid_y = Math.round((pointA.y + buddy.y) / 2);

    // Vector between tokens
    const vect_x = buddy.x - pointA.x;
    const vect_y = buddy.y - pointA.y;

    // find the perpendicular vector "above" the line
    const perp_vect_x = vect_x <= -vect_x ? -vect_y : vect_y;
    const perp_vect_y = vect_x <= -vect_x ? vect_x : -vect_x;

    // Midpoint coordinate offset perpendicularly above line
    const offsetPixels = 20.0;
    const offsetScale = offsetPixels / Math.sqrt(perp_vect_x ** 2 + perp_vect_y ** 2);
    const perp_x = mid_x + Math.round(perp_vect_x * offsetScale);
    const perp_y = mid_y + Math.round(perp_vect_y * offsetScale);

    // Styling
    const style = CONFIG.canvasTextStyle.clone();
    const dimensions = canvas.dimensions;
    style.fontSize = dimensions.size >= 200 ? 28 : dimensions.size < 50 ? 20 : 24;
    style.fill = color;
    style.stroke = 0x000000;

    const text = new fc.containers.PreciseText(label, style);
    text.anchor.set(0.5, 0.5);

    // Rotate text to match line, ensuring it is not upside-down
    let rotation = Math.atan2(vect_y, vect_x);
    if (rotation > Math.PI / 2) {
        rotation = rotation - Math.PI;
    } else if (rotation < -Math.PI / 2) {
        rotation = rotation + Math.PI;
    }
    text.rotation = rotation;

    text.position.set(perp_x, perp_y);
    graphics.addChild(text);
}

export { FlankingHighlightRenderer, TokenMarkHighlightRenderer };
