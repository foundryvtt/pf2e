import { ANIMAL_COMPANION_SOURCE_ID } from "@actor/values";
import { EffectPF2e } from "@item";
import { TokenDocumentPF2e } from "@module/scene";
import { pick } from "@util";
import { CanvasPF2e, measureDistanceRect, TokenLayerPF2e } from "..";
import { HearingSource } from "../perception/hearing-source";
import { AuraRenderers } from "./aura";

class TokenPF2e extends Token<TokenDocumentPF2e> {
    /** Visual representation and proximity-detection facilities for auras */
    readonly auras: AuraRenderers;

    /** The token's line hearing source */
    hearing: HearingSource<this>;

    constructor(document: TokenDocumentPF2e) {
        super(document);

        this.hearing = new HearingSource(this);
        this.auras = new AuraRenderers(this);
        Object.defineProperty(this, "auras", { configurable: false, writable: false }); // It's ours, Kim!
    }

    /** Guarantee boolean return */
    override get isVisible(): boolean {
        return super.isVisible ?? false;
    }

    /** Is this token currently animating? */
    get isAnimating(): boolean {
        return !!this._animation;
    }

    /** Is this token emitting light with a negative value */
    get emitsDarkness(): boolean {
        return this.document.emitsDarkness;
    }

    /** Is rules-based vision enabled, and does this token's actor have low-light vision (inclusive of darkvision)? */
    get hasLowLightVision(): boolean {
        return this.document.hasLowLightVision;
    }

    /** Is rules-based vision enabled, and does this token's actor have darkvision vision? */
    get hasDarkvision(): boolean {
        return this.document.hasDarkvision;
    }

    /** Is this token's dimensions linked to its actor's size category? */
    get linkToActorSize(): boolean {
        return this.document.linkToActorSize;
    }

    /** The ID of the highlight layer for this token */
    get highlightId(): string {
        return `Token.${this.id}`;
    }

    isAdjacentTo(token: TokenPF2e): boolean {
        return this.distanceTo(token) === 5;
    }

    /**
     * Determine whether this token can flank another—given that they have a flanking buddy on the opposite side
     * @param flankee       The potentially flanked token
     * @param context.reach An optional reach distance specific to this measurement */
    canFlank(flankee: TokenPF2e, context: { reach?: number } = {}): boolean {
        if (this === flankee || !game.settings.get("pf2e", "automation.flankingDetection")) {
            return false;
        }

        if (!(this.actor?.attributes.flanking.canFlank && flankee.actor?.attributes.flanking.flankable)) {
            return false;
        }

        // Only PCs and NPCs can flank
        if (!this.actor.isOfType("character", "npc")) return false;
        // Only creatures can be flanked
        if (!flankee.actor.isOfType("creature")) return false;

        // Allies don't flank each other
        if (this.actor.isAllyOf(flankee.actor)) return false;

        const reach = context.reach ?? this.actor.getReach({ action: "attack" });

        return this.actor.canAttack && reach >= this.distanceTo(flankee, { reach });
    }

    /** Determine whether this token is in fact flanking another */
    isFlanking(flankee: TokenPF2e, { reach }: { reach?: number } = {}): boolean {
        if (!(this.actor && this.canFlank(flankee, { reach }))) return false;

        // Return true if a flanking buddy is found
        const { lineSegmentIntersects } = foundry.utils;
        const onOppositeSides = (flankerA: TokenPF2e, flankerB: TokenPF2e, flankee: TokenPF2e): boolean => {
            const [centerA, centerB] = [flankerA.center, flankerB.center];
            const { bounds } = flankee;

            const left = new Ray({ x: bounds.left, y: bounds.top }, { x: bounds.left, y: bounds.bottom });
            const right = new Ray({ x: bounds.right, y: bounds.top }, { x: bounds.right, y: bounds.bottom });
            const top = new Ray({ x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top });
            const bottom = new Ray({ x: bounds.left, y: bounds.bottom }, { x: bounds.right, y: bounds.bottom });
            const intersectsSide = (side: Ray): boolean => lineSegmentIntersects(centerA, centerB, side.A, side.B);

            return (intersectsSide(left) && intersectsSide(right)) || (intersectsSide(top) && intersectsSide(bottom));
        };

        const { flanking } = this.actor.attributes;
        const flankingBuddies = canvas.tokens.placeables.filter((t) => t !== this && t.canFlank(flankee));
        if (flankingBuddies.length === 0) return false;

        // The actual "Gang Up" rule or similar
        const gangingUp = flanking.canGangUp.some((g) => typeof g === "number" && g <= flankingBuddies.length);
        if (gangingUp) return true;

        // The Side By Side feat with tie-in to the PF2e Animal Companion Compendia module
        const sideBySide =
            this.isAdjacentTo(flankee) &&
            flanking.canGangUp.includes("animal-companion") &&
            flankingBuddies.some(
                (b) =>
                    b.actor?.isOfType("character") &&
                    b.actor.class?.sourceId === ANIMAL_COMPANION_SOURCE_ID &&
                    game.modules.get("pf2e-animal-companions")?.active &&
                    b.isAdjacentTo(flankee)
            );
        if (sideBySide) return true;

        // Find a flanking buddy opposite this token
        return flankingBuddies.some((b) => onOppositeSides(this, b, flankee));
    }

