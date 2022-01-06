import { isCycle } from "@item/container/helpers";
import { DicePF2e } from "@scripts/dice";
import { ItemPF2e, SpellcastingEntryPF2e, PhysicalItemPF2e, ContainerPF2e, WeaponPF2e } from "@item";
import type { ConditionPF2e, ArmorPF2e } from "@item";
import { ConditionData, ItemSourcePF2e, ItemType, PhysicalItemSource } from "@item/data";
import { ErrorPF2e, isObject, objectHasKey } from "@util";
import type { ActiveEffectPF2e } from "@module/active-effect";
import { LocalizePF2e } from "@module/system/localize";
import { ItemTransfer } from "./item-transfer";
import { RuleElementPF2e } from "@module/rules/rule-element/base";
import { ActorSheetPF2e } from "./sheet/base";
import { hasInvestedProperty } from "@item/data/helpers";
import { SaveData, VisionLevel, VisionLevels } from "./creature/data";
import { BaseActorDataPF2e, BaseTraitsData, RollOptionFlags } from "./data/base";
import { ActorDataPF2e, ActorSourcePF2e, ModeOfBeing, SaveType } from "./data";
import { TokenDocumentPF2e } from "@scene";
import { UserPF2e } from "@module/user";
import { ConditionType } from "@item/condition/data";
import { MigrationRunner, MigrationList } from "@module/migration";
import { Size } from "@module/data";
import { ActorSizePF2e } from "./data/size";
import { ActorSpellcasting } from "./spellcasting";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { Statistic } from "@system/statistic";
import { TokenEffect } from "./token-effect";

interface ActorConstructorContextPF2e extends DocumentConstructionContext<ActorPF2e> {
    pf2e?: {
        ready?: boolean;
    };
}

/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 * @category Actor
 */
class ActorPF2e extends Actor<TokenDocumentPF2e> {
    /** Has this actor gone through at least one cycle of data preparation? */
    private initialized?: true;

    /** A separate collection of owned physical items for convenient access */
    physicalItems!: Collection<Embedded<PhysicalItemPF2e>>;

    /** A separate collection of owned spellcasting entries for convenience */
    spellcasting!: ActorSpellcasting;

    /** Rule elements drawn from owned items */
    rules!: RuleElementPF2e[];

    saves?: Record<SaveType, Statistic>;

    constructor(data: PreCreate<ActorSourcePF2e>, context: ActorConstructorContextPF2e = {}) {
        if (context.pf2e?.ready) {
            super(data, context);
            this.physicalItems ??= new Collection();
            this.spellcasting ??= new ActorSpellcasting(this);
            this.rules ??= [];
        } else {
            mergeObject(context, { pf2e: { ready: true } });
            const ActorConstructor = CONFIG.PF2E.Actor.documentClasses[data.type];
            return ActorConstructor ? new ActorConstructor(data, context) : new ActorPF2e(data, context);
        }
    }

    /** The compendium source ID of the actor **/
    get sourceId(): ActorUUID | null {
        return this.data.flags.core?.sourceId ?? null;
    }

    /** The recorded schema version of this actor, updated after each data migration */
    get schemaVersion(): number | null {
        return Number(this.data.data.schema?.version) || null;
    }

    get hitPoints(): HitPointsSummary | null {
        const { hp } = this.data.data.attributes;
        if (!hp) return null;

        return {
            value: hp.value,
            max: hp.max,
            temp: hp.temp,
            negativeHealing: hp.negativeHealing,
        };
    }

    get traits(): Set<string> {
        return new Set(this.data.data.traits.traits.value);
    }

    get level(): number {
        return this.data.data.details.level.value;
    }

    get size(): Size {
        return this.data.data.traits.size.value;
    }

    /**
     * Whether the actor can see, given its token placement in the current scene.
     * A meaningful implementation is found in `CreaturePF2e`.
     */
    get canSee(): boolean {
        return true;
    }

    get modeOfBeing(): ModeOfBeing {
        const traits = this.traits;
        return traits.has("undead") ? "undead" : traits.has("construct") ? "construct" : "living";
    }

    get visionLevel(): VisionLevel {
        return VisionLevels.NORMAL;
    }

    get rollOptions(): RollOptionFlags {
        return this.data.flags.pf2e.rollOptions;
    }

    /** Add effect icons from effect items and rule elements */
    override get temporaryEffects(): TemporaryEffect[] {
        const tokenIcon = (data: ConditionData) => {
            const folder = CONFIG.PF2E.statusEffects.effectsIconFolder;
            const statusName = data.data.hud.statusName;
            return `${folder}${statusName}.webp`;
        };
        const conditionTokenIcons = this.itemTypes.condition
            .filter((condition) => condition.fromSystem)
            .map((condition) => tokenIcon(condition.data));
        const conditionTokenEffects = Array.from(new Set(conditionTokenIcons)).map((icon) => new TokenEffect(icon));

        const effectTokenEffects = this.itemTypes.effect
            .filter((effect) => effect.data.data.tokenIcon?.show)
            .map((effect) => new TokenEffect(effect.img));

        return super.temporaryEffects
            .concat(this.data.data.tokenEffects)
            .concat(conditionTokenEffects)
            .concat(effectTokenEffects);
    }

