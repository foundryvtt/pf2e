import { ActorPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message";
import { preImportJSON } from "@module/doc-helpers";
import { MigrationList, MigrationRunner } from "@module/migration";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { UserPF2e } from "@module/user";
import { EnrichHTMLOptionsPF2e } from "@system/text-editor";
import { ErrorPF2e, isObject, setHasElement, sluggify } from "@util";
import { RuleElementOptions, RuleElementPF2e, RuleElements, RuleElementSource } from "@module/rules";
import { processGrantDeletions } from "@module/rules/rule-element/grant-item/helpers";
import { ContainerPF2e } from "./container";
import { FeatSource, ItemDataPF2e, ItemSourcePF2e, ItemSummaryData, ItemType, TraitChatData } from "./data";
import { ItemTrait } from "./data/base";
import { isItemSystemData, isPhysicalData } from "./data/helpers";
import { PhysicalItemPF2e } from "./physical/document";
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
    private initialized?: true;

    /** Prepared rule elements from this item */
    rules!: RuleElementPF2e[];

    constructor(data: PreCreate<ItemSourcePF2e>, context: ItemConstructionContextPF2e = {}) {
        if (context.pf2e?.ready) {
            super(data, context);
        } else {
            context.pf2e = mergeObject(context.pf2e ?? {}, { ready: true });
            const ItemConstructor = CONFIG.PF2E.Item.documentClasses[data.type];
            return ItemConstructor ? new ItemConstructor(data, context) : new ItemPF2e(data, context);
        }
    }

    /** The sluggified name of the item **/
    get slug(): string | null {
        return this.system.slug;
    }

    /** The compendium source ID of the item **/
    get sourceId(): ItemUUID | null {
        return this.flags.core?.sourceId ?? null;
    }

    /** The recorded schema version of this item, updated after each data migration */
    get schemaVersion(): number | null {
        return Number(this.system.schema?.version) || null;
    }

    get description(): string {
        return this.system.description.value.trim();
    }

    /** Check this item's type (or whether it's one among multiple types) without a call to `instanceof` */
    isOfType(type: "physical"): this is PhysicalItemPF2e;
    isOfType<T extends ItemType>(...types: T[]): this is InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][T]>;
    isOfType<T extends "physical" | ItemType>(
        ...types: T[]
    ): this is PhysicalItemPF2e | InstanceType<ConfigPF2e["PF2E"]["Item"]["documentClasses"][Exclude<T, "physical">]>;
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
        const traits: ItemTrait[] = this.system.traits?.value ?? [];
        const traitOptions = traits.map((t) => `trait:${t}`);
        const delimitedPrefix = prefix ? `${prefix}:` : "";
        const options = [
            `${delimitedPrefix}id:${this.id}`,
            `${delimitedPrefix}${slug}`,
            `${delimitedPrefix}slug:${slug}`,
            ...traitOptions.map((t) => `${delimitedPrefix}${t}`),
        ];

        const level = "level" in this ? this.level : "level" in this.system ? this.system.level.value : null;
        if (typeof level === "number") {
            options.push(`${delimitedPrefix}level:${level}`);
        }

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
        {
            rollMode = undefined,
            create = true,
            data = {},
        }: { rollMode?: RollMode; create?: boolean; data?: Record<string, unknown> } = {}
    ): Promise<ChatMessagePF2e | undefined> {
        if (!this.actor) throw ErrorPF2e(`Cannot create message for unowned item ${this.name}`);

        // Basic template rendering data
        const template = `systems/pf2e/templates/chat/${this.type}-card.html`;
        const token = this.actor.token;
        const nearestItem = event ? event.currentTarget.closest(".item") : {};
        const contextualData = Object.keys(data).length > 0 ? data : nearestItem.dataset || {};
        const templateData = {
            actor: this.actor,
            tokenId: token ? `${token.parent?.id}.${token.id}` : null,
            item: this,
            data: await this.getChatData(undefined, contextualData),
        };

        // Basic chat message data
        const chatData: PreCreate<foundry.data.ChatMessageSource> = {
            speaker: ChatMessagePF2e.getSpeaker({
                actor: this.actor,
                token: this.actor.getActiveTokens(false, true)[0] ?? null,
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

    protected override _initialize(): void {
        this.rules = [];
        super._initialize();
        this.initialized = true;
    }

    /** Refresh the Item Directory if this item isn't owned */
    override prepareData(): void {
        super.prepareData();
        if (!this.isOwned && ui.items && this.initialized) ui.items.render();
    }

    /** Ensure the presence of the pf2e flag scope with default properties and values */
    override prepareBaseData(): void {
        super.prepareBaseData();

        const { flags } = this;
        flags.pf2e = mergeObject(flags.pf2e ?? {}, { rulesSelections: {} });

        // Set item grant default values: pre-migration values will be strings, so temporarily check for objectness
        if (isObject(flags.pf2e.grantedBy)) {
            flags.pf2e.grantedBy.onDelete ??= this.isOfType("physical") ? "detach" : "cascade";
        }
        const grants = (flags.pf2e.itemGrants ??= {});
        for (const grant of Object.values(grants)) {
            if (isObject(grant)) {
                grant.onDelete ??= "detach";
            }
        }
    }

    prepareRuleElements(options?: RuleElementOptions): RuleElementPF2e[] {
        if (!this.actor) throw ErrorPF2e("Rule elements may only be prepared from embedded items");

        return (this.rules = this.actor.canHostRuleElements
            ? RuleElements.fromOwnedItem(this as Embedded<ItemPF2e>, options)
            : []);
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
        const updates: DocumentUpdateData<this> = { img: updatedImage, system: latestSource.system };

        if (isPhysicalData(currentSource)) {
            // Preserve container ID
            const { containerId, quantity } = currentSource.system;
            mergeObject(updates, expandObject({ "system.containerId": containerId, "system.quantity": quantity }));
        } else if (currentSource.type === "spell") {
            // Preserve spellcasting entry location
            mergeObject(updates, expandObject({ "system.location.value": currentSource.system.location.value }));
        } else if (currentSource.type === "feat") {
            // Preserve feat location
            mergeObject(updates, expandObject({ "system.location": currentSource.system.location }));
        }

        // Preserve precious material and runes
        if (currentSource.type === "weapon" || currentSource.type === "armor") {
            const materialAndRunes: Record<string, unknown> = {
                "system.preciousMaterial": currentSource.system.preciousMaterial,
                "system.preciousMaterialGrade": currentSource.system.preciousMaterialGrade,
                "system.potencyRune": currentSource.system.potencyRune,
                "system.propertyRune1": currentSource.system.propertyRune1,
                "system.propertyRune2": currentSource.system.propertyRune2,
                "system.propertyRune3": currentSource.system.propertyRune3,
                "system.propertyRune4": currentSource.system.propertyRune4,
            };
            if (currentSource.type === "weapon") {
                materialAndRunes["system.strikingRune"] = currentSource.system.strikingRune;
            } else {
                materialAndRunes["system.resiliencyRune"] = currentSource.system.resiliencyRune;
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
    protected async processChatData<T extends ItemSummaryData>(
        htmlOptions: EnrichHTMLOptionsPF2e = {},
        data: T
    ): Promise<T> {
        data.properties = data.properties?.filter((property) => property !== null) ?? [];
        if (isItemSystemData(data)) {
            const chatData = duplicate(data);
            htmlOptions.rollData = mergeObject(this.getRollData(), htmlOptions.rollData ?? {});
            chatData.description.value = await TextEditor.enrichHTML(chatData.description.value, {
                ...htmlOptions,
                async: true,
            });

            return chatData;
        }

        return data;
    }

    async getChatData(
        htmlOptions: EnrichHTMLOptionsPF2e = {},
        _rollOptions: Record<string, unknown> = {}
    ): Promise<ItemSummaryData> {
        if (!this.actor) throw ErrorPF2e(`Cannot retrieve chat data for unowned item ${this.name}`);
        const systemData: Record<string, unknown> = { ...this.system, traits: this.traitChatData() };
        return this.processChatData(htmlOptions, deepClone(systemData));
    }

    protected traitChatData(dictionary: Record<string, string | undefined> = {}): TraitChatData[] {
        const traits: string[] = [...(this.system.traits?.value ?? [])].sort();
        const customTraits =
            this.system.traits?.custom
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

    /** Don't allow the user to create a condition or spellcasting entry from the sidebar. */
    static override async createDialog(
        data: { folder?: string } = {},
        options: Partial<FormApplicationOptions> = {}
    ): Promise<ItemPF2e | undefined> {
        const original = game.system.documentTypes.Item;
        game.system.documentTypes.Item = original.filter(
            (itemType: string) =>
                !["condition", "spellcastingEntry", "lore"].includes(itemType) &&
                !(itemType === "book" && BUILD_MODE === "production")
        );
        options = { ...options, classes: [...(options.classes ?? []), "dialog-item-create"] };
        const newItem = super.createDialog(data, options) as Promise<ItemPF2e | undefined>;
        game.system.documentTypes.Item = original;
        return newItem;
    }

    /** Assess and pre-process this JSON data, ensuring it's importable and fully migrated */
    override async importFromJSON(json: string): Promise<this> {
        const processed = await preImportJSON(this, json);
        return processed ? super.importFromJSON(processed) : this;
    }

    static override async createDocuments<T extends foundry.abstract.Document>(
        this: ConstructorOf<T>,
        data?: PreCreate<T["_source"]>[],
        context?: DocumentModificationContext<T>
    ): Promise<T[]>;
    static override async createDocuments(
        data: PreCreate<ItemSourcePF2e>[] = [],
        context: DocumentModificationContext<ItemPF2e> = {}
    ): Promise<Item[]> {
        // Migrate source in case of importing from an old compendium
        for (const source of [...data]) {
            if (Object.keys(source).length === 2 && "name" in source && "type" in source) {
                // The item consists of only a `name` and `type`: set schema version and skip
                source.system = { schema: { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION } };
                continue;
            }
            const item = new ItemPF2e(source);
            await MigrationRunner.ensureSchemaVersion(item, MigrationList.constructFromVersion(item.schemaVersion));
            data.splice(data.indexOf(source), 1, item.toObject());
        }

        const actor = context.parent;
        if (!actor) return super.createDocuments(data, context);

        const validTypes = actor.allowedItemTypes;
        if (validTypes.includes("physical")) validTypes.push(...PHYSICAL_ITEM_TYPES, "kit");

        // Check if this item is valid for this actor
        for (const datum of data) {
            if (datum.type && !validTypes.includes(datum.type)) {
                ui.notifications.error(
                    game.i18n.format("PF2E.Item.CannotAddType", {
                        type: game.i18n.localize(CONFIG.Item.typeLabels[datum.type] ?? datum.type.titleCase()),
                    })
                );
                return [];
            }
        }

        // If any created types are "singular", remove existing competing ones.
        // actor.deleteEmbeddedDocuments() will also delete any linked items.
        const singularTypes = ["ancestry", "background", "class", "heritage", "deity"] as const;
        const singularTypesToDelete = singularTypes.filter((type) => data.some((source) => source.type === type));
        const preCreateDeletions = singularTypesToDelete.flatMap((type): Embedded<ItemPF2e>[] => actor.itemTypes[type]);
        if (preCreateDeletions.length) {
            const idsToDelete = preCreateDeletions.map((i) => i.id);
            await actor.deleteEmbeddedDocuments("Item", idsToDelete, { render: false });
        }

        // Convert all non-kit sources to item objects, and recursively extract the simple grants from ABC items
        const items = await (async () => {
            /** Internal function to recursively get all simple granted items */
            async function getSimpleGrants(item: Embedded<ItemPF2e>): Promise<Embedded<ItemPF2e>[]> {
                const granted = (await item.createGrantedItems?.()) ?? [];
                if (!granted.length) return [];
                const reparented = granted.map(
                    (i): Embedded<ItemPF2e> =>
                        (i.parent ? i : new ItemPF2e(i._source, { parent: actor })) as Embedded<ItemPF2e>
                );
                return [...reparented, ...(await Promise.all(reparented.map(getSimpleGrants))).flat()];
            }

            const items = data.map((source) => {
                if (!(context.keepId || context.keepEmbeddedIds)) {
                    source._id = randomID();
                }
                return new ItemPF2e(source, { parent: actor }) as Embedded<ItemPF2e>;
            });

            // If any item we plan to add will add new items (such as ABC items), add those too
            // When this occurs, keepId is switched on.
            for (const item of [...items]) {
                const grants = await getSimpleGrants(item);
                if (grants.length) {
                    context.keepId = true;
                    items.push(...grants);
                }
            }

            return items;
        })();

        const outputSources = items.map((i) => i._source);

        // Process item preCreate rules for all items that are going to be added
        // This may add additional items (such as via GrantItem)
        for (const item of items) {
            // Pre-load this item's self: roll options for predication by preCreate rule elements
            item.prepareActorData?.();

            const itemSource = item._source;
            const rules = item.prepareRuleElements({ suppressWarnings: true });
            for (const rule of rules) {
                const ruleSource = itemSource.system.rules[rules.indexOf(rule)] as RuleElementSource;
                await rule.preCreate?.({ itemSource, ruleSource, pendingItems: outputSources, context });
            }
        }

        // Pre-sort unnested, class features according to their sorting from the class
        if (outputSources.some((i) => i.type === "class")) {
            const classFeatures = outputSources.filter(
                (i): i is FeatSource =>
                    i.type === "feat" &&
                    typeof i.system?.level?.value === "number" &&
                    i.system.featType?.value === "classfeature" &&
                    !i.flags?.pf2e?.grantedBy
            );
            for (const feature of classFeatures) {
                feature.sort = classFeatures.indexOf(feature) * 100 * (feature.system.level?.value ?? 1);
            }
        }

        const nonKits = outputSources.filter((source) => source.type !== "kit");
        return super.createDocuments(nonKits, context);
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
            for (const item of [...items]) {
                for (const rule of item.rules) {
                    await rule.preDelete?.({ pendingItems: items, context });
                }

                await processGrantDeletions(item, items);
            }
            ids = Array.from(new Set(items.map((i) => i.id))).filter((id) => actor.items.has(id));
        }

        return super.deleteDocuments(ids, context) as Promise<InstanceType<T>[]>;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        // Set default icon
        if (this._source.img === ItemPF2e.DEFAULT_ICON) {
            this._source.img = data.img = `systems/pf2e/icons/default-icons/${data.type}.svg`;
        }

        // If this item is of a certain type and is being added to a PC, change current HP along with any change to max
        if (this.actor?.isOfType("character") && this.isOfType("ancestry", "background", "class", "feat", "heritage")) {
            const clone = this.actor.clone({
                items: [...this.actor.items.toObject(), data],
            });
            const hpMaxDifference = clone.hitPoints.max - this.actor.hitPoints.max;
            if (hpMaxDifference !== 0) {
                const newHitPoints = this.actor.hitPoints.value + hpMaxDifference;
                await this.actor.update(
                    { "system.attributes.hp.value": newHitPoints },
                    { render: false, allowHPOverage: true }
                );
            }
        }

        await super._preCreate(data, options, user);

        // Remove any rule elements that request their own removal upon item creation
        this._source.system.rules = this._source.system.rules.filter((r) => !r.removeUponCreate);
    }

    /** Keep `TextEditor` and anything else up to no good from setting this item's description to `null` */
    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        if (changed.system?.description?.value === null) {
            changed.system.description.value = "";
        }

        // If this item is of a certain type and belongs to a PC, change current HP along with any change to max
        if (this.actor?.isOfType("character") && this.isOfType("ancestry", "background", "class", "feat", "heritage")) {
            const actorClone = this.actor.clone();
            const item = actorClone.items.get(this.id, { strict: true });
            item.updateSource(changed, options);
            actorClone.reset();

            const hpMaxDifference = actorClone.hitPoints.max - this.actor.hitPoints.max;
            if (hpMaxDifference !== 0) {
                const newHitPoints = this.actor.hitPoints.value + hpMaxDifference;
                await this.actor.update(
                    { "system.attributes.hp.value": newHitPoints },
                    { render: false, allowHPOverage: true }
                );
            }
        }

        // Run preUpdateItem rule element callbacks
        for (const rule of this.rules) {
            await rule.preUpdate?.(changed);
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
            this.actor.reset();
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

        if (!(this.actor.isOfType("creature") && this.canUserModify(game.user, "update"))) return;
        const actorUpdates: DocumentUpdateData<ActorPF2e> = {};
        for (const rule of this.rules) rule.onDelete?.(actorUpdates);

        // Remove attack effect from melee items if this deleted item was the source
        if (this.actor.isOfType("npc") && ["action", "consumable"].includes(this.type)) {
            const slug = this.slug ?? sluggify(this.name);
            if (!this.actor.isToken) {
                const itemUpdates: DocumentUpdateData<ItemPF2e>[] = [];
                for (const attack of this.actor.itemTypes.melee) {
                    const attackEffects = attack.system.attackEffects.value;
                    if (attackEffects.includes(slug)) {
                        const updatedEffects = attackEffects.filter((effect) => effect !== slug);
                        itemUpdates.push({
                            _id: attack.id,
                            system: { attackEffects: { value: updatedEffects } },
                        });
                    }
                }
                if (itemUpdates.length > 0) {
                    mergeObject(actorUpdates, { items: itemUpdates });
                }
            } else {
                // The above method of updating embedded items in an actor update does not work with synthetic actors
                const promises: Promise<ItemPF2e>[] = [];
                for (const item of this.actor.itemTypes.melee) {
                    const attackEffects = item.system.attackEffects.value;
                    if (attackEffects.includes(slug)) {
                        const updatedEffects = attackEffects.filter((effect) => effect !== slug);
                        promises.push(item.update({ ["system.attackEffects.value"]: updatedEffects }));
                    }
                }
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

    /** Returns items that should also be added when this item is created */
    createGrantedItems(): Promise<ItemPF2e[]>;

    /** Returns items that should also be deleted should this item be deleted */
    getLinkedItems?(): Embedded<ItemPF2e>[];
}

export { ItemPF2e, ItemConstructionContextPF2e };