    /** Overrides _drawBar(k) to also draw pf2e variants of normal resource bars (such as temp health) */
    protected override _drawBar(number: number, bar: PIXI.Graphics, data: TokenResourceData): void {
        if (!canvas.dimensions) return;

        const actor = this.document.actor;
        const isHealth = data.attribute === "attributes.hp" && actor?.attributes.hp;

        if (!isHealth) {
            return super._drawBar(number, bar, data);
        }

        const { value, max, temp } = actor.attributes.hp;
        const healthPercent = Math.clamped(value, 0, max) / max;

        // Compute the color based on health percentage, this formula is the one core foundry uses
        const black = 0x000000;
        const color = number
            ? PIXI.utils.rgb2hex([0.5 * healthPercent, 0.7 * healthPercent, 0.5 + healthPercent / 2])
            : PIXI.utils.rgb2hex([1 - healthPercent / 2, healthPercent, 0]);

        // Bar size logic stolen from core
        let h = Math.max(canvas.dimensions.size / 12, 8);
        const bs = Math.clamped(h / 8, 1, 2);
        if (this.document.height >= 2) h *= 1.6; // Enlarge the bar for large tokens

        const numBars = temp > 0 ? 2 : 1;
        const barHeight = h / numBars;

        bar.clear();

        // Draw background
        bar.lineStyle(0).beginFill(black, 0.5).drawRoundedRect(0, 0, this.w, h, 3);

        // Set border style for temp hp and health bar
        bar.lineStyle(bs / 2, black, 1.0);

        // Draw temp hp
        if (temp > 0) {
            const tempColor = 0x66ccff;
            const tempPercent = Math.clamped(temp, 0, max) / max;
            const tempWidth = tempPercent * this.w - 2 * (bs - 1);
            bar.beginFill(tempColor, 1.0).drawRoundedRect(0, 0, tempWidth, barHeight, 2);
        }

        // Draw the health bar
        const healthBarY = (numBars - 1) * barHeight;
        bar.beginFill(color, 1.0).drawRoundedRect(0, healthBarY, healthPercent * this.w, barHeight, 2);

        // Draw the container (outermost border)
        bar.beginFill(black, 0).lineStyle(bs, black, 1.0).drawRoundedRect(0, 0, this.w, h, 3);

        // Set position
        bar.position.set(0, number === 0 ? this.h - h : 0);
    }

    /** Draw auras along with effect icons */
    override async drawEffects(): Promise<void> {
        await super.drawEffects();
        await this._animation;
        this.auras.draw();
    }

    emitHoverIn() {
        this.emit("mouseover", { data: { object: this } });
    }

    emitHoverOut() {
        this.emit("mouseout", { data: { object: this } });
    }

    /** If Party Vision is enabled, make all player-owned actors count as vision sources for non-GM users */
    protected override _isVisionSource(): boolean {
        const partyVisionEnabled =
            !!this.actor?.hasPlayerOwner && !game.user.isGM && game.settings.get("pf2e", "metagame_partyVision");
        return partyVisionEnabled || super._isVisionSource();
    }