    /** Get the actor's held shield. Meaningful implementation in `CreaturePF2e`'s override. */
    get heldShield(): Embedded<ArmorPF2e> | null {
        return null;
    }

    /** Most actor types can host rule elements */
    get canHostRuleElements(): boolean {
        return true;
    }

    /** Get roll options from this actor's effects, traits, and other properties */
    getSelfRollOptions(prefix: "self" | "target" | "origin" = "self"): Set<string> {
        const rollOptions = Object.keys(this.rollOptions.all).flatMap((o) =>
            o.startsWith("self:") ? o.replace(/^self/, prefix) : []
        );
        return new Set(rollOptions);
    }

    /** Create a clone of this actor to recalculate its statistics with temporary roll options included */
    getContextualClone(rollOptions: string[]): this {
        const rollOptionsAll = rollOptions.reduce(
            (options: Record<string, boolean>, option) => ({ ...options, [option]: true }),
            {}
        );
        return this.clone({ flags: { pf2e: { rollOptions: { all: rollOptionsAll } } } });
    }

    /**
     * As of Foundry 0.8: All subclasses of ActorPF2e need to use this factory method rather than having their own
     * overrides, since Foundry itself will call `ActorPF2e.create` when a new actor is created from the sidebar.
     */
    static override async createDocuments<A extends ConstructorOf<ActorPF2e>>(
        this: A,
        data: PreCreate<InstanceType<A>["data"]["_source"]>[] = [],
        context: DocumentModificationContext<InstanceType<A>> = {}
    ): Promise<InstanceType<A>[]> {
        for (const datum of data) {
            // Set wounds, advantage, and display name visibility
            const merged = mergeObject(datum, {
                permission: datum.permission ?? { default: CONST.DOCUMENT_PERMISSION_LEVELS.NONE },
                token: {
                    flags: {
                        // Sync token dimensions with actor size?
                        pf2e: {
                            linkToActorSize: !["hazard", "loot"].includes(datum.type),
                        },
                    },
                },
            });

            // Set default token dimensions for familiars and vehicles
            const dimensionMap: Record<string, number> = { familiar: 0.5, vehicle: 2 };
            merged.token.height ??= dimensionMap[datum.type] ?? 1;
            merged.token.width ??= merged.token.height;

            switch (merged.type) {
                case "character":
                case "familiar":
                    merged.permission.default = CONST.DOCUMENT_PERMISSION_LEVELS.LIMITED;
                    // Default characters and their minions to having tokens with vision and an actor link
                    merged.token.actorLink = true;
                    merged.token.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
                    merged.token.vision = true;
                    break;
                case "loot":
                    // Make loot actors linked, interactable and neutral disposition
                    merged.token.actorLink = true;
                    merged.permission.default = CONST.DOCUMENT_PERMISSION_LEVELS.LIMITED;
                    merged.token.disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
                    break;
                case "npc":
                    if (!merged.flags?.core?.sourceId) {
                        merged.token.disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
                    }
                    break;
                default:
                    merged.token.disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
            }
        }

        return super.createDocuments(data, context) as Promise<InstanceType<A>[]>;
    }

    override _initialize(): void {
        super._initialize();
        this.initialized = true;
    }

    /** Prepare token data derived from this actor, refresh Effects Panel */
    override prepareData(): void {
        super.prepareData();

        this.preparePrototypeToken();
        if (this.initialized) {
            const tokenDocs = this.getActiveTokens(false, true);
            for (const tokenDoc of tokenDocs) {
                tokenDoc.prepareData({ fromActor: true });
            }
            if (canvas.ready) {
                const thisTokenIsControlled = tokenDocs.some((t) => !!t.object?.isControlled);
                if (game.user.character === this || thisTokenIsControlled) {
                    game.pf2e.effectPanel.refresh();
                }
            }
        }
    }

    /** Prepare baseline ephemeral data applicable to all actor types */
    override prepareBaseData(): void {
        super.prepareBaseData();
        this.data.data.tokenEffects = [];
        this.data.data.autoChanges = {};

        const notTraits: BaseTraitsData | undefined = this.data.data.traits;
        if (notTraits?.size) notTraits.size = new ActorSizePF2e(notTraits.size);

        // Setup the basic structure of pf2e flags with roll options
        this.data.flags.pf2e = mergeObject({ rollOptions: { all: {} } }, this.data.flags.pf2e ?? {});
    }

    /** Prepare the physical-item collection on this actor, item-sibling data, and rule elements */
    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();
        const physicalItems: Embedded<PhysicalItemPF2e>[] = this.items.filter(
            (item) => item instanceof PhysicalItemPF2e
        );
        this.physicalItems = new Collection(physicalItems.map((item) => [item.id, item]));

        const spellcastingEntries: Embedded<SpellcastingEntryPF2e>[] = this.items.filter(
            (item) => item instanceof SpellcastingEntryPF2e
        );
        this.spellcasting = new ActorSpellcasting(this, spellcastingEntries);

