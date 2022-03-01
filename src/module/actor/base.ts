import { isCycle } from "@item/container/helpers";
import { DicePF2e } from "@scripts/dice";
import { ItemPF2e, SpellcastingEntryPF2e, PhysicalItemPF2e, ContainerPF2e, WeaponPF2e } from "@item";
import { ArmorPF2e, type ConditionPF2e } from "@item";
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
import { ActorDataPF2e, ActorSourcePF2e, ActorType, ModeOfBeing, SaveType } from "./data";
import { TokenDocumentPF2e } from "@scene";
import { UserPF2e } from "@module/user";
import { ConditionSlug } from "@item/condition/data";
import { MigrationRunner, MigrationList } from "@module/migration";
import { Size } from "@module/data";
import { ActorSizePF2e } from "./data/size";
import { ActorSpellcasting } from "./spellcasting";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { Statistic } from "@system/statistic";
import { TokenEffect } from "./token-effect";
import { RuleElementSynthetics } from "@module/rules";
import { ChatMessagePF2e } from "@module/chat-message";
import { TokenPF2e } from "@module/canvas";
import { ModifierAdjustment } from "@module/modifiers";
import { EquippedData, ItemCarryType } from "@item/physical/data";
import { isEquipped } from "../item/physical/usage";
import { ActorDimensions } from "./types";
import { CombatantPF2e } from "@module/encounter";

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

    synthetics!: RuleElementSynthetics;

    saves?: { [K in SaveType]?: Statistic };

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

    /** Shortcut to system-data attributes */
    get attributes(): this["data"]["data"]["attributes"] {
        return this.data.data.attributes;
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
     * With the exception of vehicles, actor heights aren't specified. For the purpose of three-dimensional
     * token-distance measurement, however, the system will generally treat actors as cubes.
     */
    get dimensions(): ActorDimensions {
        const { size } = this.data.data.traits;
        return {
            length: size.length,
            width: size.width,
            height: Math.min(size.length, size.width),
        };
    }

    /**
     * Whether the actor can see, given its token placement in the current scene.
     * A meaningful implementation is found in `CreaturePF2e`.
     */
    get canSee(): boolean {
        return true;
    }

    /** Whether this actor can execute actions: meaningful implementations are found in `CreaturePF2e`. */
    get canAct(): boolean {
        return true;
    }

    /** Whether this actor can attack: meaningful implementations are found in `CreaturePF2e` and `HazardPF2e`. */
    get canAttack(): boolean {
        return false;
    }

    get modeOfBeing(): ModeOfBeing {
        const { traits } = this;
        return traits.has("undead") ? "undead" : traits.has("construct") ? "construct" : "living";
    }

    get visionLevel(): VisionLevel {
        return VisionLevels.NORMAL;
    }

    get rollOptions(): RollOptionFlags {
        return this.data.flags.pf2e.rollOptions;
    }

    /** Get the actor's held shield. Meaningful implementation in `CreaturePF2e`'s override. */
    get heldShield(): Embedded<ArmorPF2e> | null {
        return null;
    }

    /** Most actor types can host rule elements */
    get canHostRuleElements(): boolean {
        return true;
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

    /** A means of checking this actor's type without risk of circular import references */
    isOfType<T extends ActorType>(
        ...types: T[]
    ): this is InstanceType<ConfigPF2e["PF2E"]["Actor"]["documentClasses"][T]> {
        return types.some((t) => this.data.type === t);
    }

    /** Whether this actor is an ally of the provided actor */
    isAllyOf(actor: ActorPF2e): boolean {
        return this.hasPlayerOwner === actor.hasPlayerOwner;
    }

    /** Get roll options from this actor's effects, traits, and other properties */
    getSelfRollOptions(prefix: "self" | "target" | "origin" = "self"): string[] {
        const { rollOptions } = this;
        return Object.keys(rollOptions.all).flatMap((o) =>
            o.startsWith("self:") && rollOptions.all[o] ? o.replace(/^self/, prefix) : []
        );
    }

    /** The actor's reach: a meaningful implementation is found in `CreaturePF2e` and `HazardPF2e`. */
    getReach(_options: { action?: "interact" | "attack" }): number {
        return 0;
    }

    /** Create a clone of this actor to recalculate its statistics with temporary roll options included */
    getContextualClone(rollOptions: string[]): this {
        const rollOptionsAll = rollOptions.reduce(
            (options: Record<string, boolean>, option) => ({ ...options, [option]: true }),
            {}
        );
        return this.clone({ flags: { pf2e: { rollOptions: { all: rollOptionsAll } } } }, { keepId: true });
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

    protected override _initialize(): void {
        super._initialize();
        this.initialized = true;

        // Send any accrued warnings to the console
        this.synthetics.preparationWarnings.flush();
    }

    /** Prepare token data derived from this actor, refresh Effects Panel */
    override prepareData(): void {
        super.prepareData();

        this.preparePrototypeToken();
        if (this.initialized && canvas.ready) {
            const thisTokenIsControlled = this.getActiveTokens(false).some((t) => !!t.isControlled);
            if (game.user.character === this || thisTokenIsControlled) {
                game.pf2e.effectPanel.refresh();
            }
        }
    }

    /** Prepare baseline ephemeral data applicable to all actor types */
    override prepareBaseData(): void {
        super.prepareBaseData();
        this.data.data.tokenEffects = [];
        this.data.data.autoChanges = {};
        this.data.data.attributes.flanking = { canFlank: false, canGangUp: [], flankable: false, flatFootable: false };

        const notTraits: BaseTraitsData | undefined = this.data.data.traits;
        if (notTraits?.size) notTraits.size = new ActorSizePF2e(notTraits.size);

        // Setup the basic structure of pf2e flags with roll options
        const defaultOptions = { [`self:type:${this.type}`]: true };
        this.data.flags.pf2e = mergeObject({ rollOptions: { all: defaultOptions } }, this.data.flags.pf2e ?? {});
        this.setEncounterRollOptions();

        const preparationWarnings: Set<string> = new Set();

        this.synthetics = {
            damageDice: {},
            modifierAdjustments: {},
            multipleAttackPenalties: {},
            rollNotes: {},
            senses: [],
            statisticsModifiers: {},
            strikeAdjustments: [],
            strikes: [],
            striking: {},
            weaponPotency: {},
            preparationWarnings: {
                add: (warning: string) => preparationWarnings.add(warning),
                flush: foundry.utils.debounce(() => {
                    for (const warning of preparationWarnings) {
                        console.warn(warning);
                    }
                    preparationWarnings.clear();
                }, 10), // 10ms also handles separate module executions
            },
        };
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

    /** Collect all sources of modifiers for statistics */
    protected prepareSynthetics(): void {
        // Rule elements
        for (const rule of this.rules.filter((r) => !r.ignored)) {
            try {
                rule.beforePrepareData?.();
            } catch (error) {
                // Ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onBeforePrepareData on rule element ${rule}.`, error);
            }
        }

        // Conditions
        const conditions = this.itemTypes.condition
            .filter((c) => c.data.flags.pf2e?.condition && c.data.data.active)
            .map((c) => c.data);

        const { statisticsModifiers } = this.synthetics;
        for (const [selector, modifiers] of game.pf2e.ConditionManager.getConditionModifiers(conditions)) {
            const syntheticModifiers = (statisticsModifiers[selector] ??= []);
            syntheticModifiers.push(...modifiers.map((m) => () => m));
        }
    }

    /** Set traits as roll options */
    override prepareDerivedData(): void {
        const { rollOptions } = this;
        for (const trait of this.traits) {
            rollOptions.all[`self:trait:${trait}`] = true;
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
        if (canvas.sight?.rulesBasedVision && ["character", "familiar"].includes(this.type)) {
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

    /** If there is an active encounter, set roll options for it and this actor's participant */
    setEncounterRollOptions(): void {
        const encounter = game.ready ? game.combat : null;
        const participants = encounter?.combatants.contents ?? [];
        if (!(encounter?.started && participants.some((c) => c.actor === this && typeof c.initiative === "number"))) {
            return;
        }

        const rollOptionsAll = this.rollOptions.all;
        rollOptionsAll[`encounter:round:${encounter.round}`] = true;
        rollOptionsAll[`encounter:turn:${encounter.turn + 1}`] = true;
        rollOptionsAll["self:participant:own-turn"] = encounter.combatant?.actor === this;

        const thisCombatant = participants.find((c): c is Embedded<CombatantPF2e<this>> => c.actor === this)!;
        const rank = participants.indexOf(thisCombatant) + 1;
        rollOptionsAll[`self:participant:initiative:rank:${rank}`] = true;
    }

    getModifierAdjustments(selectors: string[], slug: string | null): ModifierAdjustment[] {
        return Array.from(
            new Set(
                selectors
                    .flatMap((s) => this.synthetics.modifierAdjustments[s] ?? [])
                    .filter((a) => [a.slug, null].includes(slug))
            )
        );
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
        if (!(isObject(attribute) && "value" in attribute)) return;

        const parts = ["@mod", "@itemBonus"];
        const configAttributes = CONFIG.PF2E.attributes;
        if (isObject(attribute) && objectHasKey(configAttributes, attributeName)) {
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
     * @param damage The amount of damage inflicted
     * @param token The applicable token for this actor
     * @param shieldBlockRequest Whether the user has toggled the Shield Block button
     */
    async applyDamage(damage: number, token: TokenPF2e, shieldBlockRequest = false): Promise<void> {
        const { hitPoints } = this;
        if (!hitPoints) return;
        damage = Math.trunc(damage); // Round damage and healing (negative values) toward zero

        // Calculate damage to hit points and shield
        const translations = LocalizePF2e.translations.PF2E.Actor.ApplyDamage;
        const { attributes } = this;
        const actorShield = "shield" in attributes ? attributes.shield : null;
        const shieldBlock =
            actorShield && shieldBlockRequest
                ? ((): boolean => {
                      if (actorShield.broken) {
                          const warnings = LocalizePF2e.translations.PF2E.Actions.RaiseAShield;
                          ui.notifications.warn(
                              game.i18n.format(warnings.ShieldIsBroken, { actor: token.name, shield: actorShield.name })
                          );
                          return false;
                      } else if (!actorShield.raised) {
                          ui.notifications.warn(game.i18n.format(translations.ShieldNotRaised, { actor: token.name }));
                          return false;
                      } else {
                          return true;
                      }
                  })()
                : false;

        const shieldHardness = shieldBlock ? actorShield?.hardness ?? 0 : 0;
        const absorbedDamage = Math.min(shieldHardness, Math.abs(damage));
        const shieldDamage = shieldBlock ? Math.min(actorShield?.hp.value ?? 0, Math.abs(damage) - absorbedDamage) : 0;

        const hpUpdate = this.calculateHealthDelta({
            hp: hitPoints,
            sp: this.data.type === "character" ? this.data.data.attributes.sp : undefined,
            delta: damage - absorbedDamage,
        });
        const hpDamage = hpUpdate.totalApplied;

        // Make updates
        if (shieldDamage > 0) {
            const shield = (() => {
                const item = this.items.get(actorShield?.itemId ?? "");
                return item instanceof ArmorPF2e ? item : null;
            })();
            await shield?.update(
                { "data.hp.value": shield.hitPoints.value - shieldDamage },
                { render: hpDamage === 0 }
            );
        }
        if (hpDamage !== 0) {
            await this.update(hpUpdate.updates);
        }
        if (this.hitPoints?.value === 0) {
            const deadAtZero = game.settings.get("pf2e", "automation.actorsDeadAtZero");
            if (this.type === "npc" && ["npcsOnly", "both"].includes(deadAtZero)) {
                await game.combat?.combatants.find((c) => c.actor === this && !c.data.defeated)?.toggleDefeated();
            }
        }

        // Send chat message
        const hpStatement = ((): string => {
            // This would be a nested ternary, except prettier thoroughly mangles it
            if (damage === 0) return translations.TakesNoDamage;
            if (damage > 0) {
                return absorbedDamage > 0
                    ? hpDamage > 0
                        ? translations.DamagedForNShield
                        : translations.ShieldAbsorbsAll
                    : translations.DamagedForN;
            }
            return hpDamage < 0 ? translations.HealedForN : translations.AtFullHealth;
        })();

        const updatedShield = "shield" in this.attributes ? this.attributes.shield : null;
        const shieldStatement =
            updatedShield && shieldDamage > 0
                ? updatedShield.broken
                    ? translations.ShieldDamagedForNBroken
                    : updatedShield.destroyed
                    ? translations.ShieldDamagedForNDestroyed
                    : translations.ShieldDamagedForN
                : null;
        const statements = [hpStatement, shieldStatement]
            .filter((s): s is string => !!s)
            .map((s) =>
                game.i18n.format(s, { actor: token.name, hpDamage: Math.abs(hpDamage), absorbedDamage, shieldDamage })
            )
            .join(" ");

        await ChatMessagePF2e.create({
            speaker: { alias: token.name, token: token.id ?? null },
            content: `<p>${statements}</p>`,
            type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
            whisper:
                game.settings.get("pf2e", "metagame.secretDamage") && !token.actor?.hasPlayerOwner
                    ? ChatMessagePF2e.getWhisperRecipients("GM").map((u) => u.id)
                    : [],
        });
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
        newItemData.data.equipped.carryType = "worn";
        if (hasInvestedProperty(newItemData)) {
            newItemData.data.invested.value = item.traits.has("invested") ? false : null;
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
     * Changes the carry type of an item (held/worn/stowed/etc) and/or regrips/reslots
     * @param item       The item
     * @param carryType  Location to be set to
     * @param handsHeld  Number of hands being held
     * @param inSlot     Whether the item is in the slot or not. Equivilent to "equipped" previously
     */
    async adjustCarryType(item: Embedded<PhysicalItemPF2e>, carryType: ItemCarryType, handsHeld = 0, inSlot = false) {
        if (carryType === "stowed") {
            // since there's still an "items need to be in a tree" view, we
            // need to actually put the item in a container when it's stowed.
            const container = item.actor.itemTypes.backpack.filter((b) => !isCycle(item.id, b.id, [item.data]))[0];
            await item.update({
                "data.containerId.value": container?.id ?? "",
                "data.equipped.carryType": "stowed",
                "data.equipped.handsHeld": 0,
                "data.equipped.inSlot": item.data.usage.type === "worn" && item.data.usage.where ? false : undefined,
            });
        } else {
            const equipped: EquippedData = {
                carryType: carryType,
                handsHeld: carryType === "held" ? handsHeld : 0,
                inSlot: item.data.usage.where ? inSlot : undefined,
            };

            const updates = [];

            if (isEquipped(item.data.usage, equipped) && item instanceof ArmorPF2e && item.isArmor) {
                // see if they have another set of armor equipped
                const wornArmors = this.itemTypes.armor.filter((a) => a !== item && a.isEquipped && a.isArmor);
                for (const armor of wornArmors) {
                    updates.push({ _id: armor.id, "data.equipped.inSlot": false });
                }
            }

            updates.push({
                _id: item.id,
                "data.containerId.value": null,
                "data.equipped": equipped,
            });
            await this.updateEmbeddedDocuments("Item", updates);
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
                "data.equipped.carryType": "stowed",
                "data.equipped.handsHeld": 0,
                "data.equipped.inSlot": false,
            });
        } else {
            await item.update({
                "data.containerId.value": null,
                "data.equipped.carryType": "worn",
                "data.equipped.handsHeld": 0,
                "data.equipped.inSlot": false,
            });
        }
    }

    /** Determine actor updates for applying damage/healing across temporary hit points, stamina, and then hit points */
    private calculateHealthDelta(args: {
        hp: { max: number; value: number; temp: number };
        sp?: { max: number; value: number };
        delta: number;
    }) {
        const updates: Record<string, number> = {};
        const { hp, sp, delta } = args;
        const appliedToTemp = ((): number => {
            if (!hp.temp || delta <= 0) return 0;
            const applied = Math.min(hp.temp, delta);
            updates["data.attributes.hp.temp"] = Math.max(hp.temp - applied, 0);

            return applied;
        })();

        const appliedToSP = ((): number => {
            const staminaEnabled = !!sp && game.settings.get("pf2e", "staminaVariant");
            if (!staminaEnabled || delta <= 0) return 0;
            const remaining = delta - appliedToTemp;
            const applied = Math.min(sp.value, remaining);
            updates["data.attributes.sp.value"] = Math.max(sp.value - applied, 0);

            return applied;
        })();

        const appliedToHP = ((): number => {
            const remaining = delta - appliedToTemp - appliedToSP;
            const applied = remaining > 0 ? Math.min(hp.value, remaining) : Math.max(hp.value - hp.max, remaining);
            updates["data.attributes.hp.value"] = Math.max(hp.value - applied, 0);

            return applied;
        })();
        const totalApplied = appliedToTemp + appliedToSP + appliedToHP;

        return { updates, totalApplied };
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
     * Retrieve all roll option from the requested domains. Micro-optimized in an excessively verbose for-loop.
     * @param domains The domains of discourse from which to pull options. Always includes the "all" domain.
     */
    getRollOptions(domains: string[] = []): string[] {
        const withAll = Array.from(new Set(["all", ...domains]));
        const { rollOptions } = this;
        const toReturn: Set<string> = new Set();

        for (const domain of withAll) {
            for (const [option, value] of Object.entries(rollOptions[domain] ?? {})) {
                if (value) toReturn.add(option);
            }
        }

        return Array.from(toReturn);
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
        slug: ConditionSlug,
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
    hasCondition(slug: ConditionSlug): boolean {
        return this.itemTypes.condition.some((condition) => condition.slug === slug);
    }

    /** Decrease the value of condition or remove it entirely */
    async decreaseCondition(
        conditionSlug: ConditionSlug | Embedded<ConditionPF2e>,
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
        conditionSlug: ConditionSlug | Embedded<ConditionPF2e>,
        { min, max = Number.MAX_SAFE_INTEGER }: { min?: number | null; max?: number | null } = {}
    ): Promise<void> {
        const existing = typeof conditionSlug === "string" ? this.getCondition(conditionSlug) : conditionSlug;
        if (existing) {
            const conditionValue = (() => {
                if (existing.value === null) return null;
                if (min && max && min > max) throw ErrorPF2e(`min (${min}) > max (${max})`);
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
                    ? Math.clamped(conditionSource.data.value.value, min, max)
                    : null;
            conditionSource.data.value.value = conditionValue;
            await game.pf2e.ConditionManager.addConditionToActor(conditionSource, this);
        }
    }

    /** Toggle a condition as present or absent. If a valued condition is toggled on, it will be set to a value of 1. */
    async toggleCondition(conditionSlug: ConditionSlug): Promise<void> {
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

        source._id = this.id;
        const processed = this.collection.fromCompendium(source, { addFlags: false, keepId: true });
        const data = new (this.constructor as typeof ActorPF2e).schema(processed);

        const { folder, sort, permission } = this.data;
        this.data.update(foundry.utils.mergeObject(data.toObject(), { folder, sort, permission }), {
            recursive: false,
        });

        await MigrationRunner.ensureSchemaVersion(
            this,
            MigrationList.constructFromVersion(this.schemaVersion ?? undefined),
            { preCreate: false }
        );

        return this.update(this.toObject(), { diff: false, recursive: false });
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
            const currentVersion = this.schemaVersion || undefined;
            await MigrationRunner.ensureSchemaVersion(this, MigrationList.constructFromVersion(currentVersion));
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

    protected override _onEmbeddedDocumentChange(embeddedName: "Item" | "ActiveEffect"): void {
        super._onEmbeddedDocumentChange(embeddedName);
        (async () => {
            // As of at least Foundry 9.238, the `Actor` classes skips updating token effect icons on unlinked actors
            await this.token?.object?.drawEffects();
            // Foundry doesn't determine whether a token needs to be redrawn when its actor's embedded items change
            for (const tokenDoc of this.getActiveTokens(true, true)) {
                tokenDoc.onActorItemChange();
            }
        })();

        // Send any accrued warnings to the console
        this.synthetics.preparationWarnings.flush();
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

    getCondition(conditionType: ConditionSlug, { all }: { all: true }): Embedded<ConditionPF2e>[];
    getCondition(conditionType: ConditionSlug, { all }: { all: false }): Embedded<ConditionPF2e> | null;
    getCondition(conditionType: ConditionSlug): Embedded<ConditionPF2e> | null;
    getCondition(
        conditionType: ConditionSlug,
        { all }: { all: boolean }
    ): Embedded<ConditionPF2e>[] | Embedded<ConditionPF2e> | null;
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
