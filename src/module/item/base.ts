import { ActorPF2e, NPCPF2e } from "@actor";
import { isCreatureData } from "@actor/data/helpers";
import { HazardSystemData } from "@actor/hazard/data";
import { ChatMessagePF2e } from "@module/chat-message";
import { preImportJSON } from "@module/doc-helpers";
import { MigrationList, MigrationRunner } from "@module/migration";
import { UserPF2e } from "@module/user";
import { DicePF2e } from "@scripts/dice";
import { EnrichHTMLOptionsPF2e } from "@system/text-editor";
import { ErrorPF2e, isObject, setHasElement, sluggify } from "@util";
import { RuleElementOptions, RuleElementPF2e, RuleElements, RuleElementSource } from "../rules";
import { ContainerPF2e } from "./container";
import { ItemDataPF2e, ItemSourcePF2e, ItemSummaryData, ItemType, TraitChatData } from "./data";
import { isItemSystemData, isPhysicalData } from "./data/helpers";
import { MeleeSystemData } from "./melee/data";
import type { PhysicalItemPF2e } from "./physical";
import { PHYSICAL_ITEM_TYPES } from "./physical/values";
import { ItemSheetPF2e } from "./sheet/base";

interface ItemConstructionContextPF2e extends DocumentConstructionContext<ItemPF2e> {
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

