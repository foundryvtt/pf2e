import { EffectPF2e } from "@item";
import type { UserPF2e } from "@module/user/document.ts";
import type { TokenDocumentPF2e } from "@scene";
import * as R from "remeda";
import type { CanvasPF2e, TokenLayerPF2e } from "../index.ts";
import { RulerPF2e, measureDistanceCuboid, squareAtPoint } from "../index.ts";
import { AuraRenderers } from "./aura/index.ts";
import { FlankingHighlightRenderer } from "./flanking-highlight/renderer.ts";

class TokenPF2e<TDocument extends TokenDocumentPF2e = TokenDocumentPF2e> extends Token<TDocument> {
    /** Visual representation and proximity-detection facilities for auras */
    readonly auras: AuraRenderers;

    /** Visual rendering of lines from token to flanking buddy tokens on highlight */
    readonly flankingHighlight: FlankingHighlightRenderer;

    constructor(document: TDocument) {
        super(document);

        this.auras = new AuraRenderers(this);
        Object.defineProperty(this, "auras", { configurable: false, writable: false }); // It's ours, Kim!
        this.flankingHighlight = new FlankingHighlightRenderer(this);
    }

    get isTiny(): boolean {
        return this.document.height < 1 || this.document.width < 1;
    }

    /** This token's shape at its canvas position */
    get localShape(): TokenShape {
        switch (this.shape.type) {
            case PIXI.SHAPES.RECT:
                return this.bounds;
            case PIXI.SHAPES.POLY: {
                const shape = this.shape.clone();
                const bounds = this.bounds;
                shape.points = shape.points.map((c, i) => (i % 2 === 0 ? c + bounds.x : c + bounds.y));
                return shape;
            }
            case PIXI.SHAPES.CIRC: {
                const shape = this.shape.clone();
                const center = this.center;
                shape.x = center.x;
                shape.y = center.y;
                return shape;
            }
        }
    }

    /** The grid offsets representing this token's shape */
    get footprint(): GridOffset[] {
        const shape = this.isTiny ? this.mechanicalBounds : this.localShape;
        const seen = new Set<number>();
        const offsets: GridOffset[] = [];
        const [i0, j0, i1, j1] = canvas.grid.getOffsetRange(this.mechanicalBounds);
        for (let i = i0; i < i1; i++) {
            for (let j = j0; j < j1; j++) {
                const offset = { i, j };
                const packed = (offset.i << 16) + offset.j;
                if (seen.has(packed)) continue;
                seen.add(packed);
                const point = canvas.grid.getCenterPoint(offset);
                if (shape.contains(point.x, point.y)) {
                    offsets.push(offset);
                }
            }
        }
        return offsets.sort((a, b) => a.j - b.j).sort((a, b) => a.i - b.i);
    }