    /** Include actor overrides in the clone if it is a preview */
    override clone(): this {
        const clone = super.clone();
        if (clone.isPreview) {
            clone.document.height = this.document.height;
            clone.document.width = this.document.width;
            clone.document.texture.scaleX = this.document.texture.scaleX;
            clone.document.texture.scaleY = this.document.texture.scaleY;
            clone.document.texture.src = this.document.texture.src;
        }

        return clone;
    }

    /** Emit floaty text from this tokens */
    async showFloatyText(params: ShowFloatyEffectParams): Promise<void> {
        if (!this.isVisible) return;

        /**
         * If the floaty text is generated by an effect being created/deleted
         * We do not display it if the effect is unidentified
         */
        if (!game.user.isGM && typeof params !== "number") {
            const [_, document] = Object.entries(params)[0];
            if (document instanceof EffectPF2e && document.system.unidentified) return;
        }

        const scrollingTextArgs = ((): Parameters<CanvasPF2e["interface"]["createScrollingText"]> | null => {
            if (typeof params === "number") {
                const quantity = params;
                const maxHP = this.actor?.hitPoints?.max;
                if (!(quantity && typeof maxHP === "number")) return null;

                const percent = Math.clamped(Math.abs(quantity) / maxHP, 0, 1);
                const textColors = {
                    damage: 16711680, // reddish
                    healing: 65280, // greenish
                };
                return [
                    this.center,
                    params.signedString(),
                    {
                        anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
                        jitter: 0.25,
                        fill: textColors[quantity < 0 ? "damage" : "healing"],
                        fontSize: 16 + 32 * percent, // Range between [16, 48]
                        stroke: 0x000000,
                        strokeThickness: 4,
                    },
                ];
            } else {
                const [change, details] = Object.entries(params)[0];
                const isAdded = change === "create";
                const sign = isAdded ? "+ " : "- ";
                const appendedNumber = details.value ? ` ${details.value}` : "";
                const content = `${sign}${details.name}${appendedNumber}`;
                const anchorDirection = isAdded ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM;
                const textStyle = pick(this._getTextStyle(), ["fill", "fontSize", "stroke", "strokeThickness"]);

                return [
                    this.center,
                    content,
                    {
                        ...textStyle,
                        anchor: anchorDirection,
                        direction: anchorDirection,
                        jitter: 0.25,
                    },
                ];
            }
        })();
        if (!scrollingTextArgs) return;

        await this._animation;
        await canvas.interface?.createScrollingText(...scrollingTextArgs);
    }

    /**
     * Measure the distance between this token and another object, in grid distance. We measure between the
     * centre of squares, and if either covers more than one square, we want the minimum distance between
     * any two of the squares.
     */
    distanceTo(target: TokenPF2e, { reach = null }: { reach?: number | null } = {}): number {
        if (!canvas.dimensions) return NaN;

        if (this === target) return 0;

        if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) {
            return canvas.grid.measureDistance(this.position, target.position);
        }

        const distance = {
            xy: measureDistanceRect(this.bounds, target.bounds, { reach }),
            xz: 0,
            yz: 0,
        };

        const selfElevation = this.document.elevation;
        const targetElevation = target.document.elevation;
        if (selfElevation === targetElevation || !this.actor || !target.actor) return distance.xy;

        const [selfDimensions, targetDimensions] = [this.actor.dimensions, target.actor.dimensions];
        if (!(selfDimensions && targetDimensions)) return distance.xy;

        const gridSize = canvas.dimensions.size;
        const gridDistance = canvas.dimensions.distance;

        const xzPlane = {
            self: new PIXI.Rectangle(
                this.bounds.x,
                Math.floor((selfElevation / gridDistance) * gridSize),
                this.bounds.width,
                Math.floor((selfDimensions.height / gridDistance) * gridSize)
            ),
            target: new PIXI.Rectangle(
                target.bounds.x,
                Math.floor((targetElevation / gridDistance) * gridSize),
                target.bounds.width,
                Math.floor((targetDimensions.height / gridDistance) * gridSize)
            ),
        };
        distance.xz = measureDistanceRect(xzPlane.self, xzPlane.target, { reach });

