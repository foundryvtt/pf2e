import { ChatMessagePF2e } from "@module/chat-message";
import {
    AbilityModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    ProficiencyModifier,
    StatisticModifier,
} from "@module/modifiers";
import { ErrorPF2e, sluggify } from "@util";
import { DicePF2e } from "@scripts/dice";
import { ActorPF2e, NPCPF2e } from "@actor";
import { RuleElements, RuleElementPF2e, RuleElementSource } from "../rules";
import { ItemSummaryData, ItemDataPF2e, ItemSourcePF2e, TraitChatData } from "./data";
import { isItemSystemData } from "./data/helpers";
import { MeleeSystemData } from "./melee/data";
import { ItemSheetPF2e } from "./sheet/base";
import { AbilityString } from "@actor/data/base";
import { isCreatureData } from "@actor/data/helpers";
import { NPCSystemData } from "@actor/npc/data";
import { HazardSystemData } from "@actor/hazard/data";
import { CheckPF2e } from "@system/rolls";
import { UserPF2e } from "@module/user";
import { MigrationRunner, MigrationList } from "@module/migration";
import { GhostTemplate } from "@module/ghost-measured-template";

export interface ItemConstructionContextPF2e extends DocumentConstructionContext<ItemPF2e> {
    pf2e?: {
        ready?: boolean;
    };
}

/** Override and extend the basic :class:`Item` implementation */
class ItemPF2e extends Item<ActorPF2e> {
    /** Has this item gone through at least one cycle of data preparation? */
    private initialized: boolean | undefined;

    /** Prepared rule elements from this item */
    rules!: RuleElementPF2e[];

    constructor(data: PreCreate<ItemSourcePF2e>, context: ItemConstructionContextPF2e = {}) {
        if (context.pf2e?.ready) {
            super(data, context);
            this.rules = [];
            this.initialized = true;
        } else {
            mergeObject(context, { pf2e: { ready: true } });
            const ItemConstructor = CONFIG.PF2E.Item.documentClasses[data.type];
            return ItemConstructor ? new ItemConstructor(data, context) : new ItemPF2e(data, context);
        }
    }

    /** The sluggified name of the item **/
    get slug(): string | null {
        return this.data.data.slug;
    }

    /** The compendium source ID of the item **/
    get sourceId(): ItemUUID | null {
        return this.data.flags.core?.sourceId ?? null;
    }

    /** The recorded schema version of this item, updated after each data migration */
    get schemaVersion(): number | null {
        return Number(this.data.data.schema?.version) || null;
    }

    get description(): string {
        return this.data.data.description.value;
    }

    /** Redirect the deletion of any owned items to ActorPF2e#deleteEmbeddedDocuments for a single workflow */
    override async delete(context: DocumentModificationContext = {}) {
        if (this.actor) {
            await this.actor.deleteEmbeddedDocuments("Item", [this.id], context);
            return this;
        }
        return super.delete(context);
    }

    /** Generate a list of strings for use in predication */
    getItemRollOptions(prefix = this.type): string[] {
        const slug = this.slug ?? sluggify(this.name);
        const traits = this.data.data.traits?.value.map((t) => `trait:${t}`) ?? [];
        const delimitedPrefix = prefix ? `${prefix}:` : "";
        const options = [`${delimitedPrefix}${slug}`, ...traits.map((t) => `${delimitedPrefix}${t}`)];
        if ("level" in this.data.data) options.push(`${delimitedPrefix}level:${this.data.data.level.value}`);
        if (["item", ""].includes(prefix)) {
            const itemType =
                this.data.type === "feat" && ["classfeature", "ancestryfeature"].includes(this.data.data.featType.value)
                    ? "feature"
                    : this.data.type;
            options.unshift(`${delimitedPrefix}type:${itemType}`);
        }

        return options;
    }

    override getRollData(): Record<string, unknown> {
        return { actor: this.actor, item: this };
    }