    get #isDragMeasuring(): boolean {
        const ruler = canvas.controls.ruler;
        return ruler.dragMeasurement && ruler.isMeasuring && ruler.token === this;
    }

    /** Increase center-to-center point tolerance to be more compliant with 2e rules */
    override get isVisible(): boolean {
        // Clear the detection filter
        this.detectionFilter = null;

        // Only GM users can see hidden tokens
        if (this.document.hidden && !game.user.isGM) return false;

        // Some tokens are always visible
        if (!canvas.visibility.tokenVision || this.controlled) return true;

        // Otherwise, test visibility against current sight polygons
        if (canvas.effects.visionSources.get(this.sourceId)?.active) return true;
        const tolerance = Math.floor(0.35 * Math.min(this.w, this.h));
        return canvas.visibility.testVisibility(this.center, { tolerance, object: this });
    }

    /** A reference to an animation that is currently in progress for this Token, if any */
    get animation(): Promise<boolean> | null {
        return this.animationContexts.get(this.animationName)?.promise ?? null;
    }

    /** Is this token currently animating? */
    get isAnimating(): boolean {
        return !!this.animation;
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

    /** Bounds used for mechanics, such as flanking and drawing auras */
    get mechanicalBounds(): PIXI.Rectangle {
        const bounds = super.bounds;
        if (this.isTiny) {
            const position = canvas.grid.getTopLeftPoint(bounds);
            return new PIXI.Rectangle(
                position.x,
                position.y,
                Math.max(canvas.grid.size, bounds.width),
                Math.max(canvas.grid.size, bounds.height),
            );
        }

        return bounds;
    }

    isAdjacentTo(token: TokenPF2e): boolean {
        return this.distanceTo(token) === 5;
    }

    /** Publicly expose `Token#_canControl` for use in `TokenLayerPF2e`. */
    canControl(user: UserPF2e, event: PIXI.FederatedPointerEvent): boolean {
        return this._canControl(user, event);
    }

    /**
     * Determine whether this token can flank another—given that they have a flanking buddy on the opposite side
     * @param flankee                  The potentially flanked token
     * @param context.reach           An optional reach distance specific to this measurement
     * @param context.ignoreFlankable Optionally ignore flankable (for flanking highlight) */
    canFlank(flankee: TokenPF2e, context: { reach?: number; ignoreFlankable?: boolean } = {}): boolean {
        const settingDisabled = !game.pf2e.settings.automation.flanking;
        const oneIsGMHidden = this.document.hidden || flankee.document.hidden;
        if (settingDisabled || oneIsGMHidden || this === flankee) {
            return false;
        }

        // Can the actor flank, and is the flankee flankable?
        const actor = this.actor;
        const flankable = context.ignoreFlankable || flankee.actor?.attributes.flanking.flankable;
        if (!(actor?.attributes.flanking.canFlank && flankable)) return false;

        // Only creatures can flank or be flanked
        if (!(actor.isOfType("creature") && flankee.actor?.isOfType("creature"))) {
            return false;
        }

        // Allies don't flank each other
        if (actor.isAllyOf(flankee.actor)) return false;

        const reach = context.reach ?? actor.getReach({ action: "attack" });

        return actor.canAttack && reach >= this.distanceTo(flankee, { reach });
    }

    /**
     * Determine whether two potential flankers are on opposite sides of flankee
     * @param flankerA  First of two potential flankers
     * @param flankerB  Second of two potential flankers
     * @param flankee   Potentially flanked token
     */
    protected onOppositeSides(flankerA: TokenPF2e, flankerB: TokenPF2e, flankee: TokenPF2e): boolean {
        const [centerA, centerB] = [flankerA.center, flankerB.center];
        const { bounds } = flankee;

        const left = new Ray({ x: bounds.left, y: bounds.top }, { x: bounds.left, y: bounds.bottom });
        const right = new Ray({ x: bounds.right, y: bounds.top }, { x: bounds.right, y: bounds.bottom });
        const top = new Ray({ x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top });
        const bottom = new Ray({ x: bounds.left, y: bounds.bottom }, { x: bounds.right, y: bounds.bottom });
        const intersectsSide = (side: Ray): boolean => fu.lineSegmentIntersects(centerA, centerB, side.A, side.B);

        return (intersectsSide(left) && intersectsSide(right)) || (intersectsSide(top) && intersectsSide(bottom));
    }

    /**
     * Determine whether this token is in fact flanking another
     * @param flankee                  The potentially flanked token
     * @param context.reach           An optional reach distance specific to this measurement
     * @param context.ignoreFlankable Optionally ignore flankable (for flanking position indicator) */
    isFlanking(flankee: TokenPF2e, context: { reach?: number; ignoreFlankable?: boolean } = {}): boolean {
        const thisActor = this.actor;
        if (!(thisActor && this.canFlank(flankee, context))) return false;

        const flanking = thisActor.attributes.flanking;

        // Finds all possible allies that are allowed to flank, to test their positioning later
        // A linked actor can flank with another token of itself (ex: a Thaumaturge with a mirror implement)
        const flankingBuddies = canvas.tokens.placeables.filter(
            (t) =>
                (t.actor?.isAllyOf(thisActor) ||
                    (this.document.isLinked && t.actor === thisActor && t.id !== this.id)) &&
                t.canFlank(flankee, R.pick(context, ["ignoreFlankable"])),
        );
        if (flankingBuddies.length === 0) return false;

        // The actual "Gang Up" rule or similar
        const gangingUp =
            flanking.canGangUp.some(
                (g) =>
                    (typeof g === "number" && g <= flankingBuddies.length) ||
                    (g === true && flankingBuddies.length >= 1),
            ) || flankingBuddies.some((b) => b.actor?.attributes.flanking.canGangUp.some((g) => g === true));
        if (gangingUp) return true;

        // The Side By Side feat with tie-in to the PF2e Animal Companion Compendia module
        const sideBySide =
            this.isAdjacentTo(flankee) &&
            flanking.canGangUp.includes("animal-companion") &&
            flankingBuddies.some((b) => {
                if (!b.actor?.isOfType("character")) return false;
                const traits = b.actor.traits;
                return traits.has("minion") && !traits.has("construct") && b.isAdjacentTo(flankee);
            });
        if (sideBySide) return true;

        // Support for Eidolons
        const kindredFlank =
            this.isAdjacentTo(flankee) &&
            flanking.canGangUp.includes("eidolon") &&
            flankingBuddies.some((b) => {
                if (!b.actor?.isOfType("character")) return false;
                const traits = b.actor.traits;
                return traits.has("eidolon") && b.isAdjacentTo(flankee);
            });
        if (kindredFlank) return true;

        // Find a flanking buddy opposite this token
        return flankingBuddies.some((b) => this.onOppositeSides(this, b, flankee));
    }

    /**
     * Find other tokens that are in fact flanking a flankee with this token.
     * Only detects tokens on opposite sides of flankee, does not support Gang Up or Side By Side.
     * @param flankee                  The potentially flanked token
     * @param context.reach           An optional reach distance specific to this measurement
     * @param context.ignoreFlankable Optionally ignore flankable (for flanking position indicator) */
    buddiesFlanking(flankee: TokenPF2e, context: { reach?: number; ignoreFlankable?: boolean } = {}): TokenPF2e[] {
        if (!this.canFlank(flankee, context)) return [];
        const ignoreFlankable = !!context.ignoreFlankable;
        return canvas.tokens.placeables
            .filter((t) => t !== this && t.canFlank(flankee, { ignoreFlankable }))
            .filter((b) => this.onOppositeSides(this, b, flankee));
    }

    /** Reposition aura textures after this token has moved. */
    protected override _applyRenderFlags(flags: Record<string, boolean>): void {
        super._applyRenderFlags(flags);
        if (flags.refreshPosition) this.auras.refreshPositions();
    }

    /** Draw auras and flanking highlight lines if certain conditions are met */
    protected override _refreshVisibility(): void {
        super._refreshVisibility();
        this.auras.draw();
        this.flankingHighlight.draw();
    }

    /** Overrides _drawBar(k) to also draw pf2e variants of normal resource bars (such as temp health) */
    protected override _drawBar(number: number, bar: PIXI.Graphics, data: TokenResourceData): void {
        if (!canvas.initialized) return;

        const actor = this.document.actor;
        if (!(data.attribute === "attributes.hp" && actor?.attributes.hp)) {
            return super._drawBar(number, bar, data);
        }

        const { value, max, temp } = actor.attributes.hp ?? {};
        const healthPercent = Math.clamp(value, 0, max) / max;

        // Compute the color based on health percentage, this formula is the one core Foundry uses
        const black = 0x000000;
        const color = number
            ? Number(Color.fromRGB([0.5 * healthPercent, 0.7 * healthPercent, 0.5 + healthPercent / 2]))
            : Number(Color.fromRGB([1 - healthPercent / 2, healthPercent, 0]));

        // Bar size logic stolen from core
        let h = Math.max(canvas.dimensions.size / 12, 8);
        const bs = Math.clamp(h / 8, 1, 2);
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
            const tempPercent = Math.clamp(temp, 0, max) / max;
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
    override async _drawEffects(): Promise<void> {
        await super._drawEffects();
        await this.animation;

        if (this.auras.size === 0) {
            return this.auras.reset();
        }

        // Determine whether a redraw is warranted by comparing current and updated radius/appearance data
        const changedAndDeletedAuraSlugs = Array.from(this.auras.entries())
            .filter(([slug, aura]) => {
                const properties = ["radius", "appearance"] as const;
                const sceneData = R.pick(
                    this.document.auras.get(slug) ?? { radius: null, appearance: null },
                    properties,
                );
                if (sceneData.radius === null) return true;
                const canvasData = R.pick(aura, properties);

                return !R.isDeepEqual(sceneData, canvasData);
            })
            .map(([slug]) => slug);
        const newAuraSlugs = Array.from(this.document.auras.keys()).filter((s) => !this.auras.has(s));

        return this.auras.reset([changedAndDeletedAuraSlugs, newAuraSlugs].flat());
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
        if (!this.hasSight || !this.document.parent?.tokenVision) return false;

        // If GM vision is enabled, making nothing a vision source will allow the user to see everything
        if (game.pf2e.settings.gmVision && game.user.isGM) return false;

        const partyVisionEnabled =
            game.pf2e.settings.metagame.partyVision && !!this.actor?.hasPlayerOwner && !game.user.isGM;
        const controllingAsObserver = this.controlled && this.observer;

        return partyVisionEnabled || controllingAsObserver || (!this.controlled && super._isVisionSource());
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

                const percent = Math.clamp(Math.abs(quantity) / maxHP, 0, 1);
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
                const textStyle = R.pick(this._getTextStyle(), ["fill", "fontSize", "stroke", "strokeThickness"]);

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

        await this.animation;
        await canvas.interface?.createScrollingText(...scrollingTextArgs);
    }

    /**
     * Measure the distance between this token and another object or point, in grid distance. We measure between the
     * centre of squares, and if either covers more than one square, we want the minimum distance between
     * any two of the squares.
     */
    distanceTo(target: TokenOrPoint, { reach = null }: { reach?: number | null } = {}): number {
        if (!canvas.ready) return NaN;

        if (this === target) return 0;

        if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) {
            const waypoints: GridMeasurePathWaypoint[] = [
                { x: this.x, y: this.y },
                { x: target.x, y: target.y },
            ];
            return canvas.grid.measurePath(waypoints).distance;
        }

        const selfElevation = this.document.elevation;
        const targetElevation = target.document?.elevation ?? selfElevation;
        const targetBounds = target.bounds ?? squareAtPoint(target);
        if (selfElevation === targetElevation || !this.actor || !target.bounds || !target.actor) {
            return measureDistanceCuboid(this.bounds, targetBounds, { reach });
        }

        return measureDistanceCuboid(this.bounds, targetBounds, { reach, token: this, target });
    }

    override async animate(updateData: Record<string, unknown>, options?: TokenAnimationOptionsPF2e): Promise<void> {
        // Handle system "spin" animation option
        if (options?.spin) {
            let attributeAdded = false;
            const currentRotation = this.document.rotation;
            const rotationAngle = this.x <= this.document.x ? 360 : -360;
            options.ontick = (_frame, data) => {
                // Temporarily unlock rotation
                this.document.lockRotation = false;
                if (!attributeAdded && data.attributes.length > 0) {
                    const duration = (data.duration ?? 1000) / 1000;
                    data.attributes.push({
                        attribute: "rotation",
                        parent: data.attributes[0].parent,
                        from: currentRotation,
                        to: currentRotation + duration * rotationAngle,
                        delta: data.attributes[0].delta,
                    });
                    attributeAdded = true;
                }
            };
        }

        await super.animate(updateData, options);

        // Restore `lockRotation` to source value in case it was unlocked for spin animation
        this.document.lockRotation = this.document._source.lockRotation;
    }

    /** Obscure the token's sprite if a hearing or tremorsense detection filter is applied to it */
    override render(renderer: PIXI.Renderer): void {
        super.render(renderer);
        if (!this.mesh) return;

        const configuredTint = this.document.texture.tint ?? Color.fromString("#FFFFFF");
        if (this.mesh.tint !== 0 && this.detectionFilter instanceof OutlineOverlayFilter) {
            this.mesh.tint = 0;
        } else if (
            this.mesh.tint === 0 &&
            configuredTint.toString() !== "#000000" &&
            !(this.detectionFilter instanceof OutlineOverlayFilter)
        ) {
            this.mesh.tint = Number(configuredTint);
        }
    }

    protected override _destroy(): void {
        super._destroy();
        this.auras.destroy();
        this.flankingHighlight.destroy();
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Players can view an actor's sheet if the actor is lootable. */
    protected override _canView(user: UserPF2e, event: PIXI.FederatedPointerEvent): boolean {
        return super._canView(user, event) || !!this.actor?.isLootableBy(user);
    }

    protected override _canDrag(user: UserPF2e, event?: TokenPointerEvent<this>): boolean {
        if (super._canDrag(user, event)) return true;
        const setting = game.pf2e.settings.dragMeasurement;
        return this.controlled && (setting === "always" || (setting === "encounters" && !!game.combat?.active));
    }

    /** Prevent players from controlling an NPC when it's lootable */
    protected override _canControl(user: UserPF2e, event?: PIXI.FederatedPointerEvent): boolean {
        if (!this.observer && this.actor?.isOfType("npc") && this.actor.isLootableBy(user)) return false;
        return super._canControl(user, event);
    }

    /** Refresh vision and the `EffectsPanel` */
    protected override _onControl(options: { releaseOthers?: boolean; pan?: boolean } = {}): void {
        if (game.ready) game.pf2e.effectPanel.refresh();
        return super._onControl(options);
    }

    /** Refresh vision and the `EffectsPanel` */
    protected override _onRelease(options?: Record<string, unknown>): void {
        game.pf2e.effectPanel.refresh();
        return super._onRelease(options);
    }

    /** Initiate token drag measurement unless using the ruler tool. */
    protected override _onDragLeftStart(event: TokenPointerEvent<this>): void {
        event.interactionData.clones ??= [];
        const hasModuleConflict = RulerPF2e.hasModuleConflict;
        if (game.activeTool !== "ruler" || hasModuleConflict) {
            if (!hasModuleConflict) canvas.controls.ruler.startDragMeasurement(event);
            return super._onDragLeftStart(event);
        }
    }

    protected override _onDragLeftMove(event: TokenPointerEvent<this>): void {
        if (this.#isDragMeasuring) {
            canvas.controls.ruler.onDragMeasureMove(event);
        }
        return super._onDragLeftMove(event);
    }

    protected override async _onDragLeftDrop(event: TokenPointerEvent<this>): Promise<void | TDocument[]> {
        if (this.#isDragMeasuring) {
            // Pass along exact destination coordinates if this token is tiny
            const destination =
                this.isTiny && event.interactionData.clones?.length
                    ? R.pick(event.interactionData.clones[0], ["x", "y"])
                    : null;
            canvas.controls.ruler.finishDragMeasurement(event, destination);
            this.layer.clearPreviewContainer();
        } else {
            super._onDragLeftDrop(event);
        }
    }

    protected override _onDragLeftCancel(event: TokenPointerEvent<this>): void {
        if (this.#isDragMeasuring) {
            canvas.controls.ruler.onDragLeftCancel(event);
            if (!this.#isDragMeasuring) {
                super._onDragLeftCancel(event);
            }
        } else {
            super._onDragLeftCancel(event);
        }
    }

    /** Handle system-specific status effects (upstream handles invisible and blinded) */
    override _onApplyStatusEffect(statusId: string, active: boolean): void {
        super._onApplyStatusEffect(statusId, active);

        if (["undetected", "unnoticed"].includes(statusId)) {
            canvas.perception.update({ refreshVision: true, refreshLighting: true }, true);
        }
    }

    /** Reset aura renders when token size changes. */
    override _onUpdate(
        changed: DeepPartial<TDocument["_source"]>,
        operation: TokenUpdateOperation<TDocument["parent"]>,
        userId: string,
    ): void {
        super._onUpdate(changed, operation, userId);

        if (changed.width) {
            if (this.animation) {
                this.animation.then(() => {
                    this.auras.reset();
                });
            } else {
                this.auras.reset();
            }
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

interface TokenAnimationOptionsPF2e extends TokenAnimationOptions {
    spin?: boolean;
}

type TokenOrPoint =
    | TokenPF2e
    | (Point & {
          actor?: never;
          document?: never;
          bounds?: never;
      });

export { TokenPF2e };
export type { ShowFloatyEffectParams, TokenAnimationOptionsPF2e };
