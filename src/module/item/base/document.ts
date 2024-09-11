import { ActorPF2e } from "@actor/base.ts";
import type { ContainerPF2e, PhysicalItemPF2e } from "@item";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables.ts";
import { ItemChatData, itemIsOfType } from "@item/helpers.ts";
import { ItemOriginFlag } from "@module/chat-message/data.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { preImportJSON } from "@module/doc-helpers.ts";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource, RuleElements } from "@module/rules/index.ts";
import { processGrantDeletions } from "@module/rules/rule-element/grant-item/helpers.ts";
import type { UserPF2e } from "@module/user/document.ts";
import { eventToRollMode } from "@scripts/sheet-util.ts";
import { EnrichmentOptionsPF2e } from "@system/text-editor.ts";
import { ErrorPF2e, htmlClosest, isObject, localizer, setHasElement, sluggify, tupleHasValue } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import { AfflictionSource } from "../affliction/data.ts";
import { PHYSICAL_ITEM_TYPES } from "../physical/values.ts";
import { MAGIC_TRADITIONS } from "../spell/values.ts";
import { ItemInstances } from "../types.ts";
import type {
    ConditionSource,
    EffectSource,
    FeatSource,
    ItemFlagsPF2e,
    ItemSourcePF2e,
    ItemSystemData,
    ItemType,
    RawItemChatData,
    TraitChatData,
} from "./data/index.ts";
import type { ItemTrait } from "./data/system.ts";
import type { ItemSheetPF2e } from "./sheet/sheet.ts";

/** The basic `Item` subclass for the system */
class ItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends Item<TParent> {
    /** Has this document completed `DataModel` initialization? */
    declare initialized: boolean;

    /** Additional item roll options set by rule elements */
    declare rollOptions: Set<string>;

    /** The item that granted this item, if any */
    declare grantedBy: ItemPF2e<ActorPF2e> | null;

    static override getDefaultArtwork(itemData: foundry.documents.ItemSource): { img: ImageFilePath } {
        return { img: `systems/pf2e/icons/default-icons/${itemData.type}.svg` as const };
    }

    /** Traits an item of this type can have */
    static get validTraits(): Partial<Record<ItemTrait, string>> {
        return {};
    }

    /** Prepared rule elements from this item */
    declare rules: RuleElementPF2e[];

    /** The sluggified name of the item **/
    get slug(): string | null {
        return this.system.slug;
    }

    /** The UUID of the item from which this one was copied (or is identical to if a compendium item) **/
    get sourceId(): ItemUUID | null {
        return this._id && this.pack ? this.uuid : this._stats.duplicateSource ?? this._stats.compendiumSource;
    }

    /** The recorded schema version of this item, updated after each data migration */
    get schemaVersion(): number | null {
        const legacyValue = R.isPlainObject(this._source.system.schema)
            ? Number(this._source.system.schema.version) || null
            : null;
        return Number(this._source.system._migration?.version) ?? legacyValue;
    }

    get description(): string {
        return this.system.description.value.trim();
    }

    /** Check whether this item is in-memory-only on an actor rather than being a world item or embedded and stored */
    get inMemoryOnly(): boolean {
        return !this.collection.has(this.id);
    }

