import { ANIMAL_COMPANION_SOURCE_IDS } from "@actor/values.ts";
import { EffectPF2e } from "@item";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { htmlClosest, pick } from "@util";
import { CanvasPF2e, TokenLayerPF2e, measureDistanceCuboid } from "../index.ts";
import { HearingSource } from "../perception/hearing-source.ts";
import { AuraRenderers } from "./aura/index.ts";
import { Renderer } from "pixi.js";

class TokenPF2e<TDocument extends TokenDocumentPF2e = TokenDocumentPF2e> extends Token<TDocument> {
    /** Visual representation and proximity-detection facilities for auras */
    readonly auras: AuraRenderers;

    /** The token's line hearing source */
    hearing: HearingSource<this>;

    constructor(document: TDocument) {
        super(document);

        this.hearing = new HearingSource({ object: this });
        this.auras = new AuraRenderers(this);
        Object.defineProperty(this, "auras", { configurable: false, writable: false }); // It's ours, Kim!
    }

    /** Increase center-to-center point tolerance to be more compliant with 2e rules */
    override get isVisible(): boolean {
        // Clear the detection filter
        this.detectionFilter = null;

        // Only GM users can see hidden tokens
        if (this.document.hidden && !game.user.isGM) return false;

        // Some tokens are always visible
        if (!canvas.effects.visibility.tokenVision) return true;
        if (this.controlled) return true;

        // Otherwise, test visibility against current sight polygons
        if (canvas.effects.visionSources.get(this.sourceId)?.active) return true;
        const tolerance = Math.floor(0.35 * Math.min(this.w, this.h));
        return canvas.effects.visibility.testVisibility(this.center, { tolerance, object: this });
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

    /** Short-circuit calculation for long sight ranges */
    override get sightRange(): number {
        return this.document.sight.range >= canvas.dimensions!.maxR ? canvas.dimensions!.maxR : super.sightRange;
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
                    ANIMAL_COMPANION_SOURCE_IDS.includes(b.actor.class?.sourceId ?? "") &&
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

        if (!(data.attribute === "attributes.hp" && actor?.attributes.hp)) {
            return super._drawBar(number, bar, data);
        }

        const { value, max, temp } = actor.attributes.hp ?? {};
        const healthPercent = Math.clamped(value, 0, max) / max;

        // Compute the color based on health percentage, this formula is the one core Foundry uses
        const black = 0x000000;
        const color = number
            ? Number(Color.fromRGB([0.5 * healthPercent, 0.7 * healthPercent, 0.5 + healthPercent / 2]))
            : Number(Color.fromRGB([1 - healthPercent / 2, healthPercent, 0]));

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

    /** Emulate a pointer hover ("pointerover") event */
    emitHoverIn(nativeEvent: MouseEvent | PointerEvent): void {
        const event = new PIXI.FederatedPointerEvent(new PIXI.EventBoundary(this));
        event.type = "pointerover";
        event.nativeEvent = nativeEvent;
        this._onHoverIn(event, { hoverOutOthers: true });
    }

    /** Emulate a pointer hover ("pointerout") event */
    emitHoverOut(nativeEvent: MouseEvent | PointerEvent): void {
        const event = new PIXI.FederatedPointerEvent(new PIXI.EventBoundary(this));
        event.type = "pointerout";
        event.nativeEvent = nativeEvent;
        this._onHoverOut(event);
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
                const appendedNumber = !/ \d+$/.test(details.name) && details.value ? ` ${details.value}` : "";
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

        const selfElevation = this.document.elevation;
        const targetElevation = target.document.elevation;
        if (selfElevation === targetElevation || !this.actor || !target.actor) {
            return measureDistanceCuboid(this.bounds, target.bounds, { reach });
        }

        return measureDistanceCuboid(this.bounds, target.bounds, {
            reach,
            token: this,
            target,
        });
    }

    /** Add a callback for when a movement animation finishes */
    override async animate(updateData: Record<string, unknown>, options?: TokenAnimationOptions<this>): Promise<void> {
        await super.animate(updateData, options);
        if (!this._animation) this.#onFinishAnimation();
    }

    /** Hearing should be updated whenever vision is */
    override updateVisionSource({ defer = false, deleted = false } = {}): void {
        super.updateVisionSource({ defer, deleted });
        if (this._isVisionSource() && !deleted) {
            this.hearing.initialize();
        }
    }

    /** Obscure the token's sprite if a hearing or tremorsense detection filter is applied to it */
    override render(renderer: Renderer): void {
        super.render(renderer);
        if (!this.mesh) return;

        const configuredTint = this.document.texture.tint ?? "#FFFFFF";
        if (this.mesh.tint !== 0 && this.detectionFilter instanceof OutlineOverlayFilter) {
            this.mesh.tint = 0;
        } else if (this.mesh.tint === 0 && configuredTint !== "#000000" && !this.detectionFilter) {
            this.mesh.tint = Number(Color.fromString(configuredTint));
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

    protected override _onDragLeftStart(event: TokenPointerEvent<this>): void {
        super._onDragLeftStart(event);
        this.auras.clearHighlights();
    }

    protected override _onHoverIn(event: PIXI.FederatedPointerEvent, options?: { hoverOutOthers?: boolean }): boolean {
        const refreshed = super._onHoverIn(event, options);
        if (refreshed === false) return false;
        this.auras.refresh();

        return true;
    }

    protected override _onHoverOut(event: PIXI.FederatedPointerEvent): boolean {
        // Ignore hover events coming from `Application` windows
        if (htmlClosest(event.nativeEvent?.target, ".app.sheet")) {
            return false;
        }
        const refreshed = super._onHoverOut(event);
        if (refreshed === false) return false;
        this.auras.refresh();

        return true;
    }

    /** Destroy auras before removing this token from the canvas */
    override _onDelete(options: DocumentModificationContext<TDocument["parent"]>, userId: string): void {
        super._onDelete(options, userId);
        this.auras.clear();
    }

    /** A callback for when a movement animation for this token finishes */
    async #onFinishAnimation(): Promise<void> {
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

interface TokenPF2e<TDocument extends TokenDocumentPF2e = TokenDocumentPF2e> extends Token<TDocument> {
    get layer(): TokenLayerPF2e<this>;
}

type NumericFloatyEffect = { name: string; value?: number | null };
type ShowFloatyEffectParams =
    | number
    | { create: NumericFloatyEffect }
    | { update: NumericFloatyEffect }
    | { delete: NumericFloatyEffect };

export { ShowFloatyEffectParams, TokenPF2e };