        // Prepare data among owned items as well as actor-data preparation performed by items
        for (const item of this.items) {
            item.prepareSiblingData?.();
            item.prepareActorData?.();
        }

        // Rule elements
        this.rules = this.prepareRuleElements();
    }

    protected prepareRuleElements(): RuleElementPF2e[] {
        return this.items.contents
            .flatMap((item) => item.prepareRuleElements())
            .filter((rule) => !rule.ignored)
            .sort((elementA, elementB) => elementA.priority - elementB.priority);
    }

    override prepareDerivedData(): void {
        // Record stored traits as roll options
        for (const trait of this.traits) {
            this.rollOptions.all[`self:${trait}`] = true;
            this.rollOptions.all[`self:trait:${trait}`] = true;
        }
    }

    /** Set defaults for this actor's prototype token */
    private preparePrototypeToken() {
        // Synchronize the token image with the actor image, if the token does not currently have an image
        const tokenImgIsDefault =
            this.data.token.img === (this.data.constructor as typeof BaseActorDataPF2e).DEFAULT_ICON;
        const tokenImgIsActorImg = this.data.token.img === this.img;
        if (tokenImgIsDefault && !tokenImgIsActorImg) {
            this.data.token.update({ img: this.img });
        }

        // Disable manually-configured vision settings on the prototype token
        if (canvas.sight?.rulesBasedVision) {
            for (const property of ["brightSight", "dimSight"] as const) {
                this.data.token[property] = this.data.token._source[property] = 0;
            }
            this.data.token.sightAngle = this.data.token._source.sightAngle = 360;
        }
        this.data.token.flags = mergeObject(
            { pf2e: { linkToActorSize: !["hazard", "loot"].includes(this.type) } },
            this.data.token.flags
        );
        TokenDocumentPF2e.prepareSize(this.data.token, this);
    }

    getStrikeDescription(weapon: WeaponPF2e) {
        const flavor = {
            description: "PF2E.Strike.Default.Description",
            criticalSuccess: "PF2E.Strike.Default.CriticalSuccess",
            success: "PF2E.Strike.Default.Success",
        };
        const traits = weapon.traits;
        if (traits.has("unarmed")) {
            flavor.description = "PF2E.Strike.Unarmed.Description";
            flavor.success = "PF2E.Strike.Unarmed.Success";
        } else if ([...traits].some((trait) => trait.startsWith("thrown-") || trait === "combination")) {
            flavor.description = "PF2E.Strike.Combined.Description";
            flavor.success = "PF2E.Strike.Combined.Success";
        } else if (weapon.isMelee) {
            flavor.description = "PF2E.Strike.Melee.Description";
            flavor.success = "PF2E.Strike.Melee.Success";
        } else {
            flavor.description = "PF2E.Strike.Ranged.Description";
            flavor.success = "PF2E.Strike.Ranged.Success";
        }
        return flavor;
    }

    /**
     * Get all tokens linked to this actor in all scenes
     * @returns An array of TokenDocuments
     */
    getAllTokens(): TokenDocument[] {
        const tokens: TokenDocument[] = [];
        for (const scene of game.scenes) {
            for (const token of scene.tokens) {
                if (token.isLinked && token.actor?.id === this.id) {
                    tokens.push(token);
                }
            }
        }
        return tokens;
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */
    /* -------------------------------------------- */

    /**
     * Roll a Save Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus.
     * Will be removed once non-creature saves are implemented properly.
     */
    rollSave(event: JQuery.Event, saveName: SaveType) {
        const save: SaveData = this.data.data.saves[saveName];
        const parts = ["@mod", "@itemBonus"];
        const flavor = `${game.i18n.localize(CONFIG.PF2E.saves[saveName])} Save Check`;

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: {
                mod: save.value,
            },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /**
     * Roll a Attribute Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollAttribute(event: JQuery.Event, attributeName: string) {
        if (!objectHasKey(this.data.data.attributes, attributeName)) {
            throw ErrorPF2e(`Unrecognized attribute "${attributeName}"`);
        }

        const attribute = this.data.data.attributes[attributeName];
        if (!attribute) return;
        const parts = ["@mod", "@itemBonus"];
        const configAttributes = CONFIG.PF2E.attributes;
        if (objectHasKey(configAttributes, attributeName)) {
            const flavor = `${game.i18n.localize(configAttributes[attributeName])} Check`;
            // Call the roll helper utility
            DicePF2e.d20Roll({
                event,
                parts,
                data: { mod: attribute.value },
                title: flavor,
                speaker: ChatMessage.getSpeaker({ actor: this }),
            });
        }
    }

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     *
     * @param roll The chat entry which contains the roll data
     * @param multiplier A damage multiplier to apply to the rolled damage.
     */
    static async applyDamage(
        roll: JQuery,
        multiplier: number,
        attribute = "attributes.hp",
        modifier = 0,
        { shieldID }: { shieldID?: string } = {}
    ) {
        const tokens = canvas.tokens.controlled.filter((token) => token.actor);
        if (tokens.length === 0) {
            ui.notifications.error(game.i18n.localize("PF2E.UI.errorTargetToken"));
            return false;
        }

        const value = Math.floor(parseFloat(roll.find(".dice-total").text()) * multiplier) + modifier;
        const messageSender = roll.find(".message-sender").text();
        const flavorText = roll.find(".flavor-text").text();
        for (const token of tokens) {
            const { actor } = token;
            if (!actor?.data.data.attributes.hp) continue;
            const shield =
                attribute === "attributes.shield"
                    ? shieldID
                        ? actor.itemTypes.armor.find((armor) => armor.isShield && armor.id === shieldID) ?? null
                        : actor.heldShield
                    : null;
            if (attribute === "attributes.shield" && shield?.isBroken) {
                const warnings = LocalizePF2e.translations.PF2E.Actions.RaiseAShield;
                ui.notifications.warn(
                    game.i18n.format(warnings.ShieldIsBroken, { actor: token.name, shield: shield.name })
                );
            }

            const shieldFlavor =
                attribute === "attributes.shield" && shield?.isBroken === false
                    ? game.i18n.format("PF2E.UI.applyDamage.shieldActive", { shield: shield.name })
                    : game.i18n.localize("PF2E.UI.applyDamage.shieldInActive");
            const shieldDamage =
                attribute === "attributes.shield" && shield?.isBroken === false && value > 0
                    ? `(${Math.max(0, value - shield.hardness)})`
                    : "";
            const appliedResult =
                value > 0
                    ? game.i18n.localize("PF2E.UI.applyDamage.damaged") + value + shieldDamage
                    : game.i18n.localize("PF2E.UI.applyDamage.healed") + value * -1;
            const modifiedByGM = modifier !== 0 ? `Modified by GM: ${modifier < 0 ? "-" : "+"}${modifier}` : "";
            const by = game.i18n.localize("PF2E.UI.applyDamage.by");
            const hitpoints = game.i18n.localize("PF2E.HitPointsHeader").toLowerCase();
            const message = await renderTemplate("systems/pf2e/templates/chat/damage/result-message.html", {
                flavorText,
                by,
                messageSender,
                modifiedByGM,
                actor: token.name,
                shieldFlavor,
                appliedResult,
                hitpoints,
            });
            actor.modifyTokenAttribute(attribute, value * -1, true, true, shield).then(() => {
                const data: any = {
                    user: game.user.id,
                    speaker: { alias: token.name },
                    content: message,
                    type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
                };
                if (game.settings.get("pf2e", "metagame.secretDamage") && !token?.actor?.hasPlayerOwner) {
                    data.whisper = ChatMessage.getWhisperRecipients("GM");
                }
                ChatMessage.create(data);
            });
        }
        return true;
    }

    async _setShowUnpreparedSpells(entryId: string, spellLevel: number) {
        if (!entryId || !spellLevel) {
            // TODO: Consider throwing an error on null inputs in the future.
            return;
        }

        const spellcastingEntry = this.items.get(entryId);
        if (!(spellcastingEntry instanceof SpellcastingEntryPF2e)) {
            return;
        }

        if (
            spellcastingEntry.data.data?.prepared?.value === "prepared" &&
            spellcastingEntry.data.data?.showUnpreparedSpells?.value === false
        ) {
            if (CONFIG.debug.hooks === true) {
                console.log(`PF2e DEBUG | Updating spellcasting entry ${entryId} set showUnpreparedSpells to true.`);
            }

            const displayLevels: Record<number, boolean> = {};
            displayLevels[spellLevel] = true;
            await spellcastingEntry.update({
                "data.showUnpreparedSpells.value": true,
                "data.displayLevels": displayLevels,
            });
        }
    }

    isLootableBy(user: UserPF2e) {
        return this.canUserModify(user, "update");
    }

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for game systems to override this behavior and deploy special logic.
     * @param attribute The attribute path
     * @param value     The target attribute value
     * @param isDelta   Whether the number represents a relative change (true) or an absolute change (false)
     * @param isBar     Whether the new value is part of an attribute bar, or just a direct value
     */
    override async modifyTokenAttribute(
        attribute: string,
        value: number,
        isDelta = false,
        isBar = true,
        selectedShield: Embedded<ArmorPF2e> | null = null
    ): Promise<this> {
        if (!Number.isInteger(value)) {
            return Promise.reject();
        }

        if (["attributes.shield", "attributes.hp"].includes(attribute)) {
            const updateActorData: any = {};
            const shield = selectedShield ?? this.heldShield;
            let updatedShieldHp = -1;
            if (attribute === "attributes.shield") {
                if (shield?.isBroken === false) {
                    let shieldHitPoints = shield.hitPoints.value;
                    if (isDelta && value < 0) {
                        // shield block
                        value = Math.min(shield.hardness + value, 0); // value is now a negative modifier (or zero), taking into account hardness
                        if (value < 0) {
                            attribute = "attributes.hp"; // update the actor's hit points after updating the shield
                            shieldHitPoints = Math.clamped(shield.hitPoints.value + value, 0, shield.hitPoints.max);
                        }
                    } else {
                        shieldHitPoints = Math.clamped(value, 0, shield.hitPoints.max);
                    }
                    shield.data.data.hp.value = shieldHitPoints; // ensure the shield item has the correct state in prepareData() on the first pass after Actor#update
                    updateActorData["data.attributes.shield.value"] = shieldHitPoints;
                    // actor update is necessary to properly refresh the token HUD resource bar
                    updatedShieldHp = shieldHitPoints;
                } else if ("shield" in this.data.data.attributes && this.data.data.attributes.shield.hp.max) {
                    // NPC with no shield but pre-existing shield data
                    const shieldData = this.data.data.attributes.shield;
                    const currentHitPoints = Number(shieldData.hp.value);
                    const maxHitPoints = Number(shieldData.hp.max);
                    let shieldHitPoints = currentHitPoints;
                    if (isDelta && value < 0) {
                        // shield block
                        value = Math.min(Number(shieldData.hardness) + value, 0); // value is now a negative modifier (or zero), taking into account hardness
                        if (value < 0) {
                            attribute = "attributes.hp"; // update the actor's hit points after updating the shield
                            shieldHitPoints = Math.clamped(currentHitPoints + value, 0, maxHitPoints);
                        }
                    } else {
                        shieldHitPoints = Math.clamped(value, 0, maxHitPoints);
                    }
                    updateActorData["data.attributes.shield.hp.value"] = shieldHitPoints;
                } else if (isDelta) {
                    attribute = "attributes.hp"; // actor has no shield, apply the specified delta value to actor instead
                }
            }

            if (attribute === "attributes.hp" && "hp" in this.data.data.attributes) {
                const { hp } = this.data.data.attributes;
                if (!hp) return this;
                const sp = "sp" in this.data.data.attributes ? this.data.data.attributes.sp : { value: 0 };
                if (isDelta) {
                    if (value < 0) {
                        const { update, delta } = this.calculateHealthDelta({ hp, sp, delta: value });
                        value = delta;
                        for (const [k, v] of Object.entries(update)) {
                            updateActorData[k] = v;
                        }
                    }
                    value = Math.clamped(Number(hp.value) + value, 0, hp.max);
                }
                value = Math.clamped(value, 0, hp.max);
                updateActorData["data.attributes.hp.value"] = value;

                // Mark the actor as dead if the setting is enabled
                if (value === 0) {
                    const deadAtZero = game.settings.get("pf2e", "automation.actorsDeadAtZero");
                    if (this.type === "npc" && ["npcsOnly", "both"].includes(deadAtZero)) {
                        game.combats.active?.combatants
                            .find((c) => c.actor === this && !c.data.defeated)
                            ?.toggleDefeated();
                    }
                }
            }

            if (shield && updatedShieldHp >= 0) {
                updateActorData.items = [
                    {
                        _id: shield.id,
                        data: {
                            hp: {
                                value: updatedShieldHp,
                            },
                        },
                    },
                ];
            }

            return this.update(updateActorData);
        }
        return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }

    /**
     * Moves an item to another actor's inventory.
     * @param targetActor Instance of actor to be receiving the item.
     * @param item        Instance of the item being transferred.
     * @param quantity    Number of items to move.
     * @param containerId Id of the container that will contain the item.
     * @return The target item, if the transfer is successful, or otherwise `null`.
     */
    async transferItemToActor(
        targetActor: ActorPF2e,
        item: Embedded<ItemPF2e>,
        quantity: number,
        containerId?: string
    ): Promise<Embedded<PhysicalItemPF2e> | null> {
        if (!(item instanceof PhysicalItemPF2e)) {
            throw ErrorPF2e("Only physical items (with quantities) can be transfered between actors");
        }
        const container = targetActor.physicalItems.get(containerId ?? "");
        if (!(!container || container instanceof ContainerPF2e)) {
            throw ErrorPF2e("containerId refers to a non-container");
        }

        // Loot transfers can be performed by non-owners when a GM is online */
        const gmMustTransfer = (source: ActorPF2e, target: ActorPF2e): boolean => {
            const bothAreOwned = source.isOwner && target.isOwner;
            const sourceIsOwnedOrLoot = source.isLootableBy(game.user);
            const targetIsOwnedOrLoot = target.isLootableBy(game.user);
            return !bothAreOwned && sourceIsOwnedOrLoot && targetIsOwnedOrLoot;
        };
        if (gmMustTransfer(this, targetActor)) {
            const source = { tokenId: this.token?.id, actorId: this.id, itemId: item.id };
            const target = { tokenId: targetActor.token?.id, actorId: targetActor.id };
            await new ItemTransfer(source, target, quantity, container?.id).request();
            return null;
        }

        if (!this.canUserModify(game.user, "update")) {
            ui.notifications.error(game.i18n.localize("PF2E.ErrorMessage.CantMoveItemSource"));
            return null;
        }
        if (!targetActor.canUserModify(game.user, "update")) {
            ui.notifications.error(game.i18n.localize("PF2E.ErrorMessage.CantMoveItemDestination"));
            return null;
        }

        // Limit the amount of items transfered to how many are actually available.
        quantity = Math.min(quantity, item.quantity);

        // Remove the item from the source if we are transferring all of it; otherwise, subtract the appropriate number.
        const newQuantity = item.quantity - quantity;
        const removeFromSource = newQuantity < 1;

        if (removeFromSource) {
            await item.delete();
        } else {
            await item.update({ "data.quantity.value": newQuantity });
        }

        const newItemData = item.toObject();
        newItemData.data.quantity.value = quantity;
        newItemData.data.equipped.value = false;
        if (hasInvestedProperty(newItemData)) {
            const traits: Set<string> = item.traits;
            newItemData.data.invested.value = traits.has("invested") ? false : null;
        }

        return targetActor.addToInventory(newItemData, container);
    }

    async addToInventory(
        itemData: PhysicalItemSource,
        container?: Embedded<ContainerPF2e>
    ): Promise<Embedded<PhysicalItemPF2e> | null> {
        // Stack with an existing item if possible
        const stackItem = this.findStackableItem(this, itemData);
        if (stackItem && stackItem.data.type !== "backpack") {
            const stackQuantity = stackItem.quantity + itemData.data.quantity.value;
            await stackItem.update({ "data.quantity.value": stackQuantity });
            return stackItem;
        }

        // Otherwise create a new item
        const result = await ItemPF2e.create(itemData, { parent: this });
        if (!result) {
            return null;
        }
        const movedItem = this.physicalItems.get(result.id);
        if (!movedItem) return null;
        await this.stowOrUnstow(movedItem, container);

        return movedItem;
    }

    /** Find an item already owned by the actor that can stack with the to-be-transferred item */
    private findStackableItem(actor: ActorPF2e, itemData: ItemSourcePF2e): Embedded<PhysicalItemPF2e> | null {
        const testItem = new ItemPF2e(itemData);
        const stackCandidates = actor.physicalItems.filter(
            (stackCandidate) =>
                !stackCandidate.isInContainer &&
                testItem instanceof PhysicalItemPF2e &&
                stackCandidate.isStackableWith(testItem)
        );
        if (stackCandidates.length === 0) {
            return null;
        } else if (stackCandidates.length > 1) {
            // Prefer stacking with unequipped items
            const notEquipped = stackCandidates.filter((item) => !item.isEquipped);
            return notEquipped.length > 0 ? notEquipped[0] : stackCandidates[0];
        } else {
            return stackCandidates[0];
        }
    }

    /**
     * Moves an item into the inventory into or out of a container.
     * @param actor       Actor whose inventory should be edited.
     * @param getItem     Lambda returning the item.
     * @param containerId Id of the container that will contain the item.
     */
    async stowOrUnstow(item: Embedded<PhysicalItemPF2e>, container?: Embedded<ContainerPF2e>): Promise<void> {
        if (container && !isCycle(item.id, container.id, [item.data])) {
            await item.update({
                "data.containerId.value": container.id,
                "data.equipped.value": false,
            });
        } else {
            await item.update({ "data.containerId.value": null });
        }
    }

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for game systems to override this behavior and deploy special logic.
     */
    private calculateHealthDelta(args: { hp: { value: number; temp: number }; sp: { value: number }; delta: number }) {
        const update: any = {};
        const { hp, sp } = args;
        let { delta } = args;
        if (hp.temp + delta >= 0) {
            update["data.attributes.hp.temp"] = hp.temp + delta;
            delta = 0;
        } else {
            update["data.attributes.hp.temp"] = 0;
            delta = hp.temp + delta;
        }
        if (game.settings.get("pf2e", "staminaVariant") > 0 && delta < 0) {
            if (sp.value + delta >= 0) {
                update["data.attributes.sp.value"] = sp.value + delta;
                delta = 0;
            } else {
                update["data.attributes.sp.value"] = 0;
                delta = sp.value + delta;
            }
        }
        return {
            update,
            delta,
        };
    }

    static getActionGraphics(actionType: string, actionCount?: number): { imageUrl: ImagePath; actionGlyph: string } {
        let actionImg: number | string = 0;
        if (actionType === "action") actionImg = actionCount ?? 1;
        else if (actionType === "reaction") actionImg = "reaction";
        else if (actionType === "free") actionImg = "free";
        else if (actionType === "passive") actionImg = "passive";
        const graphics: Record<string, { imageUrl: ImagePath; actionGlyph: string }> = {
            1: { imageUrl: "systems/pf2e/icons/actions/OneAction.webp", actionGlyph: "A" },
            2: { imageUrl: "systems/pf2e/icons/actions/TwoActions.webp", actionGlyph: "D" },
            3: { imageUrl: "systems/pf2e/icons/actions/ThreeActions.webp", actionGlyph: "T" },
            free: { imageUrl: "systems/pf2e/icons/actions/FreeAction.webp", actionGlyph: "F" },
            reaction: { imageUrl: "systems/pf2e/icons/actions/Reaction.webp", actionGlyph: "R" },
            passive: { imageUrl: "systems/pf2e/icons/actions/Passive.webp", actionGlyph: "" },
        };
        if (objectHasKey(graphics, actionImg)) {
            return {
                imageUrl: graphics[actionImg].imageUrl,
                actionGlyph: graphics[actionImg].actionGlyph,
            };
        } else {
            return {
                imageUrl: "systems/pf2e/icons/actions/Empty.webp",
                actionGlyph: "",
            };
        }
    }

    /**
     * Obtain roll options relevant to rolls of the given types (for use in passing to the `roll` functions on statistics).
     * Roll option in this case is a predication property used for filtering.
     */
    getRollOptions(domains: string[]): string[] {
        const rollOptions = this.data.flags.pf2e.rollOptions;
        const results = new Set<string>();
        for (const domain of domains) {
            for (const [key, value] of Object.entries(rollOptions[domain] ?? {})) {
                if (value) results.add(key);
            }
        }

        return [...results];
    }

    /* -------------------------------------------- */
    /* Conditions                                   */
    /* -------------------------------------------- */

    /**
     * Get a condition on this actor, returning:
     *   - the highest-valued if there are multiple of a valued condition
     *   - the longest-lasting if there are multiple of a condition with a duration
     *   - the last applied if any are present and are neither valued nor with duration
     *   - otherwise `null`
     * @param slug the slug of a core condition (subject to change when user-created conditions are introduced)
     * @param [options.all=false] return all conditions of the requested type in the order described above
     */
    getCondition(
        slug: ConditionType,
        { all }: { all: boolean } = { all: false }
    ): Embedded<ConditionPF2e>[] | Embedded<ConditionPF2e> | null {
        const conditions = this.itemTypes.condition
            .filter((condition) => condition.slug === slug)
            .sort((conditionA, conditionB) => {
                const [valueA, valueB] = [conditionA.value ?? 0, conditionB.value ?? 0] as const;
                const [durationA, durationB] = [conditionA.duration ?? 0, conditionB.duration ?? 0] as const;

                return valueA > valueB
                    ? 1
                    : valueB < valueB
                    ? -1
                    : durationA > durationB
                    ? 1
                    : durationA < durationB
                    ? -1
                    : 0;
            });

        return all ? conditions : conditions[0] ?? null;
    }

    /**
     * Does this actor have the provided condition?
     * @param slug The slug of the queried condition
     */
    hasCondition(slug: ConditionType): boolean {
        return this.itemTypes.condition.some((condition) => condition.slug === slug);
    }

    /** Decrease the value of condition or remove it entirely */
    async decreaseCondition(
        conditionSlug: ConditionType | Embedded<ConditionPF2e>,
        { forceRemove }: { forceRemove: boolean } = { forceRemove: false }
    ): Promise<void> {
        // Find a valid matching condition if a slug was passed
        const condition = typeof conditionSlug === "string" ? this.getCondition(conditionSlug) : conditionSlug;
        if (!condition) return;

        const value = typeof condition.value === "number" ? Math.max(condition.value - 1, 0) : null;
        if (value !== null && !forceRemove) {
            await game.pf2e.ConditionManager.updateConditionValue(condition.id, this, value);
        } else {
            await game.pf2e.ConditionManager.removeConditionFromActor(condition.id, this);
        }
    }

    /** Increase a valued condition, or create a new one if not present */
    async increaseCondition(
        conditionSlug: ConditionType | Embedded<ConditionPF2e>,
        { min, max = Number.MAX_SAFE_INTEGER }: { min?: number | null; max?: number | null } = {}
    ): Promise<void> {
        const existing = typeof conditionSlug === "string" ? this.getCondition(conditionSlug) : conditionSlug;
        if (existing) {
            const conditionValue = (() => {
                if (existing.value === null) return null;
                return min && max
                    ? Math.clamped(existing.value + 1, min, max)
                    : max
                    ? Math.min(existing.value + 1, max)
                    : existing.value + 1;
            })();
            if (conditionValue === null || conditionValue > (max ?? 0)) return;
            await game.pf2e.ConditionManager.updateConditionValue(existing.id, this, conditionValue);
        } else if (typeof conditionSlug === "string") {
            const conditionSource = game.pf2e.ConditionManager.getCondition(conditionSlug).toObject();
            const conditionValue =
                typeof conditionSource?.data.value.value === "number" && min && max
                    ? Math.min(Math.max(min, conditionSource.data.value.value), max)
                    : null;
            conditionSource.data.value.value = conditionValue;
            await game.pf2e.ConditionManager.addConditionToActor(conditionSource, this);
        }
    }

    /** Toggle a condition as present or absent. If a valued condition is toggled on, it will be set to a value of 1. */
    async toggleCondition(conditionSlug: ConditionType): Promise<void> {
        if (this.hasCondition(conditionSlug)) {
            await this.decreaseCondition(conditionSlug, { forceRemove: true });
        } else {
            await this.increaseCondition(conditionSlug);
        }
    }

    /** If necessary, migrate this actor before importing */
    override async importFromJSON(json: string): Promise<this> {
        const source: unknown = JSON.parse(json);
        if (!this.canImportJSON(source)) return this;

        const processed = this.collection.fromCompendium(source, { addFlags: false });
        processed._id = this.id;
        const data = new ActorPF2e.schema(processed);
        this.data.update(data.toObject(), { recursive: false });

        await MigrationRunner.ensureSchemaVersion(
            this,
            MigrationList.constructFromVersion(this.schemaVersion ?? undefined),
            { preCreate: false }
        );

        return this.update(this.toObject(), { diff: false, recursive: false, keepId: true });
    }

    /** Determine whether a requested JSON import can be performed */
    canImportJSON(source: unknown): source is ActorSourcePF2e {
        // The import came from
        if (!(isObject<ActorSourcePF2e>(source) && isObject(source.data))) return false;

        const sourceSchemaVersion = source.data?.schema?.version ?? null;
        const worldSchemaVersion = MigrationRunnerBase.LATEST_SCHEMA_VERSION;
        if (foundry.utils.isNewerVersion(sourceSchemaVersion, worldSchemaVersion)) {
            // Refuse to import if the schema version on the document is higher than the system schema verson;
            ui.notifications.error(
                game.i18n.format("PF2E.ErrorMessage.CantImportTooHighVersion", {
                    sourceName: game.i18n.localize("DOCUMENT.Actor"),
                    sourceSchemaVersion,
                    worldSchemaVersion,
                })
            );
            return false;
        }

        return true;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Ensure imported actors are current on their schema version */
    protected override async _preCreate(
        data: PreDocumentId<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        await super._preCreate(data, options, user);
        if (!options.parent) {
            await MigrationRunner.ensureSchemaVersion(this, MigrationList.constructFromVersion());
        }
    }

    /** Show floaty text when applying damage or healing */
    protected override async _preUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: ActorUpdateContext<this>,
        user: UserPF2e
    ): Promise<void> {
        const changedHP = changed.data?.attributes?.hp;
        const currentHP = this.hitPoints;
        if (typeof changedHP?.value === "number" && currentHP) {
            const hpChange = changedHP.value - currentHP.value;
            const levelChanged = !!changed.data?.details && "level" in changed.data.details;
            if (hpChange !== 0 && !levelChanged) options.damageTaken = hpChange;
        }

        await super._preUpdate(changed, options, user);
    }

    protected override _onUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: ActorUpdateContext<this>,
        userId: string
    ): void {
        super._onUpdate(changed, options, userId);
        const hideFromUser =
            !this.hasPlayerOwner && !game.user.isGM && game.settings.get("pf2e", "metagame.secretDamage");
        if (options.damageTaken && !hideFromUser) {
            const tokens = super.getActiveTokens();
            for (const token of tokens) {
                token.showFloatyText(options.damageTaken);
            }
        }
    }

    /** Unregister all effects possessed by this actor */
    protected override _onDelete(options: DocumentModificationContext, userId: string): void {
        for (const effect of this.itemTypes.effect) {
            game.pf2e.effectTracker.unregister(effect);
        }
        super._onDelete(options, userId);
    }

    /** As of at least Foundry 9.238, the `Actor` classes skips updating token effect icons on unlinked actors */
    protected override _onEmbeddedDocumentChange(embeddedName: "Item" | "ActiveEffect"): void {
        super._onEmbeddedDocumentChange(embeddedName);
        this.token?.object?.drawEffects();
    }
}

