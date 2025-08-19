import type { ActorPF2e } from "@actor";
import type { PrototypeTokenPF2e } from "@actor/data/base.ts";
import { SIZE_LINKABLE_ACTOR_TYPES } from "@actor/values.ts";
import type { TokenAnimationOptions, TrackedAttributesDescription } from "@client/_types.d.mts";
import type { TokenResourceData } from "@client/canvas/placeables/token.d.mts";
import type { TokenUpdateCallbackOptions } from "@client/documents/token.d.mts";
import type { Point } from "@common/_types.d.mts";
import type {
    DatabaseCreateCallbackOptions,
    DatabaseDeleteCallbackOptions,
    DatabaseOperation,
} from "@common/abstract/_types.d.mts";
import type Document from "@common/abstract/document.d.mts";
import type { ImageFilePath, TokenDisplayMode, VideoFilePath } from "@common/constants.d.mts";
import type { TokenPF2e } from "@module/canvas/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import { DifficultTerrainGrade, EnvironmentFeatureRegionBehavior, RegionDocumentPF2e } from "@scene";
import { isDefaultTokenImage } from "@scene/helpers.ts";
import { objectHasKey, sluggify } from "@util";
import * as R from "remeda";
import { ScenePF2e } from "../document.ts";
import { TokenAura } from "./aura/index.ts";
import type { DetectionModeEntry, TokenFlagsPF2e } from "./data.ts";
import type { TokenConfigPF2e } from "./sheets/token-config.ts";

class TokenDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null> extends TokenDocument<TParent> {
    declare auras: Map<string, TokenAura>;

    /** The most recently used animation for later use when a token override is reverted. */
    #lastAnimation: TokenAnimationOptions | null = null;

    /** Returns if the token is in combat, though some actors have different conditions */
    override get inCombat(): boolean {
        if (this.actor?.isOfType("party")) {
            return this.actor.members.every((a) => game.combat?.getCombatantByActor(a.id));
        }
        return super.inCombat;
    }

    /** This should be in Foundry core, but ... */
    get scene(): TParent {
        return this.parent;
    }

    /** Is this token emitting light with a negative value */
    get emitsDarkness(): boolean {
        return this.light.bright < 0;
    }

    get rulesBasedVision(): boolean {
        return !!(this.sight.enabled && this.actor?.isOfType("creature") && this.scene?.rulesBasedVision);
    }

    /** Is rules-based vision enabled, and does this token's actor have low-light vision (inclusive of darkvision)? */
    get hasLowLightVision(): boolean {
        return !!(this.rulesBasedVision && this.actor?.isOfType("creature") && this.actor.hasLowLightVision);
    }

    /** Is rules-based vision enabled, and does this token's actor have darkvision vision? */
    get hasDarkvision(): boolean {
        return !!(this.rulesBasedVision && this.actor?.isOfType("creature") && this.actor.hasDarkvision);
    }

    /** Is this token's dimensions linked to its actor's size category? */
    get linkToActorSize(): boolean {
        return this.flags.pf2e.linkToActorSize;
    }