    /**
     * Create a chat card for this item and either return the message or send it to the chat log. Many cards contain
     * follow-up options for attack rolls, effect application, etc.
     */
    async toMessage(
        event?: JQuery.TriggeredEvent,
        { create = true, data = {} } = {}
    ): Promise<ChatMessagePF2e | undefined> {
        if (!this.actor) throw ErrorPF2e(`Cannot create message for unowned item ${this.name}`);

        // Basic template rendering data
        const template = `systems/pf2e/templates/chat/${this.data.type}-card.html`;
        const token = this.actor.token;
        const nearestItem = event ? event.currentTarget.closest(".item") : {};
        const contextualData = !isObjectEmpty(data) ? data : nearestItem.dataset || {};
        const templateData = {
            actor: this.actor,
            tokenId: token ? `${token.parent?.id}.${token.id}` : null,
            item: this,
            data: this.getChatData(undefined, contextualData),
        };

        // Basic chat message data
        const chatData: PreCreate<foundry.data.ChatMessageSource> = {
            speaker: ChatMessagePF2e.getSpeaker({
                actor: this.actor,
                token: this.actor.getActiveTokens()[0]?.document,
            }),
            flags: {
                core: {
                    canPopout: true,
                },
                pf2e: {
                    origin: { uuid: this.uuid, type: this.type },
                },
            },
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        };

        // Toggle default roll mode
        const rollMode = event?.ctrlKey || event?.metaKey ? "blindroll" : game.settings.get("core", "rollMode");
        if (["gmroll", "blindroll"].includes(rollMode))
            chatData.whisper = ChatMessagePF2e.getWhisperRecipients("GM").map((u) => u.id);
        if (rollMode === "blindroll") chatData.blind = true;

        // Render the template
        chatData.content = await renderTemplate(template, templateData);

        // Create the chat message
        return create ? ChatMessagePF2e.create(chatData, { renderSheet: false }) : new ChatMessagePF2e(chatData);
    }

    /** A shortcut to `item.toMessage(..., { create: true })`, kept for backward compatibility */
    async toChat(event?: JQuery.TriggeredEvent): Promise<ChatMessagePF2e | undefined> {
        return this.toMessage(event, { create: true });
    }

    /** Refresh the Item Directory if this item isn't owned */
    override prepareData(): void {
        super.prepareData();
        if (!this.isOwned && ui.items && this.initialized) ui.items.render();
    }

