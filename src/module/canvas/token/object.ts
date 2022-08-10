import { TokenDocumentPF2e } from "@module/scene";
import { pick } from "@util";
import { CanvasPF2e, measureDistanceRect, TokenLayerPF2e } from "..";
import { AuraRenderers } from "./aura";

class TokenPF2e extends Token<TokenDocumentPF2e> {
    /** Visual representation and proximity-detection facilities for auras */
    readonly auras: AuraRenderers;

    /** Used to track conditions and other token effects by game.pf2e.StatusEffects */
    statusEffectChanged = false;

    constructor(document: TokenDocumentPF2e) {
        super(document);
        this.auras = new AuraRenderers(this);
        Object.defineProperty(this, "auras", { configurable: false, writable: false }); // It's ours, Kim!
    }

    /** The promise returned by the last call to `Token#draw()` */
    private drawLock?: Promise<this>;

    /** Is this token currently moving? */
    get isMoving(): boolean {
        return !!this._movement;
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
        const ANIMAL_COMPANION_SOURCE_ID = "Compendium.pf2e-animal-companions.AC-Ancestries-and-Class.h6Ybhv5URar01WPk";
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

    /** Make the drawing promise accessible to `#redraw` */
    override async draw(): Promise<this> {
        this.auras.clear();
        this.drawLock = super.draw();
        await this.drawLock;

        return this;
    }

    /** Draw auras along with effect icons */
    override drawEffects(): Promise<void> {
        this.auras.draw();
        return super.drawEffects();
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
            !!this.actor?.hasPlayerOwner && !game.user.isGM && game.settings.get("pf2e", "metagame.partyVision");
        return partyVisionEnabled || super._isVisionSource();
    }

    /** Include actor overrides in the clone if it is a preview */
    override clone(): this {
        const clone = super.clone();
        if (!clone.id) {
            clone.document.height = this.document.height;
            clone.document.width = this.document.width;
            clone.document.texture.src = this.document.texture.src;
        }

        return clone;
    }

    /** Emit floaty text from this tokens */
    async showFloatyText(params: number | ShowFloatyEffectParams): Promise<void> {
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
                        textStyle: {
                            fill: textColors[quantity < 0 ? "damage" : "healing"],
                            fontSize: 16 + 32 * percent, // Range between [16, 48]
                            stroke: 0x000000,
                            strokeThickness: 4,
                        },
                    },
                ];
            } else {
                const [change, details] = Object.entries(params)[0];
                const isAdded = change === "create";
                const sign = isAdded ? "+ " : "- ";
                const appendedNumber = details.value ? ` ${details.value}` : "";
                const content = `${sign}${details.name}${appendedNumber}`;

                return [
                    this.center,
                    content,
                    {
                        anchor: change === "create" ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
                        direction: isAdded ? 2 : 1,
                        jitter: 0.25,
                        textStyle: {
                            fill: "white",
                            fontSize: 28,
                            stroke: 0x000000,
                            strokeThickness: 4,
                        },
                    },
                ];
            }
        })();
        if (!scrollingTextArgs) return;

        await this.drawLock;
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
            horizontal: measureDistanceRect(this.bounds, target.bounds, { reach }),
            vertical: 0,
        };

        const selfElevation = this.document.elevation;
        const targetElevation = target.document.elevation;
        if (selfElevation === targetElevation || !this.actor || !target.actor) return distance.horizontal;

        const [selfDimensions, targetDimensions] = [this.actor.dimensions, target.actor.dimensions];
        if (!(selfDimensions && targetDimensions)) return distance.horizontal;

        const gridSize = canvas.dimensions.size;
        const gridDistance = canvas.dimensions.distance;
        const vertical = {
            self: new PIXI.Rectangle(
                this.bounds.x,
                (selfElevation / gridDistance) * gridSize,
                this.bounds.width,
                (selfDimensions.height / gridDistance) * gridSize
            ),
            target: new PIXI.Rectangle(
                target.bounds.x,
                (targetElevation / gridDistance) * gridSize,
                target.bounds.width,
                (targetDimensions.height / gridDistance) * gridSize
            ),
        };

        distance.vertical = measureDistanceRect(vertical.self, vertical.target, { reach });
        const hypotenuse = Math.sqrt(Math.pow(distance.horizontal, 2) + Math.pow(distance.vertical, 2));

        return Math.floor(hypotenuse / gridDistance) * gridDistance;
    }

    /** Add a callback for when a movement animation finishes */
    override async animateMovement(ray: Ray): Promise<void> {
        await super.animateMovement(ray);
        this.onFinishMoveAnimation();
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
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

    /** Work around Foundry bug in which unlinked token redrawing performed before data preparation completes */
    override _onUpdate(
        changed: DeepPartial<this["document"]["_source"]>,
        options: DocumentModificationContext<this["document"]>,
        userId: string
    ): void {
        if (!this.document.isLinked) {
            const source = this.document.toObject();
            const { width, height, texture } = source;
            this.document.reset();
            // If any of the following changed, a full redraw should be performed
            const postChange = pick(this.document, ["width", "height", "texture"]);
            mergeObject(changed, diffObject({ width, height, texture }, postChange));

            // If an aura is newly present or removed, redraw effects
            if (
                !changed.effects &&
                (Array.from(this.document.auras.keys()).some((k) => !this.auras.has(k)) ||
                    Array.from(this.auras.keys()).some((k) => !this.document.auras.has(k)))
            ) {
                changed.effects = deepClone(this.document._source.effects);
            }
        }

        super._onUpdate(changed, options, userId);
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
    private async onFinishMoveAnimation(): Promise<void> {
        if (this._movement) return;
        this.auras.refresh();
    }
}

interface TokenPF2e extends Token<TokenDocumentPF2e> {
    get layer(): TokenLayerPF2e<this>;

    icon?: TokenImage;
}

interface TokenImage extends PIXI.Sprite {
    src?: VideoPath;
}

type NumericFloatyEffect = { name: string; value?: number | null };
type ShowFloatyEffectParams =
    | number
    | { create: NumericFloatyEffect }
    | { update: NumericFloatyEffect }
    | { delete: NumericFloatyEffect };

export { TokenPF2e };