        const yzPlane = {
            self: new PIXI.Rectangle(
                this.bounds.y,
                Math.floor((selfElevation / gridDistance) * gridSize),
                this.bounds.height,
                Math.floor((selfDimensions.height / gridDistance) * gridSize)
            ),
            target: new PIXI.Rectangle(
                target.bounds.y,
                Math.floor((targetElevation / gridDistance) * gridSize),
                target.bounds.height,
                Math.floor((targetDimensions.height / gridDistance) * gridSize)
            ),
        };
        distance.yz = measureDistanceRect(yzPlane.self, yzPlane.target, { reach });

        const hypotenuse = Math.sqrt(Math.pow(distance.xy, 2) + Math.pow(Math.max(distance.xz, distance.yz), 2));

        return Math.floor(hypotenuse / gridDistance) * gridDistance;
    }

    /** Add a callback for when a movement animation finishes */
    override async animate(updateData: Record<string, unknown>, options?: TokenAnimationOptions<this>): Promise<void> {
        await super.animate(updateData, options);
        if (!this._animation) this.onFinishAnimation();
    }

    /** Hearing should be updated whenever vision is */
    override updateVisionSource({ defer = false, deleted = false } = {}): void {
        super.updateVisionSource({ defer, deleted });
        if (this._isVisionSource() && !deleted) {
            this.hearing.initialize();
        }
    }

    protected override _destroy(): void {
        super._destroy();
        this.hearing.destroy();
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Refresh vision and the `EffectsPanel` */
    protected override _onControl(options: { releaseOthers?: boolean; pan?: boolean } = {}): void {
        if (game.ready) game.pf2e.effectPanel.refresh();
        super._onControl(options);
        this.auras.refresh();
    }

    /** Refresh vision and the `EffectsPanel` */
    protected override _onRelease(options?: Record<string, unknown>): void {
        game.pf2e.effectPanel.refresh();

        super._onRelease(options);

        this.auras.refresh();
    }

    protected override _onDragLeftStart(event: TokenInteractionEvent<this>): void {
        super._onDragLeftStart(event);
        this.auras.clearHighlights();
    }

    /** If a single token (this one) was dropped, re-establish the hover status */
    protected override async _onDragLeftDrop(event: TokenInteractionEvent<this>): Promise<this["document"][]> {
        const clones = event.data.clones ?? [];
        const dropped = await super._onDragLeftDrop(event);

        if (clones.length === 1) {
            this.emitHoverOut();
            this.emitHoverIn();
        }

        this.auras.refresh();

        return dropped;
    }

    protected override _onHoverIn(event: PIXI.InteractionEvent, options?: { hoverOutOthers?: boolean }): boolean {
        const refreshed = super._onHoverIn(event, options);
        if (refreshed === false) return false;
        this.auras.refresh();

        return true;
    }

    protected override _onHoverOut(event: PIXI.InteractionEvent): boolean {
        const refreshed = super._onHoverOut(event);
        if (refreshed === false) return false;
        this.auras.refresh();

        return true;
    }

    /** Destroy auras before removing this token from the canvas */
    override _onDelete(options: DocumentModificationContext<TokenDocumentPF2e>, userId: string): void {
        super._onDelete(options, userId);
        this.auras.clear();
    }

    /** A callback for when a movement animation for this token finishes */
    private async onFinishAnimation(): Promise<void> {
        await this._animation;
        this.auras.refresh();
    }

    /** Handle system-specific status effects (upstream handles invisible and blinded) */
    override _onApplyStatusEffect(statusId: string, active: boolean): void {
        super._onApplyStatusEffect(statusId, active);

        if (["undetected", "unnoticed"].includes(statusId)) {
            canvas.perception.update({ refreshVision: true, refreshLighting: true }, true);
            this.mesh.refresh();
        }
    }
}

interface TokenPF2e extends Token<TokenDocumentPF2e> {
    get layer(): TokenLayerPF2e<this>;

    icon?: TokenImage;
}

interface TokenImage extends PIXI.Sprite {
    src?: VideoFilePath;
}

type NumericFloatyEffect = { name: string; value?: number | null };
type ShowFloatyEffectParams =
    | number
    | { create: NumericFloatyEffect }
    | { update: NumericFloatyEffect }
    | { delete: NumericFloatyEffect };

export { TokenPF2e };