    /** Ensure the presence of the pf2e flag scope with default properties and values */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.data.flags.pf2e = mergeObject(this.data.flags.pf2e ?? {}, { rulesSelections: {} });
        this.data.flags.pf2e.grantedBy ??= null;
        this.data.flags.pf2e.itemGrants ??= [];
    }

    prepareRuleElements(this: Embedded<ItemPF2e>): RuleElementPF2e[] {
        return (this.rules = this.actor.canHostRuleElements ? RuleElements.fromOwnedItem(this) : []);
    }

    /* -------------------------------------------- */
    /*  Chat Card Data                              */
    /* -------------------------------------------- */

    /**
     * Internal method that transforms data into something that can be used for chat.
     * Currently renders description text using enrichHTML.
     */
    protected processChatData<T extends { properties?: (string | number | null)[]; [key: string]: unknown }>(
        htmlOptions: EnrichHTMLOptions = {},
        data: T
    ): T {
        data.properties = data.properties?.filter((property) => property !== null) ?? [];
        if (isItemSystemData(data)) {
            const chatData = duplicate(data);
            chatData.description.value = game.pf2e.TextEditor.enrichHTML(chatData.description.value, {
                ...htmlOptions,
                rollData: htmlOptions.rollData ?? this.getRollData(),
            });
            return chatData;
        }

        return data;
    }

    getChatData(htmlOptions: EnrichHTMLOptions = {}, _rollOptions: Record<string, any> = {}): ItemSummaryData {
        if (!this.actor) throw ErrorPF2e(`Cannot retrieve chat data for unowned item ${this.name}`);
        return this.processChatData(htmlOptions, {
            ...duplicate(this.data.data),
            traits: this.traitChatData(),
        });
    }

    protected traitChatData(dictionary: Record<string, string> = {}): TraitChatData[] {
        const traits: string[] = deepClone(this.data.data.traits?.value ?? []).sort();
        const customTraits =
            this.data.data.traits?.custom
                .trim()
                .split(/\s*[,;|]\s*/)
                .filter((trait) => trait) ?? [];
        traits.push(...customTraits);

        const traitChatLabels = traits.map((trait) => {
            const label = dictionary[trait] || trait.charAt(0).toUpperCase() + trait.slice(1);
            const traitDescriptions: Record<string, string> = CONFIG.PF2E.traitsDescriptions;

            return {
                value: trait,
                label,
                description: traitDescriptions[trait],
            };
        });

        return traitChatLabels;
    }

    /* -------------------------------------------- */
    /*  Roll Attacks                                */
    /* -------------------------------------------- */

    /**
     * Roll a NPC Attack
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollNPCAttack(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent, multiAttackPenalty = 1) {
        if (this.type !== "melee") throw ErrorPF2e("Wrong item type!");
        if (this.actor?.data.type !== "npc" && this.actor?.data.type !== "hazard") {
            throw ErrorPF2e("Attempted to roll an attack without an actor!");
        }
        // Prepare roll data
        const itemData: any = this.getChatData();
        const rollData: (NPCSystemData | HazardSystemData) & { item?: unknown; itemBonus?: number } = duplicate(
            this.actor.data.data
        );
        const parts = ["@itemBonus"];
        const title = `${this.name} - Attack Roll${multiAttackPenalty > 1 ? ` (MAP ${multiAttackPenalty})` : ""}`;

        rollData.item = itemData;

        let adjustment = 0;
        const traits = this.actor.data.data.traits.traits.value;
        if (traits.some((trait) => trait === "elite")) {
            adjustment = 2;
        } else if (traits.some((trait) => trait === "weak")) {
            adjustment = -2;
        }

        rollData.itemBonus = Number(itemData.bonus.value) + adjustment;

        if (multiAttackPenalty === 2) parts.push(itemData.map2);
        else if (multiAttackPenalty === 3) parts.push(itemData.map3);

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            actor: this.actor,
            data: rollData,
            rollType: "attack-roll",
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    /**
     * Roll NPC Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollNPCDamage(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent, critical = false) {
        if (this.data.type !== "melee") throw ErrorPF2e("Wrong item type!");
        if (this.actor.data.type !== "npc" && this.actor.data.type !== "hazard") {
            throw ErrorPF2e("Attempted to roll an attack without an actor!");
        }

        // Get item and actor data and format it for the damage roll
        const item = this.data;
        const itemData = item.data;
        const rollData: (NPCSystemData | HazardSystemData) & { item?: MeleeSystemData } = duplicate(
            this.actor.data.data
        );
        let parts: Array<string | number> = [];
        const partsType: string[] = [];

        // If the NPC is using the updated NPC Attack data object
        if (itemData.damageRolls && typeof itemData.damageRolls === "object") {
            Object.keys(itemData.damageRolls).forEach((key) => {
                if (itemData.damageRolls[key].damage) parts.push(itemData.damageRolls[key].damage);
                partsType.push(`${itemData.damageRolls[key].damage} ${itemData.damageRolls[key].damageType}`);
            });
        } else {
            parts = [(itemData as any).damage.die];
        }

        // Set the title of the roll
        const title = `${this.name}: ${partsType.join(", ")}`;

        // do nothing if no parts are provided in the damage roll
        if (parts.length === 0) {
            console.log("PF2e System | No damage parts provided in damage roll");
            parts = ["0"];
        }

        const traits = this.actor.data.data.traits.traits.value;
        if (traits.some((trait) => trait === "elite")) {
            parts.push("+2");
        } else if (traits.some((trait) => trait === "weak")) {
            parts.push("-2");
        }

        // Call the roll helper utility
        rollData.item = itemData;
        DicePF2e.damageRoll({
            event,
            parts,
            critical,
            actor: this.actor,
            data: rollData,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event.clientY - 80,
                left: window.innerWidth - 710,
            },
        });
    }

    /**
     * Roll Counteract check
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollCounteract(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent) {
        if (!(this.actor.data.type === "character" || this.actor.data.type === "npc")) {
            return;
        }
        const itemData =
            this.data.type === "consumable" && this.data.data.spell?.data
                ? duplicate(this.data.data.spell.data)
                : this.toObject();
        if (itemData.type !== "spell") throw ErrorPF2e("Wrong item type!");

        const spellcastingEntry = this.actor.spellcasting.get(itemData.data.location.value);
        if (!spellcastingEntry) throw ErrorPF2e("Spell points to location that is not a spellcasting type");

        const modifiers: ModifierPF2e[] = [];
        const ability: AbilityString = spellcastingEntry.data.data.ability?.value || "int";
        const score = this.actor.data.data.abilities[ability]?.value ?? 0;
        modifiers.push(AbilityModifier.fromScore(ability, score));

        const proficiencyRank = spellcastingEntry.rank;
        modifiers.push(ProficiencyModifier.fromLevelAndRank(this.actor.data.data.details.level.value, proficiencyRank));

        const rollOptions = ["all", "counteract-check"];
        const traits = itemData.data.traits.value;

        let flavor = "<hr>";
        flavor += `<h3>${game.i18n.localize("PF2E.Counteract")}</h3>`;
        flavor += `<hr>`;

        const spellLevel = (() => {
            const button = event.currentTarget;
            const card = button.closest("*[data-spell-lvl]");
            const cardData = card ? card.dataset : {};
            return Number(cardData.spellLvl) || 1;
        })();

        const addFlavor = (success: string, level: number) => {
            const title = game.i18n.localize(`PF2E.${success}`);
            const desc = game.i18n.format(`PF2E.CounteractDescription.${success}`, {
                level: level,
            });
            flavor += `<b>${title}</b> ${desc}<br>`;
        };
        flavor += `<p>${game.i18n.localize("PF2E.CounteractDescription.Hint")}</p>`;
        flavor += "<p>";
        addFlavor("CritSuccess", spellLevel + 3);
        addFlavor("Success", spellLevel + 1);
        addFlavor("Failure", spellLevel);
        addFlavor("CritFailure", 0);
        flavor += "</p>";
        const check = new StatisticModifier(flavor, modifiers);
        const finalOptions = this.actor.getRollOptions(rollOptions).concat(traits);
        ensureProficiencyOption(finalOptions, proficiencyRank);
        const spellTraits = { ...CONFIG.PF2E.spellTraits, ...CONFIG.PF2E.magicSchools, ...CONFIG.PF2E.magicTraditions };
        const traitObjects = traits.map((trait) => ({
            name: trait,
            label: spellTraits[trait],
        }));
        CheckPF2e.roll(
            check,
            {
                actor: this.actor,
                type: "counteract-check",
                options: finalOptions,
                title: game.i18n.localize("PF2E.Counteract"),
                traits: traitObjects,
            },
            event
        );
    }

    createTemplate() {
        const itemData =
            this.data.type === "consumable" && this.data.data.spell?.data
                ? duplicate(this.data.data.spell.data)
                : this.toObject();
        if (itemData.type !== "spell") throw ErrorPF2e("Wrong item type!");

        const templateConversion: Record<string, string> = {
            burst: "circle",
            emanation: "circle",
            line: "ray",
            cone: "cone",
            rect: "rect",
        };

        const areaType = templateConversion[itemData.data.area.areaType];

        const templateData: any = {
            t: areaType,
            distance: (Number(itemData.data.area.value) / 5) * (canvas.dimensions?.distance ?? 0),
            flags: {
                pf2e: {
                    origin: {
                        type: this.type,
                        uuid: this.uuid,
                        name: this.name,
                        slug: this.slug,
                        traits: deepClone(this.data.data.traits?.value ?? []),
                    },
                },
            },
        };

        if (areaType === "ray") {
            templateData.width = canvas.dimensions?.distance ?? 0;
        } else if (areaType === "cone") {
            templateData.angle = 90;
        }

        templateData.user = game.user.id;
        templateData.fillColor = game.user.color;
        const measuredTemplateDoc = new MeasuredTemplateDocument(templateData, { parent: canvas.scene });
        return new GhostTemplate(measuredTemplateDoc);
    }

    placeTemplate(_event: JQuery.ClickEvent) {
        this.createTemplate().drawPreview();
    }

    calculateMap(): { label: string; map2: number; map3: number } {
        return ItemPF2e.calculateMap(this.data);
    }

    static calculateMap(item: ItemDataPF2e): { label: string; map2: number; map3: number } {
        if (item.type === "melee" || item.type === "weapon") {
            // calculate multiple attack penalty tiers
            const agile = item.data.traits.value.includes("agile");
            const alternateMAP = ((item.data as any).MAP || {}).value;
            switch (alternateMAP) {
                case "1":
                    return { label: "PF2E.MultipleAttackPenalty", map2: -1, map3: -2 };
                case "2":
                    return { label: "PF2E.MultipleAttackPenalty", map2: -2, map3: -4 };
                case "3":
                    return { label: "PF2E.MultipleAttackPenalty", map2: -3, map3: -6 };
                case "4":
                    return { label: "PF2E.MultipleAttackPenalty", map2: -4, map3: -8 };
                case "5":
                    return { label: "PF2E.MultipleAttackPenalty", map2: -5, map3: -10 };
                default: {
                    if (agile) return { label: "PF2E.MultipleAttackPenalty", map2: -4, map3: -8 };
                    else return { label: "PF2E.MultipleAttackPenalty", map2: -5, map3: -10 };
                }
            }
        }
        return { label: "PF2E.MultipleAttackPenalty", map2: -5, map3: -10 };
    }

    /** Don't allow the user to create a condition or spellcasting entry from the sidebar. */
    static override async createDialog(
        data: { folder?: string } = {},
        options: Partial<FormApplicationOptions> = {}
    ): Promise<ItemPF2e | undefined> {
        const original = game.system.documentTypes.Item;
        game.system.documentTypes.Item = original.filter(
            (itemType: string) =>
                !(
                    ["condition", "spellcastingEntry"].includes(itemType) ||
                    (["book", "deity"].includes(itemType) && BUILD_MODE === "production")
                )
        );
        const newItem = super.createDialog(data, options) as Promise<ItemPF2e | undefined>;
        game.system.documentTypes.Item = original;
        return newItem;
    }

    /** If necessary, migrate this item before importing */
    override async importFromJSON(json: string): Promise<this> {
        const source = this.collection.fromCompendium(JSON.parse(json));
        source._id = this.id;
        const data = new ItemPF2e.schema(source);
        this.data.update(data.toObject(), { recursive: false });

        await MigrationRunner.ensureSchemaVersion(
            this,
            MigrationList.constructFromVersion(this.schemaVersion ?? undefined),
            { preCreate: false }
        );

        return this.update(this.toObject(), { diff: false, recursive: false });
    }

    static override async createDocuments<T extends ConstructorOf<ItemPF2e>>(
        this: T,
        data: PreCreate<InstanceType<T>["data"]["_source"]>[] = [],
        context: DocumentModificationContext<InstanceType<T>> = {}
    ): Promise<InstanceType<T>[]> {
        if (context.parent) {
            for await (const itemSource of [...data]) {
                if (!itemSource.data?.rules) continue;
                const item = new ItemPF2e(itemSource, { parent: context.parent }) as Embedded<ItemPF2e>;
                // Pre-load this item's self: roll options for predication by preCreate rule elements
                item.prepareActorData?.();

                const rules = item.prepareRuleElements();
                for await (const rule of rules) {
                    const ruleSource = itemSource.data.rules[rules.indexOf(rule)] as RuleElementSource;
                    await rule.preCreate?.({ itemSource, ruleSource, pendingItems: data, context });
                }
            }
        }

        return super.createDocuments(data, context) as Promise<InstanceType<T>[]>;
    }

    static override async deleteDocuments<T extends ConstructorOf<ItemPF2e>>(
        this: T,
        ids: string[] = [],
        context: DocumentModificationContext<InstanceType<T>> = {}
    ): Promise<InstanceType<T>[]> {
        ids = Array.from(new Set(ids));
        const actor = context.parent;
        if (actor) {
            const items = ids.flatMap((id) => actor.items.get(id) ?? []);
            for (const item of items) {
                for await (const rule of item.rules) {
                    await rule.preDelete?.({ pendingItems: items, context });
                }
            }
            ids = Array.from(new Set(items.map((i) => i.id))).filter((id) => actor.items.has(id));
        }

        return super.deleteDocuments(ids, context) as Promise<InstanceType<T>[]>;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preCreate(
        data: PreDocumentId<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        await super._preCreate(data, options, user);

        if (!this.actor) {
            // Ensure imported items are current on their schema version
            await MigrationRunner.ensureSchemaVersion(this, MigrationList.constructFromVersion());
        }
    }

    /** Keep `TextEditor` and anything else up to no good from setting this item's description to `null` */
    protected override async _preUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        if (changed.data?.description?.value === null) {
            changed.data.description.value = "";
        }
        await super._preUpdate(changed, options, user);
    }

    /** Call onDelete rule-element hooks, refresh effects panel */
    protected override _onCreate(
        data: ItemSourcePF2e,
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        if (this.actor) {
            // Rule Elements
            if (!(isCreatureData(this.actor?.data) && this.canUserModify(game.user, "update"))) return;
            const actorUpdates: Record<string, unknown> = {};
            for (const rule of this.rules) rule.onCreate?.(actorUpdates);
            this.actor.update(actorUpdates);
        }

        super._onCreate(data, options, userId);
    }

    /** Call onDelete rule-element hooks */
    protected override _onDelete(options: DocumentModificationContext, userId: string): void {
        if (this.actor) {
            if (!(isCreatureData(this.actor.data) && this.canUserModify(game.user, "update"))) return;
            const actorUpdates: DocumentUpdateData<ActorPF2e> = {};
            for (const rule of this.rules) rule.onDelete?.(actorUpdates);

            // Remove attack effect from melee items if this deleted item was the source
            if (this.actor instanceof NPCPF2e && ["action", "consumable"].includes(this.type)) {
                const slug = this.slug ?? sluggify(this.name);
                if (!this.actor.isToken) {
                    const itemUpdates: DocumentUpdateData<ItemPF2e>[] = [];
                    this.actor.itemTypes.melee.forEach((item) => {
                        const attackEffects = item.data.data.attackEffects.value;
                        if (attackEffects.includes(slug)) {
                            const updatedEffects = attackEffects.filter((effect) => effect !== slug);
                            itemUpdates.push({
                                _id: item.id,
                                data: {
                                    attackEffects: {
                                        value: updatedEffects,
                                    },
                                },
                            });
                        }
                    });
                    if (itemUpdates.length > 0) {
                        mergeObject(actorUpdates, { items: itemUpdates });
                    }
                } else {
                    // The above method of updating embedded items in an actor update does not work with synthetic actors
                    const promises: Promise<ItemPF2e>[] = [];
                    this.actor.itemTypes.melee.forEach((item) => {
                        const attackEffects = item.data.data.attackEffects.value;
                        if (attackEffects.includes(slug)) {
                            const updatedEffects = attackEffects.filter((effect) => effect !== slug);
                            promises.push(item.update({ ["data.attackEffects.value"]: updatedEffects }));
                        }
                    });
                    if (promises.length > 0) {
                        Promise.allSettled(promises);
                    }
                }
            }

            this.actor.update(actorUpdates);
        }
        super._onDelete(options, userId);
    }
}

interface ItemPF2e {
    readonly data: ItemDataPF2e;

    readonly parent: ActorPF2e | null;

    _sheet: ItemSheetPF2e<ItemPF2e> | null;

    get sheet(): ItemSheetPF2e<this>;

    prepareSiblingData?(this: Embedded<ItemPF2e>): void;

    prepareActorData?(this: Embedded<ItemPF2e>): void;

    getFlag(scope: "core", key: "sourceId"): string;
    getFlag(scope: "pf2e", key: "constructing"): true | undefined;
    getFlag(scope: string, key: string): any;
}

export { ItemPF2e };
