import { ActorPF2e } from "@actor";
import { TokenPF2e } from "@module/canvas";
import { ScenePF2e, TokenConfigPF2e } from "@module/scene";
import { TokenDataPF2e } from "./data";
import { ChatMessagePF2e } from "@module/chat-message";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter";
import { PrototypeTokenPF2e } from "@actor/data/base";
import { TokenAura } from "./aura";
import { ActorSourcePF2e } from "@actor/data";
import { objectHasKey, sluggify } from "@util";

class TokenDocumentPF2e<TActor extends ActorPF2e = ActorPF2e> extends TokenDocument<TActor> {
    /** Has this token gone through at least one cycle of data preparation? */
    private initialized?: boolean;

    auras!: Map<string, TokenAura>;

    /** Check actor for effects found in `CONFIG.specialStatusEffects` */
    override hasStatusEffect(statusId: string): boolean {
        const { actor } = this;
        if (!actor) return false;

        const hasCondition = objectHasKey(CONFIG.PF2E.conditionTypes, statusId) && actor.hasCondition(statusId);
        const hasEffect = () => actor.itemTypes.effect.some((e) => (e.slug ?? sluggify(e.name)) === statusId);

        return hasCondition || hasEffect();
    }

    /** Filter trackable attributes for relevance and avoidance of circular references */
    static override getTrackedAttributes(data: Record<string, unknown> = {}, _path: string[] = []): TokenAttributes {
        // This method is being called with no associated actor: fill from the models
        if (_path.length === 0 && Object.keys(data).length === 0) {
            for (const [type, model] of Object.entries(game.system.model.Actor)) {
                if (!["character", "npc"].includes(type)) continue;
                foundry.utils.mergeObject(data, model);
            }
        }

        if (_path.length > 0) {
            return super.getTrackedAttributes(data, _path);
        }

        const patterns = {
            positive: /^(?:attributes|resources)\./,
            negative: /\b(?:rank|_?modifiers|item|classdc|dexcap|familiar|\w+hp\b)|bonus/i,
        };

        const prunedData = expandObject<Record<string, unknown>>(
            Object.fromEntries(
                Object.entries(flattenObject(data)).filter(
                    ([k, v]) =>
                        patterns.positive.test(k) &&
                        !patterns.negative.test(k) &&
                        !["boolean", "string"].includes(typeof v)
                )
            )
        );

        return super.getTrackedAttributes(prunedData, _path);
    }

    /** This should be in Foundry core, but ... */
    get scene(): this["parent"] {
        return this.parent;
    }

    protected override _initialize(): void {
        this.auras = new Map();
        super._initialize();
        this.initialized = true;
    }

    /** Is this token emitting light with a negative value */
    get emitsDarkness(): boolean {
        return this.data.brightLight < 0;
    }

    /** Is rules-based vision enabled, and does this token's actor have low-light vision (inclusive of darkvision)? */
    get hasLowLightVision(): boolean {
        return !!(this.scene?.rulesBasedVision && this.actor?.isOfType("creature") && this.actor.hasLowLightVision);
    }

    /** Is rules-based vision enabled, and does this token's actor have darkvision vision? */
    get hasDarkvision(): boolean {
        return !!(this.scene?.rulesBasedVision && this.actor?.isOfType("creature") && this.actor.hasDarkvision);
    }

    /** Is this token's dimensions linked to its actor's size category? */
    get linkToActorSize(): boolean {
        return this.flags.pf2e.linkToActorSize;
    }

    /** Is this token's scale locked at 1 or (for small creatures) 0.8? */
    get autoscale(): boolean {
        return this.flags.pf2e.autoscale;
    }

    get playersCanSeeName(): boolean {
        const anyoneCanSee: TokenDisplayMode[] = [CONST.TOKEN_DISPLAY_MODES.ALWAYS, CONST.TOKEN_DISPLAY_MODES.HOVER];
        const nameDisplayMode = this.displayName;
        return anyoneCanSee.includes(nameDisplayMode) || this.actor?.alliance === "party";
    }

    /** The pixel-coordinate definition of this token's space */
    get bounds(): PIXI.Rectangle {
        const gridSize = this.scene?.grid.size ?? 100;
        // Use source values since coordinates are changed in real time over the course of movement animation
        return new PIXI.Rectangle(this._source.x, this._source.y, this.width * gridSize, this.height * gridSize);
    }

    /** The pixel-coordinate pair constituting this token's center */
    get center(): Point {
        const { bounds } = this;
        return {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
        };
    }

    /** If rules-based vision is enabled, disable manually configured vision radii */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.auras.clear();

        if (!this.actor || !this.isEmbedded) return;

