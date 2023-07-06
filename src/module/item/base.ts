import { ActorPF2e } from "@actor/base.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { preImportJSON } from "@module/doc-helpers.ts";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElements, RuleElementSource } from "@module/rules/index.ts";
import { processGrantDeletions } from "@module/rules/rule-element/grant-item/helpers.ts";
import { UserPF2e } from "@module/user/document.ts";
import { EnrichHTMLOptionsPF2e } from "@system/text-editor.ts";
import { ErrorPF2e, isObject, setHasElement, sluggify } from "@util";
import { AfflictionSource } from "./affliction/data.ts";
import { ContainerPF2e } from "./container/document.ts";
import {
    ConditionSource,
    EffectSource,
    FeatSource,
    ItemSourcePF2e,
    ItemSummaryData,
    ItemType,
    TraitChatData,
} from "./data/index.ts";
import { isItemSystemData, isPhysicalData } from "./data/helpers.ts";
import { PhysicalItemPF2e } from "./physical/document.ts";
import { PHYSICAL_ITEM_TYPES } from "./physical/values.ts";
import { ItemSheetPF2e } from "./sheet/base.ts";
import { ItemFlagsPF2e, ItemSystemData } from "./data/base.ts";
import { ItemInstances } from "./types.ts";
import { UUIDUtils } from "@util/uuid.ts";
import { ItemOriginFlag } from "@module/chat-message/data.ts";

/** Override and extend the basic :class:`Item` implementation */
class ItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends Item<TParent> {
    /** Prepared rule elements from this item */
    declare rules: RuleElementPF2e[];

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

    /** The item that granted this item, if any */
    get grantedBy(): ItemPF2e<ActorPF2e> | null {
        return this.actor?.items.get(this.flags.pf2e.grantedBy?.id ?? "") ?? null;
    }

    /** Check whether this item is in-memory-only on an actor rather than being a world item or embedded and stored */
    get isTemporary(): boolean {
        return !!this.actor && !this.actor.items.has(this.id ?? "");
    }

