import { CreaturePF2e } from "@actor";
import { TokenDocumentPF2e } from "@module/scene";
import { MeasuredTemplatePF2e, TokenLayerPF2e } from ".";

export class TokenPF2e extends Token<TokenDocumentPF2e> {
    /** Used to track conditions and other token effects by game.pf2e.StatusEffects */
    statusEffectChanged = false;

    /** The promise returned by the last call to `Token#draw()` */
    private drawLock?: Promise<this>;

    /** Is the user currently controlling this token? */
    get isControlled(): boolean {
        return this._controlled;
    }

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
        return this.data.flags.pf2e.linkToActorSize;
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
        if (!["character", "npc"].includes(this.actor.type)) return false;
        // Only creatures can be flanked
        if (!(flankee.actor instanceof CreaturePF2e)) return false;

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

    /** Max the brightness emitted by this token's `PointSource` if any controlled token has low-light vision */
    override updateSource({ defer = false, deleted = false, skipUpdateFog = false } = {}): void {
        if (this.actor?.type === "npc" || !(canvas.sight.hasLowLightVision || canvas.sight.hasDarkvision)) {
            return super.updateSource({ defer, deleted, skipUpdateFog });
        }

        const original = { dim: this.data.light.dim, bright: this.data.light.bright };
        this.data.light.bright = Math.max(original.dim, original.bright);
        this.data.light.dim = 0;

        super.updateSource({ defer, deleted, skipUpdateFog });

        this.data.light.bright = original.bright;
        this.data.light.dim = original.dim;
    }

    /** Make the drawing promise accessible to `#redraw` */
    override async draw(): Promise<this> {
        this.drawLock = super.draw();
        await this.drawLock;
        return this;
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
            clone.data.height = this.data.height;
            clone.data.width = this.data.width;
            clone.data.img = this.data.img;
        }

        return clone;
    }

    /** Emit floaty text from this tokens */
    async showFloatyText(params: number | ShowFloatyEffectParams): Promise<void> {
        const scrollingTextArgs = ((): Parameters<ObjectHUD<TokenPF2e>["createScrollingText"]> | null => {
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

                return [
                    content,
                    {
                        anchor: change === "create" ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
                        direction: isAdded ? 2 : 1,
                        jitter: 0.25,
                        fill: "white",
                        fontSize: 28,
                        stroke: 0x000000,
                        strokeThickness: 4,
                    },
                ];
            }
        })();
        if (!scrollingTextArgs) return;

        await this.drawLock;
        await this.hud?.createScrollingText(...scrollingTextArgs);
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
            horizontal: MeasuredTemplatePF2e.measureDistanceRect(this.bounds, target.bounds, { reach }),
            vertical: 0,
        };

        const selfElevation = this.data.elevation;
        const targetElevation = target.data.elevation;
        if (selfElevation === targetElevation || !this.actor || !target.actor) return distance.horizontal;

        const [selfDimensions, targetDimensions] = [this.actor.dimensions, target.actor.dimensions];
        if (!(selfDimensions && targetDimensions)) return distance.horizontal;

        const gridSize = canvas.dimensions.size;
        const gridDistance = canvas.dimensions.distance;
        const vertical = {
            self: new NormalizedRectangle(
                this.bounds.x,
                (this.data.elevation / gridDistance) * gridSize,
                this.bounds.width,
                (selfDimensions.height / gridDistance) * gridSize
            ),
            target: new NormalizedRectangle(
                target.bounds.x,
                (target.data.elevation / gridDistance) * gridSize,
                target.bounds.width,
                (targetDimensions.height / gridDistance) * gridSize
            ),
        };

        distance.vertical = MeasuredTemplatePF2e.measureDistanceRect(vertical.self, vertical.target, { reach });
        const hypotenuse = Math.sqrt(Math.pow(distance.horizontal, 2) + Math.pow(distance.vertical, 2));

        return Math.floor(hypotenuse / gridDistance) * gridDistance;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Refresh vision and the `EffectsPanel` */
    protected override _onControl(options: { releaseOthers?: boolean; pan?: boolean } = {}): void {
        if (game.ready) game.pf2e.effectPanel.refresh();
        super._onControl(options);
        canvas.lighting.setPerceivedLightLevel(this);
    }

    /** Refresh vision and the `EffectsPanel` */
    protected override _onRelease(options?: Record<string, unknown>): void {
        game.pf2e.effectPanel.refresh();

        const hasLowLightVision = canvas.sight.sources.some((s) => s.object !== this && s.object.hasLowLightVision);
        canvas.lighting.setPerceivedLightLevel({ hasLowLightVision });
        super._onRelease(options);
    }

    /** Work around Foundry bug in which unlinked token redrawing performed before data preparation completes */
    override _onUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext<this["document"]>,
        userId: string
    ): void {
        if (!this.document.isLinked) {
            const { width, height, scale, img } = this.data;
            this.document.prepareData();
            // If any of the following changed, a full redraw should be performed
            const { data } = this;
            const postChange = { width: data.width, height: data.height, scale: data.scale, img: data.img };
            mergeObject(changed, diffObject({ width, height, scale, img }, postChange));
        }

        super._onUpdate(changed, options, userId);
    }

    /** If a single token (this one) was dropped, re-establish the hover status */
    protected override async _onDragLeftDrop(event: TokenInteractionEvent<this>): Promise<this["document"][]> {
        const clones = event.data.clones ?? [];
        const dropped = await super._onDragLeftDrop(event);

        if (clones.length === 1) {
            this.emitHoverOut();
            this.emitHoverIn();
        }

        return dropped;
    }
}

interface TokenImage extends PIXI.Sprite {
    src?: VideoPath;
}

export interface TokenPF2e extends Token<TokenDocumentPF2e> {
    get layer(): TokenLayerPF2e<this>;

    icon?: TokenImage;
}

type NumericFloatyEffect = { name: string; value?: number | null };
type ShowFloatyEffectParams =
    | number
    | { create: NumericFloatyEffect }
    | { update: NumericFloatyEffect }
    | { delete: NumericFloatyEffect };