        // Synchronize the token image with the actor image, if the token does not currently have an image
        const tokenImgIsDefault = [
            ActorPF2e.DEFAULT_ICON,
            `systems/pf2e/icons/default-icons/${this.actor.type}.svg`,
        ].includes(this.texture.src);
        if (tokenImgIsDefault) {
            this.texture.src = this.actor._source.img;
        }

        for (const [key, data] of this.actor.auras.entries()) {
            this.auras.set(
                key,
                new TokenAura({
                    slug: key,
                    radius: data.radius,
                    token: this as Embedded<TokenDocumentPF2e>,
                    traits: new Set(data.traits),
                    colors: data.colors,
                    includesSelf: true,
                })
            );
        }

        if (!this.initialized) return;

        // Dimensions and scale
        const linkDefault = !["hazard", "loot"].includes(this.actor.type ?? "");
        const linkToActorSize = this.flags.pf2e?.linkToActorSize ?? linkDefault;

        const autoscaleDefault = game.settings.get("pf2e", "tokens.autoscale");
        // Autoscaling is a secondary feature of linking to actor size
        const autoscale = linkToActorSize ? this.flags.pf2e?.autoscale ?? autoscaleDefault : false;
        this.flags.pf2e = mergeObject(this.flags.pf2e ?? {}, { linkToActorSize, autoscale });

        // Vision
        /* if (this.scene?.rulesBasedVision && ["character", "familiar"].includes(this.actor.type)) {
            for (const property of ["brightSight", "dimSight"] as const) {
                this.data[property] = this._source[property] = 0;
            }
            this.sight.angle = this._source.sight.angle = 360;
        }*/

        // Nath mode
        const defaultIcons = [ActorPF2e.DEFAULT_ICON, `systems/pf2e/icons/default-icons/${this.actor.type}.svg`];
        if (game.settings.get("pf2e", "nathMode") && defaultIcons.includes(this.texture.src)) {
            this.texture.src = ((): VideoPath => {
                switch (this.actor.alliance) {
                    case "party":
                        return "systems/pf2e/icons/default-icons/alternatives/nath/ally.webp";
                    case "opposition":
                        return "systems/pf2e/icons/default-icons/alternatives/nath/enemy.webp";
                    default:
                        return this.texture.src;
                }
            })();
        }

        // Alliance coloration, appropriating core token dispositions
        const { alliance } = this.actor.system.details;
        this.disposition = alliance
            ? {
                  party: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
                  opposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
              }[alliance]
            : CONST.TOKEN_DISPOSITIONS.NEUTRAL;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        if (!(this.initialized && this.actor && this.scene)) return;

        // Merge token overrides from REs into this document
        const { tokenOverrides } = this.actor.synthetics;
        this.name = tokenOverrides.name ?? this.name;
        this.texture.src = tokenOverrides.texture?.src ?? this.texture.src;
        if (tokenOverrides.light) {
            this.light = new foundry.data.LightData(tokenOverrides.light, {
                parent: this,
            } as unknown as this);
        }

        // Token dimensions from actor size
        TokenDocumentPF2e.prepareSize(this, this.actor);