interface ActorPF2e extends Actor<TokenDocumentPF2e> {
    readonly data: ActorDataPF2e;
    _sheet: ActorSheetPF2e<ActorPF2e> | ActorSheet<ActorPF2e, ItemPF2e> | null;

    get sheet(): ActorSheetPF2e<ActorPF2e> | ActorSheet<ActorPF2e, ItemPF2e>;

    get itemTypes(): {
        [K in ItemType]: Embedded<InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][K]>>[];
    };

    /** See implementation in class */
    createEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        data: PreCreate<foundry.data.ActiveEffectSource>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: "Item",
        data: PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ItemPF2e[]>;
    createEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;

    /** See implementation in class */
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect",
        updateData: EmbeddedDocumentUpdateData<ActiveEffectPF2e>[],
        options?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: "Item",
        updateData: EmbeddedDocumentUpdateData<ItemPF2e>[],
        options?: DocumentModificationContext
    ): Promise<ItemPF2e[]>;
    updateEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        updateData: EmbeddedDocumentUpdateData<ActiveEffectPF2e | ItemPF2e>[],
        options?: DocumentModificationContext
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]>;

    getCondition(conditionType: ConditionType, { all }: { all: true }): Embedded<ConditionPF2e>[];
    getCondition(conditionType: ConditionType, { all }: { all: false }): Embedded<ConditionPF2e> | null;
    getCondition(conditionType: ConditionType): Embedded<ConditionPF2e> | null;
    getCondition(
        conditionType: ConditionType,
        { all }: { all: boolean }
    ): Embedded<ConditionPF2e>[] | Embedded<ConditionPF2e> | null;

    getFlag(scope: string, key: string): any;
    getFlag(scope: "core", key: "sourceId"): string | undefined;
    getFlag(scope: "pf2e", key: "rollOptions.all.target:flatFooted"): boolean;
}

export interface HitPointsSummary {
    value: number;
    max: number;
    temp: number;
    negativeHealing: boolean;
}

export interface ActorUpdateContext<T extends ActorPF2e> extends DocumentUpdateContext<T> {
    damageTaken?: number;
}

export { ActorPF2e };