    /**
     * Set a source ID on a dropped embedded item without a full data reset
     * This is currently necessary as of 10.291 due to system measures to prevent premature data preparation
     */
    static override fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>
    ): Promise<TDocument | undefined>;
    static override fromDropData(data: object, options?: Record<string, unknown>): Promise<ClientDocument | undefined> {
        if ("uuid" in data && UUIDUtils.isItemUUID(data.uuid)) {
            const item = fromUuidSync(data.uuid);
            if (item instanceof ItemPF2e && item.parent && !item.sourceId) {
                // Upstream would do this via `item.updateSource(...)`, causing a data reset
                item._source.flags = mergeObject(item._source.flags, { core: { sourceId: item.uuid } });
                item.flags = mergeObject(item.flags, { core: { sourceId: item.uuid } });
            }
        }

        return super.fromDropData(data, options);
    }

    /** Check this item's type (or whether it's one among multiple types) without a call to `instanceof` */
    isOfType<T extends ItemType>(...types: T[]): this is ItemInstances<TParent>[T];
    isOfType(type: "physical"): this is PhysicalItemPF2e<TParent>;
    isOfType<T extends "physical" | ItemType>(
        ...types: T[]
    ): this is T extends "physical"
        ? PhysicalItemPF2e<TParent>
        : T extends ItemType
        ? ItemInstances<TParent>[T]
        : never;
    isOfType(...types: string[]): boolean {
        return types.some((t) => (t === "physical" ? setHasElement(PHYSICAL_ITEM_TYPES, this.type) : this.type === t));
    }

    /** Redirect the deletion of any owned items to ActorPF2e#deleteEmbeddedDocuments for a single workflow */
    override async delete(context: DocumentModificationContext<TParent> = {}): Promise<this> {
        if (this.actor) {
            await this.actor.deleteEmbeddedDocuments(
                "Item",
                [this.id],
                context as DocumentModificationContext<NonNullable<TParent>>
            );
            return this;
        }
        return super.delete(context);
    }

    /** Generate a list of strings for use in predication */
    getRollOptions(prefix = this.type): string[] {
        if (prefix.length === 0) throw ErrorPF2e("`prefix` must be at least one character long");

        const slug = this.slug ?? sluggify(this.name);

        const traitOptions = ((): string[] => {
            const traits = this.system.traits?.value ?? [];
            // Additionally include annotated traits without their annotations
            const damageType = Object.keys(CONFIG.PF2E.damageTypes).join("|");
            const diceOrNumber = /-(?:[0-9]*d)?[0-9]+(?:-min)?$/;
            const versatile = new RegExp(`-(?:b|p|s|${damageType})$`);
            const deannotated = traits
                .filter((t) => diceOrNumber.test(t) || versatile.test(t))
                .map((t) => t.replace(diceOrNumber, "").replace(versatile, ""));
            return [traits, deannotated].flat().map((t) => `trait:${t}`);
        })();

        const options = [
            `${prefix}:id:${this.id}`,
            `${prefix}:${slug}`,
            `${prefix}:slug:${slug}`,
            ...traitOptions.map((t) => `${prefix}:${t}`),
        ];

        // The heightened level of a spell is retrievable from its getter but not prepared level data
        const level = this.isOfType("spell") ? this.level : this.system.level?.value ?? null;
        if (typeof level === "number") {
            options.push(`${prefix}:level:${level}`);
        }

        if (["item", "parent"].includes(prefix)) {
            const itemType = this.isOfType("feat") && this.isFeature ? "feature" : this.type;
            options.unshift(`${prefix}:type:${itemType}`);
        }

        return options;
    }

    override getRollData(): NonNullable<EnrichHTMLOptionsPF2e["rollData"]> {
        const actorRollData = this.actor?.getRollData() ?? { actor: null };
        return { ...actorRollData, item: this };
    }

    /**
     * Create a chat card for this item and either return the message or send it to the chat log. Many cards contain
     * follow-up options for attack rolls, effect application, etc.
     */
    async toMessage(
        event?: MouseEvent | JQuery.TriggeredEvent,
        {
            rollMode = undefined,
            create = true,
            data = {},
        }: { rollMode?: RollMode; create?: boolean; data?: Record<string, unknown> } = {}
    ): Promise<ChatMessagePF2e | undefined> {
        if (!this.actor) throw ErrorPF2e(`Cannot create message for unowned item ${this.name}`);

        // Basic template rendering data
        const template = `systems/pf2e/templates/chat/${this.type}-card.hbs`;
        const token = this.actor.token;
        const nearestItem = event?.currentTarget.closest(".item") ?? {};
        const contextualData = Object.keys(data).length > 0 ? data : nearestItem.dataset || {};
        const templateData = {
            actor: this.actor,
            tokenId: token ? `${token.parent?.id}.${token.id}` : null,
            item: this,
            data: await this.getChatData(undefined, contextualData),
        };

        // Basic chat message data
        const chatData: PreCreate<foundry.documents.ChatMessageSource> = {
            speaker: ChatMessagePF2e.getSpeaker({
                actor: this.actor,
                token: this.actor.getActiveTokens(false, true)[0] ?? null,
            }),
            flags: {
                core: {
                    canPopout: true,
                },
                pf2e: {
                    origin: this.getOriginData(),
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

    protected override _initialize(options?: Record<string, unknown>): void {
        this.rules = [];
        super._initialize(options);
    }

    override prepareData(): void {
        // If embedded, don't prepare data if the parent's data model hasn't initialized all its properties
        if (this.parent && !this.parent.flags?.pf2e) return;

        super.prepareData();

        // Refresh the Item Directory if this item isn't embedded
        if (!this.isOwned && game.ready) ui.items.render();
    }

    /** Ensure the presence of the pf2e flag scope with default properties and values */
    override prepareBaseData(): void {
        super.prepareBaseData();

        const { flags } = this;
        flags.pf2e = mergeObject(flags.pf2e ?? {}, { rulesSelections: {} });

        // Temporary measure until upstream issue is addressed (`null` slug is being set to empty string)
        this.system.slug ||= null;

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

    prepareRuleElements(
        this: ItemPF2e<ActorPF2e>,
        options: Omit<RuleElementOptions, "parent"> = {}
    ): RuleElementPF2e[] {
        if (!this.actor) throw ErrorPF2e("Rule elements may only be prepared from embedded items");

        return (this.rules = this.actor.canHostRuleElements
            ? RuleElements.fromOwnedItem({ ...options, parent: this })
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
        } else if (currentSource.type === "feat" || currentSource.type === "spell") {
            // Preserve feat and spellcasting entry location
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

    getOriginData(): ItemOriginFlag {
        return { uuid: this.uuid, type: this.type as ItemType };
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
    static override createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
        } & Partial<FormApplicationOptions>
    ): Promise<TDocument | null>;
    static override async createDialog(
        data: { folder?: string } = {},
        options: {
            parent?: Actor<TokenDocument<Scene | null> | null> | null;
            pack?: Collection<ItemPF2e<null>> | null;
        } & Partial<FormApplicationOptions> = {}
    ): Promise<Item<Actor<TokenDocument<Scene | null> | null> | null> | null> {
        const original = game.system.documentTypes.Item;
        game.system.documentTypes.Item = original.filter(
            (itemType: string) =>
                !["condition", "spellcastingEntry", "lore"].includes(itemType) &&
                !(["affliction", "book"].includes(itemType) && BUILD_MODE === "production")
        );
        const withClasses: {
            parent?: Actor<TokenDocument<Scene | null> | null> | null;
            pack?: Collection<Item<Actor<TokenDocument<Scene | null> | null> | null>> | null;
        } & Partial<FormApplicationOptions> = {
            ...options,
            classes: [...(options.classes ?? []), "dialog-item-create"],
        };
        const newItem = super.createDialog(data, withClasses);
        game.system.documentTypes.Item = original;

        return newItem;
    }

    /** Assess and pre-process this JSON data, ensuring it's importable and fully migrated */
    override async importFromJSON(json: string): Promise<this> {
        const processed = await preImportJSON(this, json);
        return processed ? super.importFromJSON(processed) : this;
    }

    /** Include the item type along with data from upstream */
    override toDragData(): { type: string; itemType: string; [key: string]: unknown } {
        return { ...super.toDragData(), itemType: this.type };
    }

    static override async createDocuments<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: (TDocument | PreCreate<TDocument["_source"]>)[],
        context?: DocumentModificationContext<TDocument["parent"]>
    ): Promise<TDocument[]>;
    static override async createDocuments(
        data: (ItemPF2e | PreCreate<ItemSourcePF2e>)[] = [],
        context: DocumentModificationContext<ActorPF2e | null> = {}
    ): Promise<Item<Actor<TokenDocument<Scene | null> | null> | null>[]> {
        // Convert all `ItemPF2e`s to source objects
        const sources = data.map((d) => (d instanceof ItemPF2e ? d.toObject() : d));

        // Migrate source in case of importing from an old compendium
        for (const source of [...sources]) {
            source.effects = []; // Never

            if (!Object.keys(source).some((k) => k.startsWith("flags") || k.startsWith("system"))) {
                // The item has no migratable data: set schema version and skip
                source.system = { schema: { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION } };
                continue;
            }
            const item = new CONFIG.Item.documentClass(source);
            await MigrationRunner.ensureSchemaVersion(item, MigrationList.constructFromVersion(item.schemaVersion));
            data.splice(data.indexOf(source), 1, item.toObject());
        }

        const actor = context.parent;
        if (!actor) return super.createDocuments(sources, context);

        const validTypes = actor.allowedItemTypes;
        if (validTypes.includes("physical")) validTypes.push(...PHYSICAL_ITEM_TYPES, "kit");

        // Check if this item is valid for this actor
        for (const source of sources) {
            if (!validTypes.includes(source.type)) {
                ui.notifications.error(
                    game.i18n.format("PF2E.Item.CannotAddType", {
                        type: game.i18n.localize(CONFIG.Item.typeLabels[source.type] ?? source.type.titleCase()),
                    })
                );
                return [];
            }
        }

        // Prevent creation of effects to which the actor is immune
        const effectSources = sources.filter((s): s is PreCreate<AfflictionSource | ConditionSource | EffectSource> =>
            ["affliction", "condition", "effect"].includes(s.type)
        );
        for (const source of effectSources) {
            const effect = new CONFIG.PF2E.Item.documentClasses[source.type](deepClone(source), { parent: actor });
            const isUnaffected = effect.isOfType("condition") && !actor.isAffectedBy(effect);
            const isImmune = actor.isImmuneTo(effect);
            if (isUnaffected || isImmune) {
                sources.splice(sources.indexOf(source), 1);

                // Send a notification if the effect wasn't automatically added by an aura
                if (!(effect.isOfType("effect") && effect.fromAura)) {
                    const locKey = isUnaffected ? "PF2E.Damage.IWR.ActorIsUnaffected" : "PF2E.Damage.IWR.ActorIsImmune";
                    const message = game.i18n.format(locKey, { actor: actor.name, effect: effect.name });
                    ui.notifications.info(message);
                }
            }
        }

        // If any created types are "singular", remove existing competing ones.
        // actor.deleteEmbeddedDocuments() will also delete any linked items.
        const singularTypes = ["ancestry", "background", "class", "heritage", "deity"] as const;
        const singularTypesToDelete = singularTypes.filter((type) => sources.some((s) => s.type === type));
        const preCreateDeletions = singularTypesToDelete.flatMap(
            (type): ItemPF2e<ActorPF2e>[] => actor.itemTypes[type]
        );
        if (preCreateDeletions.length) {
            const idsToDelete = preCreateDeletions.map((i) => i.id);
            await actor.deleteEmbeddedDocuments("Item", idsToDelete, { render: false });
        }

        // Convert all non-kit sources to item objects, and recursively extract the simple grants from ABC items
        const items = await (async (): Promise<ItemPF2e<ActorPF2e>[]> => {
            /** Internal function to recursively get all simple granted items */
            async function getSimpleGrants(item: ItemPF2e<ActorPF2e>): Promise<ItemPF2e<ActorPF2e>[]> {
                const granted = (await item.createGrantedItems?.({ size: context.parent?.size })) ?? [];
                if (!granted.length) return [];
                const reparented = granted.map(
                    (i): ItemPF2e<ActorPF2e> =>
                        (i.parent
                            ? i
                            : new CONFIG.Item.documentClass(i._source, { parent: actor })) as ItemPF2e<ActorPF2e>
                );
                return [...reparented, ...(await Promise.all(reparented.map(getSimpleGrants))).flat()];
            }

            const items = sources.map((source): ItemPF2e<ActorPF2e> => {
                if (!(context.keepId || context.keepEmbeddedIds)) {
                    source._id = randomID();
                }
                return new CONFIG.Item.documentClass(source, { parent: actor }) as ItemPF2e<ActorPF2e>;
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
                    i.system.category === "classfeature" &&
                    !i.flags?.pf2e?.grantedBy
            );
            for (const feature of classFeatures) {
                feature.sort = classFeatures.indexOf(feature) * 100 * (feature.system.level?.value ?? 1);
            }
        }

        const nonKits = outputSources.filter((source) => source.type !== "kit");
        return super.createDocuments(nonKits, context);
    }

    static override async deleteDocuments<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        ids?: string[],
        context?: DocumentModificationContext<TDocument["parent"]>
    ): Promise<TDocument[]>;
    static override async deleteDocuments(
        ids: string[] = [],
        context: DocumentModificationContext<ActorPF2e | null> = {}
    ): Promise<Item<Actor<TokenDocument<Scene | null> | null> | null>[]> {
        ids = Array.from(new Set(ids));
        const actor = context.parent;
        if (actor) {
            const items = ids.flatMap((id) => actor.items.get(id) ?? []);

            // If a container is being deleted, its contents need to have their containerId references updated
            const containers = items.filter((i): i is ContainerPF2e<ActorPF2e> => i.isOfType("backpack"));
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

        return super.deleteDocuments(ids, context);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<TParent>,
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
        options: DocumentUpdateContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        if (changed.system?.description?.value === null) {
            changed.system.description.value = "";
        }

        // Normalize the slug, setting to `null` if empty
        if (typeof changed.system?.slug === "string") {
            changed.system.slug = sluggify(changed.system.slug) || null;
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
        options: DocumentModificationContext<TParent>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);
        if (!(this.actor && game.user.id === userId)) return;

        this.actor.reset();
        const actorUpdates: Record<string, unknown> = {};
        for (const rule of this.rules) {
            rule.onCreate?.(actorUpdates);
        }
        // Only update if there are more keys than just the `_id`
        const updateKeys = Object.keys(actorUpdates);
        if (updateKeys.length > 0 && !updateKeys.every((k) => k === "_id")) {
            this.actor.update(actorUpdates);
        }
    }

    /** Call onDelete rule-element hooks */
    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        super._onDelete(options, userId);
        if (!(this.actor && game.user.id === userId)) return;

        if (!(this.actor.isOfType("creature") && this.canUserModify(game.user, "update"))) return;
        const actorUpdates: DocumentUpdateData<ActorPF2e> = {};
        for (const rule of this.rules) rule.onDelete?.(actorUpdates);

        // Remove attack effect from melee items if this deleted item was the source
        if (this.actor.isOfType("npc") && ["action", "consumable"].includes(this.type)) {
            const slug = this.slug ?? sluggify(this.name);
            if (!this.actor.isToken) {
                const itemUpdates: DocumentUpdateData<this>[] = [];
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
                const promises: Promise<ItemPF2e<ActorPF2e>>[] = [];
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

        // Only update if there are more keys than just the `_id`
        const updateKeys = Object.keys(actorUpdates);
        if (updateKeys.length > 0 && !updateKeys.every((k) => k === "_id")) {
            this.actor.update(actorUpdates);
        }
    }
}

interface ItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends Item<TParent> {
    flags: ItemFlagsPF2e;
    readonly _source: ItemSourcePF2e;
    system: ItemSystemData;

    _sheet: ItemSheetPF2e<this> | null;

    get sheet(): ItemSheetPF2e<this>;

    prepareSiblingData?(this: ItemPF2e<ActorPF2e>): void;
    prepareActorData?(this: ItemPF2e<ActorPF2e>): void;

    /** Returns items that should also be added when this item is created */
    createGrantedItems(options?: object): Promise<ItemPF2e[]>;

    /** Returns items that should also be deleted should this item be deleted */
    getLinkedItems?(): ItemPF2e<ActorPF2e>[];
}

/** A `Proxy` to to get Foundry to construct `ItemPF2e` subclasses */
const ItemProxyPF2e = new Proxy(ItemPF2e, {
    construct(
        _target,
        args: [source: PreCreate<ItemSourcePF2e>, context?: DocumentConstructionContext<ActorPF2e | null>]
    ) {
        return new CONFIG.PF2E.Item.documentClasses[args[0].type](...args);
    },
});

export { ItemPF2e, ItemProxyPF2e };