        // If a single token is controlled, darkvision is handled by setting globalLight and scene darkness
        // Setting vision radii is less performant but necessary if multiple tokens are controlled
        /* if (this.scene.rulesBasedVision && this.actor.type !== "npc") {
            const hasDarkvision = this.hasDarkvision && (this.scene.isDark || this.scene.isDimlyLit);
            const hasLowLightVision = (this.hasLowLightVision || this.hasDarkvision) && this.scene.isDimlyLit;
            this.data.brightSight = this.data.brightSight = hasDarkvision || hasLowLightVision ? 1000 : 0;
        }*/
    }

    /** Set a TokenData instance's dimensions from actor data. Static so actors can use for their prototypes */
    static prepareSize(token: TokenDocumentPF2e | PrototypeTokenPF2e, actor: ActorPF2e | null): void {
        if (!(actor && token.flags.pf2e.linkToActorSize)) return;

        // If not overridden by an actor override, set according to creature size (skipping gargantuan)
        const size = {
            tiny: 0.5,
            sm: 1,
            med: 1,
            lg: 2,
            huge: 3,
            grg: Math.max(token.width, 4),
        }[actor.size];
        if (actor.isOfType("vehicle")) {
            // Vehicles can have unequal dimensions
            const { width, height } = actor.getTokenDimensions();
            token.width = width;
            token.height = height;
        } else {
            token.width = size;
            token.height = size;

            if (game.settings.get("pf2e", "tokens.autoscale") && token.flags.pf2e.autoscale !== false) {
                token.texture.scaleX = token.texture.scaleY = actor.size === "sm" ? 0.8 : 1;
            }
        }
    }

    /** Set a token's initiative on the current encounter, creating a combatant if necessary */
    async setInitiative({
        initiative,
        sendMessage = true,
    }: {
        initiative: number;
        sendMessage?: boolean;
    }): Promise<void> {
        if (!game.combat) {
            ui.notifications.error("PF2E.Encounter.NoActiveEncounter");
            return;
        }

        const currentId = game.combat.combatant?.id;
        if (this.combatant && game.combat.combatants.has(this.combatant.id)) {
            await game.combat.setInitiative(this.combatant.id, initiative);
        } else {
            await game.combat.createEmbeddedDocuments("Combatant", [
                {
                    tokenId: this.id,
                    initiative,
                },
            ]);
        }
        // Ensure the current turn is preserved
        await this.update({ turn: game.combat.turns.findIndex((c) => c.id === currentId) });

        if (sendMessage) {
            await ChatMessagePF2e.createDocuments([
                {
                    speaker: { scene: this.scene?.id, token: this.id },
                    whisper: this.actor?.hasPlayerOwner
                        ? []
                        : game.users.contents.flatMap((user) => (user.isGM ? user.id : [])),
                    content: game.i18n.format("PF2E.InitativeIsNow", { name: this.name, value: initiative }),
                },
            ]);
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Since token properties may be changed during data preparation, rendering called by the parent method must be
     * based on the diff between pre- and post-data-preparation.
     */
    override _onUpdateBaseActor(
        updates: DeepPartial<ActorSourcePF2e> = {},
        options: DocumentModificationContext<ActorPF2e> = {}
    ): void {
        super._onUpdateBaseActor(updates, options);

        if (this.isLinked) {
            const preUpdate = this.toObject(false);
            this.reset();
            const postUpdate = this.toObject(false);
            const changed = diffObject<DeepPartial<this["_source"]>>(preUpdate, postUpdate);
            this._onUpdate(changed, options, game.user.id);
        }
    }

    /** Toggle token hiding if this token's actor is a loot actor */
    protected override _onCreate(
        data: this["_source"],
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);
        if (this.actor?.isOfType("loot")) this.actor.toggleTokenHiding();
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext,
        userId: string
    ): void {
        // Possibly re-render encounter tracker if token's `displayName` property has changed
        const tokenSetsNameVisibility = game.settings.get("pf2e", "metagame.tokenSetsNameVisibility");
        if ("displayName" in changed && tokenSetsNameVisibility && this.combatant) {
            ui.combat.render();
        }

        if (this.isLinked || !this.actor) {
            super._onUpdate(changed, options, userId);
            if (!("x" in changed || "y" in changed) && ("height" in changed || "width" in changed)) {
                this.scene?.reset();
            }
            return;
        }

        // Completely override the parent class's method for unlinked tokens
        if ("actorId" in changed || "actorLink" in changed) {
            if (this._actor) {
                for (const app of Object.values(this._actor.apps)) {
                    app.close({ submit: false });
                }
            }
            this._actor = null;
        }

        const preUpdateLight = this.light.toObject(false);
        // If the Actor data override changed, simulate updating the synthetic Actor
        if (changed.actorData) {
            this._onUpdateTokenActor(changed.actorData, options, userId);
        }
        const postUpdateLight = this.light.toObject(false);

        // From `ClientDocumentMixin#_onUpdate`
        // Re-render associated applications
        if (options.render ?? true) {
            this.render(false, { action: "update", renderData: changed });
        }
        // Update global index
        if ("name" in changed) game.documentIndex.replaceDocument(this);

        const lightChanges = diffObject<DeepPartial<foundry.data.LightSource>>(preUpdateLight, postUpdateLight);
        // From `CanvasDocumentMixin#_onUpdate`
        if (this.rendered) {
            const changedWithLight =
                Object.keys(lightChanges).length > 0 ? mergeObject(changed, { light: lightChanges }) : changed;
            this.object._onUpdate(changedWithLight, options, userId);
        }
    }

    /** Check area effects, removing any from this token's actor if the actor has no other tokens in the scene */
    protected override _onDelete(options: DocumentModificationContext<this>, userId: string): void {
        super._onDelete(options, userId);

        if (this.isLinked && !this.scene?.tokens.some((t) => t.actor === this.actor)) {
            this.actor?.checkAreaEffects();
        }
    }
}

interface TokenDocumentPF2e<TActor extends ActorPF2e = ActorPF2e> extends TokenDocument<TActor> {
    readonly data: TokenDataPF2e<this>;

    readonly _object: TokenPF2e | null;

    get object(): TokenPF2e;

    readonly parent: ScenePF2e | null;

    get combatant(): CombatantPF2e<EncounterPF2e> | null;

    _sheet: TokenConfigPF2e<this> | null;

    get sheet(): TokenConfigPF2e<this>;

    overlayEffect: ImagePath;
}

export { TokenDocumentPF2e };