    /** Is this token's scale locked at 1 or (for small creatures) 0.8? */
    get autoscale(): boolean {
        return this.linkToActorSize && game.pf2e.settings.tokens.autoscale && this.flags.pf2e.autoscale;
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

    /** Bounds used for mechanics, such as flanking and drawing auras */
    get mechanicalBounds(): PIXI.Rectangle {
        const bounds = this.bounds;
        if (this.width < 1) {
            const position = canvas.grid.getTopLeftPoint({
                x: bounds.x + bounds.width / 2,
                y: bounds.y + bounds.height / 2,
            });
            return new PIXI.Rectangle(
                position.x,
                position.y,
                Math.max(canvas.grid.size, bounds.width),
                Math.max(canvas.grid.size, bounds.height),
            );
        }

        return bounds;
    }

    /** The pixel-coordinate pair constituting this token's center */
    get center(): Point {
        const bounds = this.bounds;
        return {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
        };
    }

    /** The grade of difficult terrain at this token's position */
    get difficultTerrain(): DifficultTerrainGrade {
        const regions = Array.from(this.regions ?? []);
        return regions
            .map((r) =>
                r.behaviors.filter(
                    (b): b is EnvironmentFeatureRegionBehavior<RegionDocumentPF2e<NonNullable<TParent>>> =>
                        !b.disabled && b.type === "environmentFeature" && b.system.terrain.difficult > 0,
                ),
            )
            .flat()
            .reduce(
                (highest: DifficultTerrainGrade, b) =>
                    b.system.terrain.difficult > highest ? b.system.terrain.difficult : highest,
                0,
            );
    }

    /** Check actor for effects found in `CONFIG.specialStatusEffects` */
    override hasStatusEffect(statusId: string): boolean {
        if (statusId === "dead") return !!this.actor?.statuses.has("dead");

        const actor = this.actor;
        if (!actor || !game.pf2e.settings.rbv) {
            return false;
        }

        const hasCondition = objectHasKey(CONFIG.PF2E.conditionTypes, statusId) && actor.hasCondition(statusId);
        const hasEffect = () => actor.itemTypes.effect.some((e) => (e.slug ?? sluggify(e.name)) === statusId);

        return hasCondition || hasEffect();
    }

    /** Filter trackable attributes for relevance and avoidance of circular references */
    static override getTrackedAttributes(
        data: Record<string, unknown> = {},
        _path: string[] = [],
    ): TrackedAttributesDescription {
        // This method is being called with no associated actor: fill from the models
        if (_path.length === 0 && Object.keys(data).length === 0) {
            for (const [type, model] of Object.entries(game.model.Actor)) {
                if (!["character", "npc"].includes(type)) continue;
                fu.mergeObject(data, model);
            }
        }

        if (_path.length > 0) {
            return super.getTrackedAttributes(data, _path);
        }

        const patterns = {
            positive: /^(?:attributes|resources)\./,
            negative: /\b(?:rank|_?modifiers|item|classdc|dexcap|familiar|\w+hp\b)|bonus/i,
        };

        const prunedData = fu.expandObject<Record<string, unknown>>(
            Object.fromEntries(
                Object.entries(fu.flattenObject(data)).filter(
                    ([k, v]) =>
                        patterns.positive.test(k) &&
                        !patterns.negative.test(k) &&
                        !["boolean", "string"].includes(typeof v),
                ),
            ),
        );

        return super.getTrackedAttributes(prunedData, _path);
    }

    static override getTrackedAttributeChoices(
        attributes?: TrackedAttributesDescription,
    ): TrackedAttributesDescription {
        attributes ??= this.getTrackedAttributes();
        // Add stamina here because TokenDocument._getTrackedAttributesFromObject returns the first encountered
        // { value, max } property and sp is nested within the hp property
        if (game.pf2e.settings.variants.stamina) {
            attributes.bar.push(["attributes", "hp", "sp"]);
        }
        return super.getTrackedAttributeChoices(attributes);
    }

    /** Make stamina, resolve, and shield HP editable despite not being present in template.json */
    override getBarAttribute(barName: string, options?: { alternative?: string }): TokenResourceData | null {
        const attribute = super.getBarAttribute(barName, options);
        if (!attribute) return null;

        const isStaminaOrResolve =
            ["attributes.hp.sp", "resources.resolve"].includes(attribute.attribute) &&
            game.pf2e.settings.variants.stamina;
        const isSpecialResource = /^resources\.([\w-]+)/.test(attribute.attribute);
        const isShieldHP = attribute.attribute === "attributes.shield.hp" && !!this.actor?.attributes.shield?.itemId;
        if (isStaminaOrResolve || isSpecialResource || isShieldHP) {
            attribute.editable = true;
        }

        return attribute;
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this.auras = new Map();
        super._initialize(options);
    }

    /** If rules-based vision is enabled, disable manually configured vision radii */
    override prepareBaseData(): void {
        super.prepareBaseData();
        const flags = fu.mergeObject(this.flags, { pf2e: {} });
        const actor = this.actor;
        if (!actor) return;

        TokenDocumentPF2e.assignDefaultImage(this);

        // Dimensions and scale
        flags.pf2e.linkToActorSize ??= SIZE_LINKABLE_ACTOR_TYPES.has(actor.type);
        const settingEnabled = game.pf2e.settings.tokens.autoscale;
        flags.pf2e.autoscale = settingEnabled && flags.pf2e.linkToActorSize ? (flags.pf2e.autoscale ?? true) : false;
        TokenDocumentPF2e.prepareScale(this);

        // Merge token overrides from REs into this document
        const tokenOverrides = actor.synthetics.tokenOverrides;
        this.name = tokenOverrides.name ?? this.name;
        this.alpha = tokenOverrides.alpha ?? this.alpha;

        if (tokenOverrides.texture) {
            this.texture.src = tokenOverrides.texture.src;
            if ("scaleX" in tokenOverrides.texture) {
                this.texture.scaleX = tokenOverrides.texture.scaleX;
                this.texture.scaleY = tokenOverrides.texture.scaleY;
                this.flags.pf2e.autoscale = false;
            }
            this.texture.tint = tokenOverrides.texture.tint ?? this.texture.tint;
        }

        if (tokenOverrides.ring) {
            this.ring.enabled = true;
            this.ring.subject = { ...tokenOverrides.ring.subject };
            this.ring.colors = { ...tokenOverrides.ring.colors };
            this.ring.effects = tokenOverrides.ring.effects;
            // Upstream makes some decisions by inspecting the subject texture in the source source data:
            // Fake it for now until this can be addressed upstairs
            this._source.ring.subject.texture ??= this.ring.subject.texture;
        }

        if (tokenOverrides.light) {
            this.light = new foundry.data.LightData(tokenOverrides.light, { parent: this });
        }

        // Alliance coloration, appropriating core token dispositions
        const alliance = actor.system.details.alliance;
        this.disposition =
            this.disposition === CONST.TOKEN_DISPOSITIONS.SECRET
                ? CONST.TOKEN_DISPOSITIONS.SECRET
                : alliance
                  ? {
                        party: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
                        opposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
                    }[alliance]
                  : CONST.TOKEN_DISPOSITIONS.NEUTRAL;

        for (const [key, data] of actor.auras.entries()) {
            this.auras.set(key, new TokenAura({ token: this, ...fu.deepClone(data) }));
        }
    }

    /** Set vision and detection modes based on actor data */
    protected override _prepareDetectionModes(): void {
        const { actor, scene } = this;
        if (!scene?.rulesBasedVision || !actor?.isOfType("creature")) return super._prepareDetectionModes();

        // Reset detection modes if using rules-based vision
        const hasVision = actor.perception.hasVision;
        const lightPerception: DetectionModeEntry = { id: "lightPerception", enabled: hasVision, range: Infinity };
        const basicSight: DetectionModeEntry = { id: "basicSight", enabled: hasVision, range: 0 };
        this.detectionModes = [lightPerception, basicSight];

        // Reset sight defaults and set vision mode.
        // Unlike detection modes, there can only be one, and it decides how the player is currently seeing.
        const visionMode = actor.hasDarkvision ? "darkvision" : "basic";
        this.sight.attenuation = 0.1;
        this.sight.brightness = 0;
        this.sight.contrast = 0;
        this.sight.range = 0;
        this.sight.saturation = 0;
        this.sight.visionMode = visionMode;

        const visionModeDefaults = CONFIG.Canvas.visionModes[visionMode].vision.defaults;
        this.sight.brightness = visionModeDefaults.brightness ?? 0;
        this.sight.saturation = visionModeDefaults.saturation ?? 0;

        // Update basic sight and adjust saturation based on darkvision or light levels
        if (visionMode === "darkvision") {
            this.sight.range = basicSight.range = Infinity;

            if (actor.isOfType("character") && actor.flags.pf2e.colorDarkvision) {
                this.sight.saturation = 1;
            } else if (!game.user.settings.monochromeDarkvision) {
                this.sight.saturation = 0;
            }
        }

        if (actor.perception.senses.has("see-invisibility")) {
            this.detectionModes.push({ id: "seeInvisibility", enabled: true, range: Infinity });
        }

        const tremorsense = actor.perception.senses.get("tremorsense");
        if (tremorsense) {
            this.detectionModes.push({ id: "feelTremor", enabled: true, range: tremorsense.range });
        }

        if (!actor.hasCondition("deafened")) {
            const range = scene?.flags.pf2e.hearingRange ?? Infinity;
            this.detectionModes.push({ id: "hearing", enabled: true, range });
        }
    }

    /** Synchronize the token image with the actor image if the token does not currently have an image */
    static assignDefaultImage(token: TokenDocumentPF2e | PrototypeTokenPF2e<ActorPF2e>): void {
        const actor = token.actor;
        if (!actor) return;

        // Always override token images if in Nath mode
        if (game.pf2e.settings.tokens.nathMode && isDefaultTokenImage(token)) {
            token.texture.src = ((): ImageFilePath | VideoFilePath => {
                switch (actor.alliance) {
                    case "party":
                        return "systems/pf2e/icons/default-icons/alternatives/nath/ally.webp";
                    case "opposition":
                        return "systems/pf2e/icons/default-icons/alternatives/nath/enemy.webp";
                    default:
                        return token.texture.src ?? CONST.DEFAULT_TOKEN;
                }
            })();
        } else if (isDefaultTokenImage(token)) {
            token.texture.src = actor._source.img;
        }
    }

    /** Set a TokenData instance's dimensions from actor data. Static so actors can use for their prototypes */
    static prepareScale(token: TokenDocumentPF2e | PrototypeTokenPF2e<ActorPF2e>): void {
        if (!token.flags.pf2e.autoscale) return;
        const absoluteScale = token.actor?.size === "sm" ? 0.8 : 1;
        const mirrorX = token.texture.scaleX < 0 ? -1 : 1;
        token.texture.scaleX = mirrorX * absoluteScale;
        const mirrorY = token.texture.scaleY < 0 ? -1 : 1;
        token.texture.scaleY = mirrorY * absoluteScale;
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
                    content: game.i18n.format("PF2E.InitiativeIsNow", { name: this.name, value: initiative }),
                },
            ]);
        }
    }

    /**
     * Use actor updates (real or otherwise) that propagate down to ephemeral token changes  to provoke canvas object
     * re-rendering.
     */
    simulateUpdate(updates: Record<string, unknown> = {}): void {
        // If this scene isn't in view nor in focus, skip all later checks
        // This method is called for every scene a linked actor's token is present in
        if (!this.scene?.isInFocus && !this.scene?.isView) return;

        // Reinitialize vision if the actor's senses were updated directly
        const initializeVision =
            !!this.scene?.isView &&
            this.sight.enabled &&
            Object.keys(fu.flattenObject(updates)).some((k) => k.startsWith("system.perception.senses"));
        if (initializeVision) canvas.perception.update({ initializeVision });

        const preUpdate = this.toObject(false);
        const preUpdateAuras = Array.from(this.auras.values()).map((a) => R.omit(a, ["appearance", "token"]));
        this.reset();
        const postUpdate = this.toObject(false);
        const postUpdateAuras = Array.from(this.auras.values()).map((a) => R.omit(a, ["appearance", "token"]));
        const tokenChanges = fu.diffObject<DeepPartial<this["_source"]>>(preUpdate, postUpdate);
        if (!this.actorLink && this.autoscale && fu.hasProperty(updates, "system.traits.size")) {
            tokenChanges.texture = fu.mergeObject(tokenChanges, R.pick(this.texture, ["scaleX", "scaleY"]));
        }

        if (this.scene?.isView && Object.keys(tokenChanges).length > 0) {
            const tokenOverrides = this.actor?.synthetics.tokenOverrides ?? {};
            const animation = tokenChanges.texture?.src ? (tokenOverrides.animation ?? this.#lastAnimation ?? {}) : {};
            this.#lastAnimation = R.isDeepEqual(animation, this.#lastAnimation ?? {})
                ? null
                : (tokenOverrides.animation ?? null);
            this.object?._onUpdate(tokenChanges, { broadcast: false, animation }, game.user.id);
        }

        // Assess the full diff using `diffObject`: additions, removals, and changes
        const aurasChanged = () => !!this.scene?.isInFocus && !R.isDeepEqual(preUpdateAuras, postUpdateAuras);

        if ("disposition" in tokenChanges || aurasChanged()) {
            this.scene?.checkAuras?.();
        }
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Ensure that actors that don't allow synthetics are linked. */
    protected override _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (this.actor?.allowSynthetics === false && data.actorLink === false) {
            this._source.actorLink = true;
        }
        return super._preCreate(data, options, user);
    }

    /** Ensure that actors that don't allow synthetics stay linked. */
    protected override _preUpdate(
        data: Record<string, unknown>,
        options: TokenUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (this.actor?.allowSynthetics === false && (data.actorLink ?? this.actorLink) === false) {
            data.actorLink = true;
        }
        return super._preUpdate(data, options, user);
    }

    /** Toggle token hiding if this token's actor is a loot actor */
    protected override _onCreate(data: this["_source"], options: DatabaseCreateCallbackOptions, userId: string): void {
        super._onCreate(data, options, userId);
        if (game.user.id === userId && this.actor?.isOfType("loot")) {
            this.actor.toggleTokenHiding();
        }
    }

    protected override _onUpdate(
        changed: DeepPartial<this["_source"]>,
        options: TokenUpdateCallbackOptions,
        userId: string,
    ): void {
        // Possibly re-render encounter tracker if token's `displayName` property has changed
        const tokenSetsNameVisibility = game.pf2e.settings.tokens.nameVisibility;
        if ("displayName" in changed && tokenSetsNameVisibility && this.combatant) {
            ui.combat.render();
        }

        // Workaround for actor-data preparation issue: release token if this is made unlinked while controlled
        if (changed.actorLink === false && this.rendered && this.object?.controlled) {
            this.object.release();
        }

        return super._onUpdate(changed, options, userId);
    }

    protected override _onRelatedUpdate(
        update?: { _id?: string; [key: string]: unknown } | { _id?: string; [key: string]: unknown }[],
        operation?: Partial<DatabaseOperation<Document | null>>,
    ): void {
        super._onRelatedUpdate(update, operation);
        if (!(this.scene instanceof ScenePF2e)) return;

        // Simulate update to detect and fulfill canvas-affecting actor changes
        const updates = Array.isArray(update) ? update : [update];
        this.simulateUpdate(updates[0]);

        // Follow up any actor (or descendant document thereof) modification with a size synchronization
        const actor = this.actor;
        if (!actor?.isOwner) return;
        const activeGM = game.users.activeGM; // Let the active GM take care of updates if available
        if ((!activeGM || game.user === activeGM) && this.linkToActorSize && actor.system.traits?.size) {
            const dimensions = actor.system.traits.size.tokenDimensions;
            if (dimensions.width !== this.width || dimensions.height !== this.height) {
                this.scene.syncTokenDimensions(this, dimensions);
            }
        }
    }

    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
        super._onDelete(options, userId);
        if (!this.actor) return;

        if (this.isLinked) {
            // Check area effects, removing any from this token's actor if the actor has no other tokens in the scene
            if (!this.scene?.tokens.some((t) => t.actor === this.actor)) this.actor.checkAreaEffects();
        } else {
            // Actor#_onDelete won't be called, so unregister effects in the effects tracker
            for (const effect of this.actor.itemTypes.effect) {
                game.pf2e.effectTracker.unregister(effect);
            }
        }
    }
}

interface TokenDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null> extends TokenDocument<TParent> {
    flags: TokenFlagsPF2e;
    regions: Set<RegionDocumentPF2e<NonNullable<TParent>>>;
    get actor(): ActorPF2e<this | null> | null;
    get combatant(): CombatantPF2e<EncounterPF2e, this> | null;
    get object(): TokenPF2e<this> | null;
    get sheet(): TokenConfigPF2e;
}

export { TokenDocumentPF2e };