    /**
     * Set a source ID on a dropped embedded item without a full data reset
     * This is currently necessary as of 10.291 due to system measures to prevent premature data preparation
     */
    static override fromDropData<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data: object,
        options?: Record<string, unknown>,
    ): Promise<TDocument | undefined>;
    static override fromDropData(
        data: object,
        options?: Record<string, unknown>,
    ): Promise<foundry.abstract.Document | undefined> {
        if ("uuid" in data && UUIDUtils.isItemUUID(data.uuid)) {
            const item = fromUuidSync(data.uuid);
            if (item instanceof ItemPF2e && item.parent && !item.sourceId) {
                // Upstream would do this via `item.updateSource(...)`, causing a data reset
                item._source._stats.duplicateSource = item.uuid;
                item._stats.duplicateSource = item._source._stats.duplicateSource;
                item._source._stats.compendiumSource ??= item.uuid.startsWith("Compendium.") ? item.uuid : null;
                item._stats.compendiumSource = item._source._stats.compendiumSource;
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
    override async delete(operation: Partial<DatabaseDeleteOperation<TParent>> = {}): Promise<this | undefined> {
        if (this.actor) {
            await this.actor.deleteEmbeddedDocuments("Item", [this.id], R.omit(operation, ["parent"]));
            return this;
        }

        return super.delete(operation);
    }

    /** Generate a list of strings for use in predication */
    getRollOptions(prefix = this.type, { includeGranter = true } = {}): string[] {
        if (prefix.length === 0) throw ErrorPF2e("`prefix` must be at least one character long");

        const { value: traits = [], rarity = null, otherTags } = this.system.traits;
        const traitOptions = ((): string[] => {
            // Additionally include annotated traits without their annotations
            const damageType = Object.keys(CONFIG.PF2E.damageTypes).join("|");
            const diceOrNumber = /-(?:[0-9]*d)?[0-9]+(?:-min)?$/;
            const versatile = new RegExp(`-(?:b|p|s|${damageType})$`);
            const deannotated = traits
                .filter((t) => diceOrNumber.test(t) || versatile.test(t))
                .map((t) => t.replace(diceOrNumber, "").replace(versatile, ""));
            return [traits, deannotated].flat().map((t) => `trait:${t}`);
        })();

        const slug = this.slug ?? sluggify(this.name);
        const granterOptions = includeGranter
            ? this.grantedBy?.getRollOptions("granter", { includeGranter: false }).map((o) => `${prefix}:${o}`) ?? []
            : [];

        const rollOptions = [
            `${prefix}:id:${this.id}`,
            `${prefix}:${slug}`,
            `${prefix}:slug:${slug}`,
            ...granterOptions,
            ...Array.from(this.rollOptions).map((o) => `${prefix}:${o}`),
            ...traitOptions.map((t) => `${prefix}:${t}`),
            ...otherTags.map((t) => `${prefix}:tag:${t}`),
        ];

        if (rarity) {
            rollOptions.push(`${prefix}:rarity:${rarity}`);
        }

        if (this.isOfType("spell") || traits.some((t) => ["magical", ...MAGIC_TRADITIONS].includes(t))) {
            rollOptions.push(`${prefix}:magical`);
        }

        // The heightened level of a spell is retrievable from its getter but not prepared level data
        const level = this.isOfType("spell") ? this.rank : this.system.level?.value ?? null;
        if (typeof level === "number") {
            rollOptions.push(`${prefix}:level:${level}`);
        }

        const itemType = this.isOfType("feat") && this.isFeature ? "feature" : this.type;
        if (prefix !== itemType) {
            rollOptions.unshift(`${prefix}:type:${itemType}`);
        }

        return rollOptions;
    }

    override getRollData(): NonNullable<EnrichmentOptionsPF2e["rollData"]> {
        const actorRollData = this.actor?.getRollData() ?? { actor: null };
        return { ...actorRollData, item: this };
    }

    /**
     * Create a chat card for this item and either return the message or send it to the chat log. Many cards contain
     * follow-up options for attack rolls, effect application, etc.
     */
    async toMessage(
        event?: Maybe<Event | JQuery.TriggeredEvent>,
        options: { rollMode?: RollMode | "roll"; create?: boolean; data?: Record<string, unknown> } = {},
    ): Promise<ChatMessagePF2e | undefined> {
        if (!this.actor) throw ErrorPF2e(`Cannot create message for unowned item ${this.name}`);

        // Basic template rendering data
        const template = `systems/pf2e/templates/chat/${sluggify(this.type)}-card.hbs`;
        const token = this.actor.token;
        const nearestItem = htmlClosest(event?.target, ".item");
        const rollOptions = options.data ?? { ...(nearestItem?.dataset ?? {}) };
        const templateData = {
            actor: this.actor,
            tokenId: token ? `${token.parent?.id}.${token.id}` : null,
            item: this,
            data: await this.getChatData(undefined, rollOptions),
        };

        // Basic chat message data
        const originalEvent = event instanceof Event ? event : event?.originalEvent;
        const rollMode = options.rollMode ?? eventToRollMode(originalEvent);
        const chatData = ChatMessagePF2e.applyRollMode(
            {
                style: CONST.CHAT_MESSAGE_STYLES.OTHER,
                speaker: ChatMessagePF2e.getSpeaker({
                    actor: this.actor,
                    token: this.actor.getActiveTokens(false, true).at(0),
                }),
                content: await renderTemplate(template, templateData),
                flags: { pf2e: { origin: this.getOriginData() } },
            },
            rollMode,
        );

        // Create the chat message
        return options.create ?? true
            ? ChatMessagePF2e.create(chatData, { rollMode, renderSheet: false })
            : new ChatMessagePF2e(chatData, { rollMode });
    }

    /** A shortcut to `item.toMessage(..., { create: true })`, kept for backward compatibility */
    async toChat(event?: JQuery.TriggeredEvent): Promise<ChatMessagePF2e | undefined> {
        return this.toMessage(event, { create: true });
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this.initialized = false;
        this.rules = [];
        this.rollOptions = new Set();

        super._initialize(options);
    }

    /**
     * Never prepare data except as part of `DataModel` initialization. If embedded, don't prepare data if the parent is
     * not yet initialized. See https://github.com/foundryvtt/foundryvtt/issues/7987
     */
    override prepareData(): void {
        if (this.initialized) return;
        if (!this.parent || this.parent.initialized) {
            this.initialized = true;
            super.prepareData();
        }
    }

    /** Ensure the presence of the pf2e flag scope with default properties and values */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.slug ||= null;
        this.system.description.addenda = [];
        this.system.description.override = null;

        const flags = this.flags;
        flags.pf2e = fu.mergeObject(flags.pf2e ?? {}, { rulesSelections: {} });

        const traits = this.system.traits;
        if (traits.value) {
            traits.value = traits.value.filter((t) => t in this.constructor.validTraits);
        }

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

        this.grantedBy = this.actor?.items.get(this.flags.pf2e.grantedBy?.id ?? "") ?? null;
    }

    prepareRuleElements(options: Omit<RuleElementOptions, "parent"> = {}): RuleElementPF2e[] {
        if (!this.actor) throw ErrorPF2e("Rule elements may only be prepared from embedded items");
        return (this.rules = this.actor.canHostRuleElements
            ? RuleElements.fromOwnedItem({ ...options, parent: this as ItemPF2e<NonNullable<TParent>> })
            : []);
    }

    /** Pull the latest system data from the source compendium and replace this item's with it */
    async refreshFromCompendium(options: RefreshFromCompendiumParams = {}): Promise<this | null> {
        if (this.uuid === this.sourceId) {
            throw ErrorPF2e(`Item "${this.name}" (${this.uuid}) is its own source.`);
        }
        if (!this.sourceId?.startsWith("Compendium.")) {
            throw ErrorPF2e(`Item "${this.name}" (${this.uuid}) has no compendium source.`);
        }

        options.name ??= true;
        options.update ??= true;
        options.notify ??= options.update;

        const currentSource = this.toObject();
        const localize = localizer("PF2E.Item.RefreshFromCompendium");
        if (
            currentSource.system.rules.some(
                (r) => typeof r.key === "string" && ["ChoiceSet", "GrantItem"].includes(r.key),
            )
        ) {
            ui.notifications.warn(localize("Tooltip.Disabled"));
            return null;
        }

        const latestSource = (await fromUuid<this>(this.sourceId))?.toObject();
        if (!latestSource) {
            ui.notifications.warn(localize("SourceNotFound", { item: this.name, sourceId: this.sourceId }));
            return null;
        } else if (latestSource.type !== this.type) {
            ui.notifications.error(localize("DifferentItemType", { item: this.name, uuid: this.uuid }));
            return null;
        }

        const updates: Partial<foundry.documents.ItemSource> & { system: ItemSourcePF2e["system"] } = {
            name: options.name ? latestSource.name : currentSource.name,
            img: latestSource.img,
            system: fu.deepClone(latestSource.system),
        };

        if (updates.system.level && currentSource.type === "feat") {
            updates.system.level = {
                value: updates.system.level.value,
                taken: currentSource.system.level.taken,
            };
        }

        if (this.isOfType("physical") && itemIsOfType(currentSource, "physical")) {
            // Preserve basic physical data
            fu.mergeObject(updates, {
                "system.containerId": currentSource.system.containerId,
                "system.equipped": currentSource.system.equipped,
                "system.material": currentSource.system.material,
                "system.quantity": currentSource.system.quantity,
                "system.size": currentSource.system.size,
            });

            // Preserve runes
            if (itemIsOfType(currentSource, "armor", "shield", "weapon")) {
                fu.mergeObject(updates, { "system.runes": currentSource.system.runes });
            }

            // Refresh subitems
            const updatedSubitems = (
                await Promise.all(this.subitems.map((i) => i.refreshFromCompendium({ ...options, update: false })))
            ).filter(R.isTruthy);
            if (updatedSubitems.length < this.subitems.size) {
                ui.notifications.error(localize("SubitemFailure", { item: this.name, uuid: this.uuid }));
                return null;
            }
            fu.mergeObject(updates, { "system.subitems": updatedSubitems.map((i) => i.toObject()) });

            if (
                currentSource.type === "consumable" &&
                currentSource.system.spell?.system?.traits &&
                tupleHasValue(["scroll", "wand"], currentSource.system.category) &&
                latestSource.type === "consumable" &&
                !latestSource.system.spell
            ) {
                // If a spell consumable, refresh the spell as well as the consumable
                const spellSourceId = currentSource._stats.compendiumSource ?? currentSource._stats.duplicateSource;
                const refreshedSpell = spellSourceId ? await fromUuid(spellSourceId) : null;
                if (refreshedSpell instanceof ItemPF2e && refreshedSpell.isOfType("spell")) {
                    const spellConsumableData = await createConsumableFromSpell(refreshedSpell, {
                        type: currentSource.system.category,
                        heightenedLevel: currentSource.system.spell.system.location.heightenedLevel,
                    });
                    fu.mergeObject(updates, {
                        name: spellConsumableData.name,
                        system: { spell: spellConsumableData.system.spell },
                    });
                } else {
                    const formatArgs = { item: currentSource.system.spell.name, sourceId: spellSourceId };
                    ui.notifications.warn(localize("SourceNotFound", formatArgs));
                    return null;
                }
            }
        } else if (itemIsOfType(currentSource, "campaignFeature", "feat", "spell")) {
            // Preserve feat and spellcasting entry location
            fu.mergeObject(updates, { "system.location": currentSource.system.location });
        }

        if (currentSource.type === "feat" && currentSource.system.level.taken) {
            fu.mergeObject(updates, { "system.level.taken": currentSource.system.level.taken });
        }

        if (options.update) {
            await this.update(updates, { diff: false, recursive: false });
        } else {
            this.updateSource(updates, { diff: false, recursive: false });
        }
        if (options.notify) ui.notifications.info(localize("Success", { item: this.name }));

        return this;
    }

    getOriginData(): ItemOriginFlag {
        return {
            actor: this.actor?.uuid,
            uuid: this.uuid,
            type: this.type as ItemType,
            rollOptions: [this.actor?.getSelfRollOptions("origin"), this.getRollOptions("origin:item")]
                .flat()
                .filter(R.isTruthy),
        };
    }

    /* -------------------------------------------- */
    /*  Chat Card Data                              */
    /* -------------------------------------------- */

    /**
     * Internal method that transforms data into something that can be used for chat.
     * Currently renders description text using enrichHTML.
     */
    protected async processChatData(
        htmlOptions: EnrichmentOptionsPF2e = {},
        chatData: RawItemChatData,
    ): Promise<RawItemChatData> {
        return new ItemChatData({ item: this, data: chatData, htmlOptions }).process();
    }

    async getChatData(
        htmlOptions: EnrichmentOptionsPF2e = {},
        _rollOptions: Record<string, unknown> = {},
    ): Promise<RawItemChatData> {
        if (!this.actor) throw ErrorPF2e(`Cannot retrieve chat data for unowned item ${this.name}`);
        const data = fu.deepClone({ ...this.system, traits: this.traitChatData() });
        return this.processChatData(htmlOptions, data);
    }

    protected traitChatData(
        dictionary: Record<string, string | undefined> = this.constructor.validTraits,
        traits = this.system.traits.value ?? [],
    ): TraitChatData[] {
        const traitChatLabels = traits
            .map((trait) => {
                const label = game.i18n.localize(dictionary[trait] ?? trait);
                const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;

                return {
                    value: trait,
                    label,
                    description: traitDescriptions[trait],
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

        return traitChatLabels;
    }

    /** Don't allow the user to create a condition or spellcasting entry from the sidebar. */
    static override createDialog<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: Record<string, unknown>,
        context?: {
            parent?: TDocument["parent"];
            pack?: Collection<TDocument> | null;
            types?: ItemType[];
        } & Partial<FormApplicationOptions>,
    ): Promise<TDocument | null>;
    static override async createDialog(
        data: { folder?: string } = {},
        context: {
            parent?: ActorPF2e | null;
            pack?: Collection<ItemPF2e<null>> | null;
            types?: string[];
        } & Partial<FormApplicationOptions> = {},
    ): Promise<Item | null> {
        context.classes = [...(context.classes ?? []), "dialog-item-create"];
        context.types &&= R.unique(context.types);
        context.types ??= Object.keys(game.system.documentTypes.Item);

        // Figure out the types to omit
        const omittedTypes: ItemType[] = ["condition", "spellcastingEntry", "lore"];
        if (BUILD_MODE === "production") omittedTypes.push("affliction", "book");
        if (game.settings.get("pf2e", "campaignType") !== "kingmaker") omittedTypes.push("campaignFeature");

        for (const type of omittedTypes) {
            context.types.findSplice((t) => t === type);
        }

        return super.createDialog(data, context);
    }

    /** Assess and pre-process this JSON data, ensuring it's importable and fully migrated */
    override async importFromJSON(json: string): Promise<this> {
        const processed = await preImportJSON(json);
        return processed ? super.importFromJSON(processed) : this;
    }

    /** Include the item type along with data from upstream */
    override toDragData(): { type: string; itemType: string; [key: string]: unknown } {
        return { ...super.toDragData(), itemType: this.type };
    }

    static override async createDocuments<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: (TDocument | PreCreate<TDocument["_source"]>)[],
        operation?: Partial<DatabaseCreateOperation<TDocument["parent"]>>,
    ): Promise<TDocument[]>;
    static override async createDocuments(
        data: (ItemPF2e | PreCreate<ItemSourcePF2e>)[] = [],
        operation: Partial<DatabaseCreateOperation<ActorPF2e | null>> = {},
    ): Promise<foundry.abstract.Document[]> {
        // Convert all `ItemPF2e`s to source objects
        const sources: PreCreate<ItemSourcePF2e>[] = data.map(
            (d): PreCreate<ItemSourcePF2e> => (d instanceof ItemPF2e ? d.toObject() : d),
        );

        // Migrate source in case of importing from an old compendium
        for (const source of [...sources]) {
            source.effects = []; // Never

            if (source.type === "spellcastingEntry" || R.isEmpty(R.pick(source, ["flags", "system"]))) {
                // The item has no migratable data: set schema version and skip
                const migrationSource = { _migration: { version: MigrationRunnerBase.LATEST_SCHEMA_VERSION } };
                source.system = fu.mergeObject(source.system ?? {}, migrationSource);
                continue;
            }
            const item = new CONFIG.Item.documentClass(source);
            await MigrationRunner.ensureSchemaVersion(item, MigrationList.constructFromVersion(item.schemaVersion));
            data.splice(data.indexOf(source), 1, item.toObject());
        }

        const actor = operation.parent;
        if (!actor) return super.createDocuments(sources, operation);

        // Check if this item is valid for this actor
        if (sources.some((s) => !actor.checkItemValidity(s))) {
            return [];
        }

        // Prevent creation of effects to which the actor is immune
        const effectSources = sources.filter((s): s is PreCreate<AfflictionSource | ConditionSource | EffectSource> =>
            ["affliction", "condition", "effect"].includes(s.type),
        );
        for (const source of effectSources) {
            const effect = new CONFIG.PF2E.Item.documentClasses[source.type](fu.deepClone(source), { parent: actor });
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
            (type): ItemPF2e<ActorPF2e>[] => actor.itemTypes[type],
        );
        if (preCreateDeletions.length > 0) {
            const idsToDelete = preCreateDeletions.map((i) => i.id);
            await actor.deleteEmbeddedDocuments("Item", idsToDelete, { render: false });
        }

        // Convert all non-kit sources to item objects, and recursively extract the simple grants from ABC items
        const items = await (async (): Promise<ItemPF2e<ActorPF2e>[]> => {
            /** Internal function to recursively get all simple granted items */
            async function getSimpleGrants(item: ItemPF2e<ActorPF2e>): Promise<ItemPF2e<ActorPF2e>[]> {
                const granted = (await item.createGrantedItems?.({ size: operation.parent?.size })) ?? [];
                if (granted.length === 0) return [];
                const reparented = granted.map(
                    (i): ItemPF2e<ActorPF2e> =>
                        (i.parent
                            ? i
                            : new CONFIG.Item.documentClass(i._source, { parent: actor })) as ItemPF2e<ActorPF2e>,
                );
                return [...reparented, ...(await Promise.all(reparented.map(getSimpleGrants))).flat()];
            }

            const items = sources.map((source): ItemPF2e<ActorPF2e> => {
                if (!(operation.keepId || operation.keepEmbeddedIds)) {
                    source._id = fu.randomID();
                }
                return new CONFIG.Item.documentClass(source, { parent: actor }) as ItemPF2e<ActorPF2e>;
            });

            // If any item we plan to add will add new items (such as ABC items), add those too
            // When this occurs, keepId is switched on.
            for (const item of [...items]) {
                const grants = await getSimpleGrants(item);
                if (grants.length) {
                    operation.keepId = true;
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
                await rule.preCreate?.({
                    itemSource,
                    ruleSource,
                    pendingItems: outputSources,
                    tempItems: items,
                    operation,
                });
            }
        }

        // Pre-sort unnested, class features according to their sorting from the class
        if (outputSources.some((i) => i.type === "class")) {
            const classFeatures = outputSources.filter(
                (i): i is FeatSource =>
                    i.type === "feat" &&
                    typeof i.system?.level?.value === "number" &&
                    i.system.category === "classfeature" &&
                    !i.flags?.pf2e?.grantedBy,
            );
            for (const feature of classFeatures) {
                feature.sort = classFeatures.indexOf(feature) * 100 * (feature.system.level?.value ?? 1);
            }
        }

        const nonKits = outputSources.filter((source) => source.type !== "kit");
        return super.createDocuments(nonKits, operation);
    }

    static override async deleteDocuments<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        ids?: string[],
        operation?: Partial<DatabaseCreateOperation<TDocument["parent"]>>,
    ): Promise<TDocument[]>;
    static override async deleteDocuments(
        ids: string[] = [],
        operation: Partial<DatabaseCreateOperation<ActorPF2e | null>> = {},
    ): Promise<foundry.abstract.Document[]> {
        ids = Array.from(new Set(ids));
        const actor = operation.parent;
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
                    await rule.preDelete?.({ pendingItems: items, operation });
                }

                await processGrantDeletions(item, items);
            }
            ids = Array.from(new Set(items.map((i) => i.id))).filter((id) => actor.items.has(id));
        }

        return super.deleteDocuments(ids, operation);
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _preCreate(
        data: this["_source"],
        options: DatabaseCreateOperation<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        // Sort traits
        this._source.system.traits.value?.sort();

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
                    { render: false, allowHPOverage: true },
                );
            }
        }

        // Remove any rule elements that request their own removal upon item creation
        this._source.system.rules = this._source.system.rules.filter(
            (r) => !("removeUponCreate" in r) || !r.removeUponCreate,
        );

        return super._preCreate(data, options, user);
    }

    /** Keep `TextEditor` and anything else up to no good from setting this item's description to `null` */
    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateOperation<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (changed.system?.description?.value === null) {
            changed.system.description.value = "";
        }

        // Ensure level is a positive integer
        if (changed.system?.level && "value" in changed.system.level) {
            changed.system.level.value = Math.max(0, Math.trunc(Number(changed.system.level.value) || 0));
        }

        // Normalize the slug, setting to `null` if empty
        if (typeof changed.system?.slug === "string") {
            changed.system.slug = sluggify(changed.system.slug) || null;
        }

        // Sort traits for easier visual scanning in breakpoints
        if (changed.system?.traits) {
            if (Array.isArray(changed.system.traits.value)) {
                changed.system.traits.value.sort();
            }

            if (Array.isArray(changed.system.traits.otherTags)) {
                changed.system.traits.otherTags = changed.system.traits.otherTags.map((t) => sluggify(t)).sort();
            }
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
                    { render: false, allowHPOverage: true },
                );
            }
        }

        // Run preUpdateItem rule element callbacks
        for (const rule of this.rules) {
            await rule.preUpdate?.(changed);
        }

        return super._preUpdate(changed, options, user);
    }

    /** Call onCreate rule-element hooks */
    protected override _onCreate(
        data: ItemSourcePF2e,
        operation: DatabaseCreateOperation<TParent>,
        userId: string,
    ): void {
        super._onCreate(data, operation, userId);
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

    /** Refresh the Item Directory if this item isn't embedded */
    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        operation: DatabaseUpdateOperation<TParent>,
        userId: string,
    ): void {
        super._onUpdate(data, operation, userId);
        if (game.ready && game.items.get(this.id) === this) {
            ui.items.render();
        }
    }

    /** Call onDelete rule-element hooks */
    protected override _onDelete(operation: DatabaseDeleteOperation<TParent>, userId: string): void {
        super._onDelete(operation, userId);
        if (!(this.actor && game.user.id === userId)) return;

        if (!(this.actor.isOfType("creature") && this.canUserModify(game.user, "update"))) return;
        const actorUpdates: Record<string, unknown> = {};
        for (const rule of this.rules) rule.onDelete?.(actorUpdates);

        // Remove attack effect from melee items if this deleted item was the source
        if (this.actor.isOfType("npc") && ["action", "consumable"].includes(this.type)) {
            const slug = this.slug ?? sluggify(this.name);
            if (!this.actor.isToken) {
                const itemUpdates: Record<string, unknown>[] = [];
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
                    fu.mergeObject(actorUpdates, { items: itemUpdates });
                }
            } else {
                // The above method of updating embedded items in an actor update does not work with synthetic actors
                const promises: Promise<ItemPF2e<ActorPF2e> | undefined>[] = [];
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

    /** To be overridden by subclasses to extend the HTML string that will become part of the embed */
    protected embedHTMLString(_config: DocumentHTMLEmbedConfig, _options: EnrichmentOptions): string {
        return this.description;
    }

    async _buildEmbedHTML(config: DocumentHTMLEmbedConfig, options: EnrichmentOptions): Promise<HTMLCollection> {
        // As per foundry.js: JournalEntryPage#_embedTextPage
        options = { ...options, relativeTo: this };
        const {
            secrets = options.secrets,
            documents = options.documents,
            links = options.links,
            rolls = options.rolls,
            embeds = options.embeds,
        } = config;
        foundry.utils.mergeObject(options, { secrets, documents, links, rolls, embeds });

        // Get correct HTML
        const container = document.createElement("div");
        container.innerHTML = await TextEditor.enrichHTML(this.embedHTMLString(config, options), options);
        return container.children;
    }
}

interface ItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends Item<TParent> {
    constructor: typeof ItemPF2e;
    flags: ItemFlagsPF2e;
    readonly _source: ItemSourcePF2e;
    system: ItemSystemData;

    _sheet: ItemSheetPF2e<this> | null;

    get sheet(): ItemSheetPF2e<this>;

    prepareSiblingData?(this: ItemPF2e<ActorPF2e>): void;
    prepareActorData?(this: ItemPF2e<ActorPF2e>): void;
    /** Optional data-preparation callback executed after rule-element synthetics are prepared */
    onPrepareSynthetics?(this: ItemPF2e<ActorPF2e>): void;

    /** Returns items that should also be added when this item is created */
    createGrantedItems?(options?: object): Promise<ItemPF2e[]>;

    /** Returns items that should also be deleted should this item be deleted */
    getLinkedItems?(): ItemPF2e<ActorPF2e>[];
}

/** A `Proxy` to to get Foundry to construct `ItemPF2e` subclasses */
const ItemProxyPF2e = new Proxy(ItemPF2e, {
    construct(
        _target,
        args: [source: PreCreate<ItemSourcePF2e>, context?: DocumentConstructionContext<ActorPF2e | null>],
    ) {
        const source = args[0];
        const type =
            source?.type === "armor" && (source.system?.category as string | undefined) === "shield"
                ? "shield"
                : source?.type;
        const ItemClass: typeof ItemPF2e = CONFIG.PF2E.Item.documentClasses[type];
        if (!ItemClass) {
            throw ErrorPF2e(`Item type ${type} does not exist and item module sub-types are not supported`);
        }
        return new ItemClass(...args);
    },
});

interface RefreshFromCompendiumParams {
    /** Whether to overwrite the name if it is different */
    name?: boolean;
    /** Whether to notify the user that the item has been refreshed */
    notify?: boolean;
    /** Whether to run the update: if false, a clone with updated source is returned. */
    update?: boolean;
}

export { ItemPF2e, ItemProxyPF2e };