    /** Check this item's type (or whether it's one among multiple types) without a call to `instanceof` */
    isOfType(type: "physical"): this is PhysicalItemPF2e;
    isOfType<T extends ItemType>(...types: T[]): this is InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][T]>;
    isOfType(...types: (ItemType | "physical")[]): boolean {
        return types.some((t) => (t === "physical" ? setHasElement(PHYSICAL_ITEM_TYPES, this.type) : this.type === t));
    }

    /** Redirect the deletion of any owned items to ActorPF2e#deleteEmbeddedDocuments for a single workflow */
    override async delete(context: DocumentModificationContext<this> = {}): Promise<this> {
        if (this.actor) {
            await this.actor.deleteEmbeddedDocuments("Item", [this.id], context);
            return this;
        }
        return super.delete(context);
    }

    /** Generate a list of strings for use in predication */
    getRollOptions(prefix = this.type): string[] {
        const slug = this.slug ?? sluggify(this.name);
        const traits = this.data.data.traits?.value.map((t) => `trait:${t}`) ?? [];
        const delimitedPrefix = prefix ? `${prefix}:` : "";
        const options = [`${delimitedPrefix}${slug}`, ...traits.map((t) => `${delimitedPrefix}${t}`)];
        if ("level" in this.data.data) options.push(`${delimitedPrefix}level:${this.data.data.level.value}`);
        if (["item", ""].includes(prefix)) {
            const itemType = this.isOfType("feat") && this.isFeature ? "feature" : this.type;
            options.unshift(`${delimitedPrefix}type:${itemType}`);
        }

        return options;
    }

    override getRollData(): NonNullable<EnrichHTMLOptionsPF2e["rollData"]> {
        return { actor: this.actor, item: this };
    }

    /**
     * Create a chat card for this item and either return the message or send it to the chat log. Many cards contain
     * follow-up options for attack rolls, effect application, etc.
     */
    async toMessage(
        event?: JQuery.TriggeredEvent,
        { rollMode = undefined, create = true, data = {} }: { rollMode?: RollMode; create?: boolean; data?: {} } = {}
    ): Promise<ChatMessagePF2e | undefined> {
        if (!this.actor) throw ErrorPF2e(`Cannot create message for unowned item ${this.name}`);

        // Basic template rendering data
        const template = `systems/pf2e/templates/chat/${this.type}-card.html`;
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
        rollMode ??= event?.ctrlKey || event?.metaKey ? "blindroll" : game.settings.get("core", "rollMode");
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

        const { flags } = this.data;
        flags.pf2e = mergeObject(flags.pf2e ?? {}, { rulesSelections: {} });

        // Set item grant default values: pre-migration values will be strings, so temporarily check for objectness
        if (isObject(flags.pf2e.grantedBy)) {
            flags.pf2e.grantedBy.onDelete ??= this.isOfType("physical") ? "detach" : "cascade";
        }
        const grants = (flags.pf2e.itemGrants ??= []);
        for (const grant of grants) {
            if (isObject(grant)) grant.onDelete ??= "detach";
        }
    }

    prepareRuleElements(this: Embedded<ItemPF2e>, options?: RuleElementOptions): RuleElementPF2e[] {
        return (this.rules = this.actor.canHostRuleElements ? RuleElements.fromOwnedItem(this, options) : []);
    }

    /** Pull the latest system data from the source compendium and replace this item's with it */
    async refreshFromCompendium(): Promise<void> {
        if (!this.isOwned) return ui.notifications.error("This utility may only be used on owned items");

        if (!this.sourceId?.startsWith("Compendium.")) {
            ui.notifications.warn(`Item "${this.name}" has no compendium source.`);
            return;
        }

        const currentSource = this.toObject();
        const latestSource = (await fromUuid<this>(this.sourceId))?.toObject();
        if (!latestSource) {
            ui.notifications.warn(
                `The compendium source for "${this.name}" (source ID: ${this.sourceId}) was not found.`
            );
            return;
        } else if (latestSource.type !== this.type) {
            ui.notifications.error(
                `The compendium source for "${this.name}" is of a different type than what is present on this actor.`
            );
            return;
        }

        const updatedImage = currentSource.img.endsWith(".svg") ? latestSource.img : currentSource.img;
        const updates: DocumentUpdateData<this> = { img: updatedImage, data: latestSource.data };

        if (isPhysicalData(currentSource)) {
            // Preserve container ID
            const { containerId, quantity } = currentSource.data;
            mergeObject(updates, expandObject({ "data.containerId": containerId, "data.quantity": quantity }));
        } else if (currentSource.type === "spell") {
            // Preserve spellcasting entry location
            mergeObject(updates, expandObject({ "data.location.value": currentSource.data.location.value }));
        } else if (currentSource.type === "feat") {
            // Preserve feat location
            mergeObject(updates, expandObject({ "data.location": currentSource.data.location }));
        }

        // Preserve precious material and runes
        if (currentSource.type === "weapon" || currentSource.type === "armor") {
            const materialAndRunes: Record<string, unknown> = {
                "data.preciousMaterial": currentSource.data.preciousMaterial,
                "data.preciousMaterialGrade": currentSource.data.preciousMaterialGrade,
                "data.potencyRune": currentSource.data.potencyRune,
                "data.propertyRune1": currentSource.data.propertyRune1,
                "data.propertyRune2": currentSource.data.propertyRune2,
                "data.propertyRune3": currentSource.data.propertyRune3,
                "data.propertyRune4": currentSource.data.propertyRune4,
            };
            if (currentSource.type === "weapon") {
                materialAndRunes["data.strikingRune"] = currentSource.data.strikingRune;
            } else {
                materialAndRunes["data.resiliencyRune"] = currentSource.data.resiliencyRune;
            }
            mergeObject(updates, expandObject(materialAndRunes));
        }

        await this.update(updates, { diff: false, recursive: false });
        ui.notifications.info(`Item "${this.name}" has been refreshed.`);
    }

    /* -------------------------------------------- */
    /*  Chat Card Data                              */
    /* -------------------------------------------- */

    /**
     * Internal method that transforms data into something that can be used for chat.
     * Currently renders description text using enrichHTML.
     */
    protected processChatData<T extends { properties?: (string | number | null)[]; [key: string]: unknown }>(
        htmlOptions: EnrichHTMLOptionsPF2e = {},
        data: T
    ): T {
        data.properties = data.properties?.filter((property) => property !== null) ?? [];
        if (isItemSystemData(data)) {
            const chatData = duplicate(data);
            htmlOptions.rollData = mergeObject(this.getRollData(), htmlOptions.rollData ?? {});
            chatData.description.value = game.pf2e.TextEditor.enrichHTML(chatData.description.value, htmlOptions);

            return chatData;
        }

        return data;
    }

    getChatData(htmlOptions: EnrichHTMLOptionsPF2e = {}, _rollOptions: Record<string, unknown> = {}): ItemSummaryData {
        if (!this.actor) throw ErrorPF2e(`Cannot retrieve chat data for unowned item ${this.name}`);
        return this.processChatData(htmlOptions, {
            ...duplicate(this.data.data),
            traits: this.traitChatData(),
        });
    }

    protected traitChatData(dictionary: Record<string, string | undefined> = {}): TraitChatData[] {
        const traits: string[] = [...(this.data.data.traits?.value ?? [])].sort();
        const customTraits =
            this.data.data.traits?.custom
                .trim()
                .split(/\s*[,;|]\s*/)
                .filter((trait) => trait) ?? [];
        traits.push(...customTraits);

        const traitChatLabels = traits.map((trait) => {
            const label = dictionary[trait] ?? trait;
            const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;

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
        if (!this.actor?.isOfType("hazard")) {
            throw ErrorPF2e("Attempted to roll an attack without an actor!");
        }
        // Prepare roll data
        const itemData: any = this.getChatData();
        const rollData: HazardSystemData & { item?: unknown; itemBonus?: number } = deepClone(this.actor.data.data);
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
        if (!this.isOfType("melee")) throw ErrorPF2e("Wrong item type!");
        if (!this.actor.isOfType("hazard")) {
            throw ErrorPF2e("Attempted to roll an attack without an actor!");
        }

        // Get item and actor data and format it for the damage roll
        const item = this.data;
        const itemData = item.data;
        const rollData: HazardSystemData & { item?: MeleeSystemData } = deepClone(this.actor.data.data);
        let parts: Array<string | number> = [];
        const partsType: string[] = [];

        // If the NPC is using the updated NPC Attack data object
        if (itemData.damageRolls && typeof itemData.damageRolls === "object") {
            Object.keys(itemData.damageRolls).forEach((key) => {
                if (itemData.damageRolls[key].damage) parts.push(itemData.damageRolls[key].damage);
                partsType.push(`${itemData.damageRolls[key].damage} ${itemData.damageRolls[key].damageType}`);
            });
        }

        // Set the title of the roll
        const title = `${this.name}: ${partsType.join(", ")}`;

        // do nothing if no parts are provided in the damage roll
        if (parts.length === 0) {
            console.warn("PF2e System | No damage parts provided in damage roll");
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

    /** Don't allow the user to create a condition or spellcasting entry from the sidebar. */
    static override async createDialog(
        data: { folder?: string } = {},
        options: Partial<FormApplicationOptions> = {}
    ): Promise<ItemPF2e | undefined> {
        const original = game.system.documentTypes.Item;
        game.system.documentTypes.Item = original.filter(
            (itemType: string) =>
                !["condition", "spellcastingEntry"].includes(itemType) &&
                !(itemType === "book" && BUILD_MODE === "production")
        );
        const newItem = super.createDialog(data, options) as Promise<ItemPF2e | undefined>;
        game.system.documentTypes.Item = original;
        return newItem;
    }

    /** Assess and pre-process this JSON data, ensuring it's importable and fully migrated */
    override async importFromJSON(json: string): Promise<this> {
        const processed = await preImportJSON(this, json);
        return processed ? super.importFromJSON(processed) : this;
    }

    static override async createDocuments<T extends ConstructorOf<ItemPF2e>>(
        this: T,
        data: PreCreate<InstanceType<T>["data"]["_source"]>[] = [],
        context: DocumentModificationContext<InstanceType<T>> = {}
    ): Promise<InstanceType<T>[]> {
        if (context.parent) {
            const kits = data.filter((d) => d.type === "kit");
            const nonKits = data.filter((d) => !kits.includes(d));

            // Perform character pre-create deletions
            if (context.parent.isOfType("character")) {
                await context.parent.preCreateDelete(nonKits);
            }

            for (const itemSource of [...nonKits]) {
                if (!itemSource.data?.rules) continue;
                if (!(context.keepId || context.keepEmbeddedIds)) {
                    delete itemSource._id; // Allow a random ID to be set by rule elements, which may toggle on `keepId`
                }

                const item = new ItemPF2e(itemSource, { parent: context.parent }) as Embedded<ItemPF2e>;
                // Pre-load this item's self: roll options for predication by preCreate rule elements
                item.prepareActorData?.();

                const rules = item.prepareRuleElements({ suppressWarnings: true });
                for (const rule of rules) {
                    const ruleSource = itemSource.data.rules[rules.indexOf(rule)] as RuleElementSource;
                    await rule.preCreate?.({ itemSource, ruleSource, pendingItems: nonKits, context });
                }
            }

            for (const kitSource of kits) {
                const item = new ItemPF2e(kitSource);
                if (item.isOfType("kit")) await item.dumpContents({ actor: context.parent });
            }

            // Pre-sort unnested, class features according to their sorting from the class
            if (nonKits.length > 1 && nonKits.some((i) => i.type === "class")) {
                const classFeatures = nonKits.filter(
                    (i): i is PreCreate<InstanceType<T>["data"]["_source"]> & { data: { level: { value: number } } } =>
                        i.type === "feat" &&
                        typeof i.data?.level?.value === "number" &&
                        i.data.featType?.value === "classfeature" &&
                        !i.flags?.pf2e?.grantedBy
                );
                for (const feature of classFeatures) {
                    feature.sort = classFeatures.indexOf(feature) * 100 * feature.data.level.value;
                }
            }

            return super.createDocuments(nonKits, context) as Promise<InstanceType<T>[]>;
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

            // If a container is being deleted, its contents need to have their containerId references updated
            const containers = items.filter((i): i is Embedded<ContainerPF2e> => i.isOfType("backpack"));
            for (const container of containers) {
                await container.ejectContents();
            }

            // Run RE pre-delete callbacks
            for (const item of items) {
                for (const rule of item.rules) {
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
        // Set default icon
        if (this.data._source.img === foundry.data.ItemData.DEFAULT_ICON) {
            this.data._source.img = data.img = `systems/pf2e/icons/default-icons/${data.type}.svg`;
        }

        await super._preCreate(data, options, user);

        if (!options.parent) {
            // Ensure imported items are current on their schema version
            await MigrationRunner.ensureSchemaVersion(this, MigrationList.constructFromVersion(this.schemaVersion));
        }

        // Remove any rule elements that request their own removal upon item creation
        this.data._source.data.rules = this.data._source.data.rules.filter((r) => !r.removeUponCreate);
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

    /** Call onCreate rule-element hooks */
    protected override _onCreate(
        data: ItemSourcePF2e,
        options: DocumentModificationContext<this>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);

        if (this.actor && game.user.id === userId) {
            this.actor.prepareData();
            const actorUpdates: Record<string, unknown> = {};
            for (const rule of this.rules) {
                rule.onCreate?.(actorUpdates);
            }
            this.actor.update(actorUpdates);
        }
    }

    /** Call onDelete rule-element hooks */
    protected override _onDelete(options: DocumentModificationContext, userId: string): void {
        super._onDelete(options, userId);
        if (!(this.actor && game.user.id === userId)) return;

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
                            data: { attackEffects: { value: updatedEffects } },
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
}

interface ItemPF2e {
    readonly data: ItemDataPF2e;

    readonly parent: ActorPF2e | null;

    _sheet: ItemSheetPF2e<this> | null;

    get sheet(): ItemSheetPF2e<this>;

    prepareSiblingData?(this: Embedded<ItemPF2e>): void;

    prepareActorData?(this: Embedded<ItemPF2e>): void;
}

export { ItemPF2e, ItemConstructionContextPF2e };
