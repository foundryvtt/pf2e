import { DamageDicePF2e } from "../modifiers";
import { isCycle } from "@item/container/helpers";
import { DicePF2e } from "@scripts/dice";
import { ItemPF2e, SpellcastingEntryPF2e, PhysicalItemPF2e, ContainerPF2e, SpellPF2e, WeaponPF2e } from "@item";
import type { ConditionPF2e, ArmorPF2e } from "@item";
import { ConditionData, ItemSourcePF2e, ItemType, PhysicalItemSource } from "@item/data";
import { ErrorPF2e, objectHasKey } from "@util";
import type { ActiveEffectPF2e } from "@module/active-effect";
import { LocalizePF2e } from "@module/system/localize";
import { ItemTransfer } from "./item-transfer";
import { RuleElementPF2e, TokenEffect } from "@module/rules/rule-element";
import { ActorSheetPF2e } from "./sheet/base";
import { ChatMessagePF2e } from "@module/chat-message";
import { hasInvestedProperty } from "@item/data/helpers";
import { SaveData, VisionLevel, VisionLevels } from "./creature/data";
import { BaseActorDataPF2e, BaseTraitsData, RollOptionFlags } from "./data/base";
import { ActorDataPF2e, ActorSourcePF2e, ModeOfBeing, SaveType } from "./data";
import { TokenDocumentPF2e } from "@scene";
import { UserPF2e } from "@module/user";
import { isCreatureData } from "./data/helpers";
import { ConditionType } from "@item/condition/data";
import { MigrationRunner, Migrations } from "@module/migration";
import { Size } from "@module/data";
import { ActorSizePF2e } from "./data/size";
import { ActorSpellcasting } from "./spellcasting";

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
    private initialized: true | undefined;

    /** A separate collection of owned physical items for convenient access */
    physicalItems!: Collection<Embedded<PhysicalItemPF2e>>;

    /** A separate collection of owned spellcasting entries for convenience */
    spellcasting!: ActorSpellcasting;

    /** Rule elements drawn from owned items */
    rules!: RuleElementPF2e[];

    constructor(data: PreCreate<ActorSourcePF2e>, context: ActorConstructorContextPF2e = {}) {
        if (context.pf2e?.ready) {
            super(data, context);
            this.physicalItems ??= new Collection();
            this.spellcasting ??= new ActorSpellcasting(this);
            this.rules ??= [];
            this.initialized = true;
        } else {
            if (data.type) {
                const ready = { pf2e: { ready: true } };
                return new CONFIG.PF2E.Actor.documentClasses[data.type](data, { ...ready, ...context });
            }
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

    /**
     * As of Foundry 0.8: All subclasses of ActorPF2e need to use this factory method rather than having their own
     * overrides, since Foundry itself will call `ActorPF2e.create` when a new actor is created from the sidebar.
     */
    static override async createDocuments<A extends ConstructorOf<ActorPF2e>>(
        this: A,
        data: PreCreate<InstanceType<A>["data"]["_source"]>[] = [],
        context: DocumentModificationContext = {}
    ): Promise<InstanceType<A>[]> {
        if (game.settings.get("pf2e", "defaultTokenSettings")) {
            for (const datum of data) {
                // Set wounds, advantage, and display name visibility
                const nameMode = game.settings.get("pf2e", "defaultTokenSettingsName");
                const barMode = game.settings.get("pf2e", "defaultTokenSettingsBar");
                const merged = mergeObject(datum, {
                    permission: datum.permission ?? { default: CONST.ENTITY_PERMISSIONS.NONE },
                    token: {
                        bar1: { attribute: "attributes.hp" }, // Default Bar 1 to Wounds
                        displayName: nameMode, // Default display name to be on owner hover
                        displayBars: barMode, // Default display bars to be on owner hover
                        flags: {
                            // Sync token dimensions with actor size?
                            pf2e: {
                                linkToActorSize: !["hazard", "loot"].includes(datum.type ?? ""),
                            },
                        },
                    },
                });

                // Set default token dimensions for familiars and vehicles
                const dimensionMap: Record<string, number> = { familiar: 0.5, vehicle: 2 };
                merged.token.height ??= dimensionMap[datum.type!] ?? 1;
                merged.token.width ??= merged.token.height;

                switch (merged.type) {
                    case "character":
                    case "familiar":
                        merged.permission.default = CONST.ENTITY_PERMISSIONS.LIMITED;
                        // Default characters and their minions to having tokens with vision and an actor link
                        merged.token.actorLink = true;
                        merged.token.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
                        merged.token.vision = true;
                        break;
                    case "loot":
                        // Make loot actors linked, interactable and neutral disposition
                        merged.token.actorLink = true;
                        merged.permission.default = CONST.ENTITY_PERMISSIONS.LIMITED;
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
        }

        return super.createDocuments(data, context) as Promise<InstanceType<A>[]>;
    }

    /** Prepare token data derived from this actor, refresh Effects Panel */
    override prepareData(): void {
        super.prepareData();
        const tokens = canvas.ready ? this.getActiveTokens() : [];
        if (this.initialized) {
            for (const token of this.getActiveTokens()) {
                token.document.prepareData({ fromActor: true });
            }
        }
        if (tokens.some((token) => token.isControlled)) {
            game.pf2e.effectPanel.refresh();
        }
    }

    /** Prepare baseline ephemeral data applicable to all actor types */
    override prepareBaseData(): void {
        super.prepareBaseData();
        this.data.data.tokenEffects = [];
        this.data.data.autoChanges = {};
        this.preparePrototypeToken();

        const notTraits: BaseTraitsData | undefined = this.data.data.traits;
        if (notTraits?.size) notTraits.size = new ActorSizePF2e(notTraits.size);

        // Setup the basic structure of pf2e flags with roll options
        this.data.flags.pf2e = mergeObject({ rollOptions: { all: {} } }, this.data.flags.pf2e ?? {});
    }

    /** Prepare the physical-item collection on this actor, item-sibling data, and rule elements */
    override prepareEmbeddedEntities(): void {
        super.prepareEmbeddedEntities();
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
        this.rules = this.items.contents
            .flatMap((item) => item.prepareRuleElements())
            .filter((rule) => !rule.ignored)
            .sort((elementA, elementB) => elementA.priority - elementB.priority);
    }

    /** Prevent character importers from creating martial items */
    override createEmbeddedDocuments(
        embeddedName: "ActiveEffect" | "Item",
        data: PreCreate<foundry.data.ActiveEffectSource>[] | PreCreate<ItemSourcePF2e>[],
        context: DocumentModificationContext = {}
    ): Promise<ActiveEffectPF2e[] | ItemPF2e[]> {
        const includesMartialItems = data.some(
            (datum: PreCreate<foundry.data.ActiveEffectSource> | PreCreate<ItemSourcePF2e>) =>
                "type" in datum && datum.type === "martial"
        );
        if (includesMartialItems) {
            throw ErrorPF2e("Martial items are pending removal from the system and may no longer be created.");
        }

        return super.createEmbeddedDocuments(embeddedName, data, context) as Promise<ActiveEffectPF2e[] | ItemPF2e[]>;
    }

    /** Set defaults for this actor's prototype token */
    private preparePrototypeToken() {
        // Synchronize the token image with the actor image, if the token does not currently have an image
        const useSystemTokenSettings = game.settings.get("pf2e", "defaultTokenSettings");
        const tokenImgIsDefault =
            this.data.token.img === (this.data.constructor as typeof BaseActorDataPF2e).DEFAULT_ICON;
        const tokenImgIsActorImg = this.data.token.img === this.img;
        if (useSystemTokenSettings && tokenImgIsDefault && !tokenImgIsActorImg) {
            this.data.token.update({ img: this.img });
        }

        // Disable manually-configured vision settings on the prototype token
        if (canvas.sight?.rulesBasedVision) {
            this.data.token.brightSight = 0;
            this.data.token.dimSight = 0;
            this.data.token.sightAngle = 360;
        }
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
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
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
                mod: save.value - (save.item ?? 0),
                itemBonus: save.item ?? 0,
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
            const actor = token.actor!;
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

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     */
    static async rollSave(ev: JQuery.ClickEvent, item: Embedded<ItemPF2e>): Promise<void> {
        if (canvas.tokens.controlled.length > 0) {
            const save = $(ev.currentTarget).attr("data-save") as SaveType;
            const dc = Number($(ev.currentTarget).attr("data-dc"));
            const itemTraits = item.data.data.traits?.value;
            for (const t of canvas.tokens.controlled) {
                const actor = t.actor;
                if (!actor) return;
                if (actor.data.data.saves[save]?.roll) {
                    const options = actor.getRollOptions(["all", "saving-throw", save]);
                    if (item instanceof SpellPF2e) {
                        options.push("magical", "spell");
                        if (Object.keys(item.data.data.damage.value).length > 0) {
                            options.push("damaging-effect");
                        }
                    }
                    if (itemTraits) {
                        options.push(...itemTraits);
                    }
                    actor.data.data.saves[save].roll({
                        event: ev,
                        dc: !Number.isNaN(dc) ? { value: Number(dc) } : undefined,
                        options,
                    });
                } else {
                    actor.rollSave(ev, save);
                }
            }
        } else {
            throw ErrorPF2e(game.i18n.localize("PF2E.UI.errorTargetToken"));
        }
    }

    /**
     * Set initiative for the combatant associated with the selected token or tokens with the rolled dice total.
     * @param roll The chat entry which contains the roll data
     */
    static async setCombatantInitiative(roll: JQuery): Promise<void> {
        const skillRolled = roll.find(".flavor-text").text();
        const valueRolled = parseFloat(roll.find(".dice-total").text());
        const promises: Promise<void>[] = [];
        for (const token of canvas.tokens.controlled) {
            if (!game.combat) {
                ui.notifications.error("No active encounters in the Combat Tracker.");
                return;
            }

            const combatant = game.combat.getCombatantByToken(token.id);
            if (!combatant) {
                ui.notifications.error("You haven't added this token to the Combat Tracker.");
                return;
            }

            // Kept separate from modifier checks above in case of enemies using regular character sheets (or pets using NPC sheets)
            let value = valueRolled;
            if (!combatant.actor?.hasPlayerOwner) {
                value += 0.5;
            }
            const iniativeIsNow = game.i18n.format("PF2E.InitativeIsNow", { name: combatant.name, value: value });
            const message = `
      <div class="dice-roll">
      <div class="dice-result">
        <div class="dice-tooltip" style="display: none;">
            <div class="dice-formula" style="background: 0;">
              <span style="font-size: 10px;">${skillRolled} <span style="font-weight: bold;">${valueRolled}</span></span>
            </div>
        </div>
        <div class="dice-total" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-style:oblique; font-weight: 400;">${iniativeIsNow}</span>
        </div>
      </div>
      </div>
      `;
            await ChatMessagePF2e.create({
                user: game.user.id,
                speaker: { alias: token.name },
                content: message,
                whisper: ChatMessage.getWhisperRecipients("GM")?.map((user) => user.id),
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            });

            promises.push(game.combat.setInitiative(combatant.id, value));
        }

        await Promise.all(promises);
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
                } else if ("shield" in this.data.data.attributes && this.data.data.attributes.shield.max) {
                    // NPC with no shield but pre-existing shield data
                    const shieldData = this.data.data.attributes.shield;
                    const currentHitPoints = Number(shieldData.value);
                    const maxHitPoints = Number(shieldData.max);
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
                    updateActorData["data.attributes.shield.value"] = shieldHitPoints;
                } else if (isDelta) {
                    attribute = "attributes.hp"; // actor has no shield, apply the specified delta value to actor instead
                }
            }

            if (attribute === "attributes.hp" && "hp" in this.data.data.attributes) {
                const { hp } = this.data.data.attributes;
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
            return Promise.reject(new Error("Only physical items (with quantities) can be transfered between actors"));
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

    /** Adds custom damage dice. */
    async addDamageDice(param: DamageDicePF2e) {
        if (!isCreatureData(this.data)) {
            throw Error("Custom damage dice only work for characters, NPCs, and familiars");
        }

        const damageDice = duplicate(this.data.data.damageDice ?? {});
        if (!(damageDice[param.selector] ?? []).find((d) => d.name === param.name)) {
            // Default new dice to apply to all damage rolls, and ensure we mark this as a custom damage dice source.
            param.selector = param?.selector ?? "damage";
            param.custom = true;

            // The damage dice constructor performs some basic validations for us, like checking that the
            // name and selector are both defined.
            const dice = new DamageDicePF2e(param);

            damageDice[param.selector] = (damageDice[param.selector] ?? []).concat([dice]);
            await this.update({ "data.damageDice": damageDice });
        }
    }

    /** Removes damage dice by name. */
    async removeDamageDice(selector: string, dice: number | string) {
        if (!isCreatureData(this.data)) {
            throw Error("Custom damage dice only work for characters, NPCs, and familiars");
        }

        const damageDice = duplicate(this.data.data.damageDice ?? {});
        if (typeof dice === "number" && damageDice[selector] && damageDice[selector].length > dice) {
            damageDice[selector].splice(dice, 1);
            await this.update({ "data.damageDice": damageDice });
        } else if (typeof dice === "string" && damageDice[selector]) {
            damageDice[selector] = damageDice[selector].filter((d) => d.name !== dice);
            await this.update({ "data.damageDice": damageDice });
        } else {
            throw Error("Dice can only be removed by name (string) or index (number)");
        }
    }

    /**
     * Obtain roll options relevant to rolls of the given types (for use in passing to the `roll` functions on statistics).
     * Roll option in this case is a predication property used for filtering.
     */
    getRollOptions(rollNames: string[]): string[] {
        const rollOptions = this.data.flags.pf2e.rollOptions;
        const results = new Set<string>();
        for (const name of rollNames) {
            for (const [key, value] of Object.entries(rollOptions[name] ?? {})) {
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
                    ? Math.min(Math.max(min, existing.value), max)
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

    /** If necessary, migrate this actor before importing */
    override async importFromJSON(json: string): Promise<this> {
        const importData = JSON.parse(json);
        const systemModel = deepClone(game.system.model.Actor[importData.type]);
        const data: ActorSourcePF2e = mergeObject({ data: systemModel }, importData);
        this.data.update(game.actors.prepareForImport(data), { recursive: false });

        await MigrationRunner.ensureSchemaVersion(
            this,
            Migrations.constructFromVersion(this.schemaVersion ?? undefined),
            { preCreate: false }
        );

        return this.update(this.toObject(), { diff: false, recursive: false });
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Ensure imported actors are current on their schema version */
    protected override async _preCreate(
        data: PreDocumentId<this["data"]["_source"]>,
        options: DocumentModificationContext,
        user: UserPF2e
    ): Promise<void> {
        await super._preCreate(data, options, user);
        if (options.parent) return;
        await MigrationRunner.ensureSchemaVersion(this, Migrations.constructFromVersion());
    }

    /** Unregister all effects possessed by this actor */
    protected override _onDelete(options: DocumentModificationContext, userId: string): void {
        for (const effect of this.itemTypes.effect) {
            game.pf2e.effectTracker.unregister(effect);
        }
        super._onDelete(options, userId);
    }

    /** Fix bug in Foundry 0.8.8 where 'render = false' is not working when creating embedded documents */
    protected override _onCreateEmbeddedDocuments(
        embeddedName: "Item" | "ActiveEffect",
        documents: ActiveEffect[] | Item<ActorPF2e>[],
        result: foundry.data.ActiveEffectSource[] | ItemSourcePF2e[],
        options: DocumentModificationContext,
        userId: string
    ) {
        if (options.render !== false) {
            super._onCreateEmbeddedDocuments(embeddedName, documents, result, options, userId);
        }
    }

    /** Fix bug in Foundry 0.8.8 where 'render = false' is not working when deleting embedded documents */
    protected override _onDeleteEmbeddedDocuments(
        embeddedName: "Item" | "ActiveEffect",
        documents: ActiveEffect[] | Item<ActorPF2e>[],
        result: foundry.data.ActiveEffectSource[] | ItemSourcePF2e[],
        options: DocumentModificationContext,
        userId: string
    ) {
        if (options.render !== false) {
            super._onDeleteEmbeddedDocuments(embeddedName, documents, result, options, userId);
        }
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

declare namespace ActorPF2e {
    function updateDocuments(
        updates?: DocumentUpdateData<ActorPF2e>[],
        context?: DocumentModificationContext
    ): Promise<ActorPF2e[]>;
}

export { ActorPF2e };
