import { TokenPF2e } from "../index.ts";
import { getSelectedOrOwnActors } from "@util/token-actor-utils.ts";

/** Visual rendering of lines from token to flanking buddies token on highlight */
class FlankingHighlightRenderer extends PIXI.Graphics {
    /** The token from which the line is extended */
    token: TokenPF2e;

    /** Color for highlight line */
    lineColor: number;

    constructor(token: TokenPF2e) {
        super();

        this.token = token;
        this.lineColor = CONFIG.Canvas.dispositionColors.CONTROLLED;
    }

    /**
     * Whether the flank highlight should be rendered to the user:
     * Canvas must be ready with a scene in focus, the user must own or have selected this token,
     * and the token must not be a preview or animating.
     */
    get shouldRender(): boolean {
        return canvas.ready && !!canvas.scene?.isInFocus && this.tokenActorIsSelectedOrOwn && this.tokenIsReady;
    }

    /**
     * To be valid, this token must be selected or belong to player
     */
    get tokenActorIsSelectedOrOwn(): boolean {
        const actors = getSelectedOrOwnActors();
        return !!actors.length && !!this.token.actor && actors[0].id === this.token.actor.id;
    }

    /**
     * To be valid, this token must not be preview or be animating
     */
    get tokenIsReady(): boolean {
        return !this.token.isPreview && !this.token.isAnimating;
    }

    /**
     * Initial draw behavior for flanking highlight, must be called before subsequent refresh calls
     */
    draw(): void {
        if (canvas.tokens.highlightObjects && game.user.targets.size && this.shouldRender) {
            if (!this.parent) this.token.layer.addChild(this);
            game.user.targets.forEach((target) => this.drawForTarget(target));
        } else {
            if (this.geometry.drawCalls.length > 0) this.clear();
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
        buddies.forEach((b) => this.drawBuddyLine(b));
    }

    /**
     * Draw flanking highlight line between this token and a single buddy.
     * @param buddy Flanking buddy token
     */
    drawBuddyLine(buddy: TokenPF2e): void {
        const t = CONFIG.Canvas.objectBorderThickness;
        const o = Math.round(t * 1.5);
        const c = Math.round(t * 2);

        // Draw line
        this.lineStyle(o, 0x000000, 0.5)
            .moveTo(this.token.center.x, this.token.center.y)
            .lineTo(buddy.center.x, buddy.center.y);
        this.lineStyle(t, this.lineColor, 0.5)
            .moveTo(this.token.center.x, this.token.center.y)
            .lineTo(buddy.center.x, buddy.center.y);

        // Draw circles on tokens
        this.beginFill(this.lineColor).lineStyle(1, 0x000000).drawCircle(this.token.center.x, this.token.center.y, c);
        this.beginFill(this.lineColor).lineStyle(1, 0x000000).drawCircle(buddy.center.x, buddy.center.y, c);

        // Add text indicator
        this.drawLabel(buddy);
    }

    /**
     * Draw a flanking text label above flanking highlight line
     * @param buddy Flanking buddy token
     */
    drawLabel(buddy: TokenPF2e): void {
        // Midpoint coordinate between tokens
        const mid_x = Math.round((this.token.center.x + buddy.center.x) / 2);
        const mid_y = Math.round((this.token.center.y + buddy.center.y) / 2);

        // Vector between tokens
        const vect_x = buddy.center.x - this.token.center.x;
        const vect_y = buddy.center.y - this.token.center.y;

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
        style.fontSize = 24;
        if (canvas.dimensions?.size && canvas.dimensions.size >= 200) style.fontSize = 28;
        else if (canvas.dimensions?.size && canvas.dimensions.size < 50) style.fontSize = 20;
        style.fill = this.lineColor;
        style.stroke = 0x000000;

        const text = new PreciseText("Flanking", style);
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
        this.addChild(text);
    }

    /**
     * Clear graphics while ensuring that child text objects get destroyed to avoid memory leaks
     */
    override clear(): this {
        const children = [...this.children];
        for (const child of children) {
            if (!child.destroyed) child.destroy();
        }
        return super.clear();
    }

    /**
     * Destroy graphics while ensuring that child text objects get destroyed to avoid memory leaks
     */
    override destroy(): void {
        const children = [...this.children];
        for (const child of children) {
            if (!child.destroyed) child.destroy();
        }
        return super.destroy();
    }
}

export { FlankingHighlightRenderer };
