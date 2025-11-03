import type { ActorPF2e } from "@actor/base.ts";
import type { DialogV2Configuration } from "@client/applications/api/dialog.d.mts";
import type { DocumentHTMLEmbedConfig } from "@client/applications/ux/text-editor.d.mts";
import type { ItemUUID } from "@client/documents/_module.d.mts";
import type { ToCompendiumOptions } from "@client/documents/abstract/_module.d.mts";
import type { DropCanvasData } from "@client/helpers/hooks.d.mts";
import type { DocumentConstructionContext } from "@common/_types.d.mts";
import type {
    DatabaseCreateCallbackOptions,
    DatabaseCreateOperation,
    DatabaseDeleteCallbackOptions,
    DatabaseDeleteOperation,
    DatabaseUpdateCallbackOptions,
    Document,
} from "@common/abstract/_module.d.mts";
import type { ImageFilePath, RollMode } from "@common/constants.d.mts";
import type { ContainerPF2e, PhysicalItemPF2e } from "@item";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables.ts";
import { addOrUpgradeTrait, itemIsOfType, markdownToHTML } from "@item/helpers.ts";
import { ITEM_TYPES } from "@item/values.ts";
import type { ItemOriginFlag } from "@module/chat-message/data.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { preImportJSON } from "@module/doc-helpers.ts";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import { RuleElement, RuleElementOptions, RuleElementSource, RuleElements } from "@module/rules/index.ts";
import { processGrantDeletions } from "@module/rules/rule-element/grant-item/helpers.ts";
import { eventToRollMode } from "@module/sheet/helpers.ts";
import { type EnrichmentOptionsPF2e, type RollDataPF2e, TextEditorPF2e } from "@system/text-editor.ts";
import {
    ErrorPF2e,
    createHTMLElement,
    htmlClosest,
    localizer,
    objectHasKey,
    setHasElement,
    sluggify,
    tupleHasValue,
} from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import type { AfflictionSource } from "../affliction/data.ts";
import { PHYSICAL_ITEM_TYPES } from "../physical/values.ts";
import { MAGIC_TRADITIONS } from "../spell/values.ts";
import type { ItemInstances, ItemType } from "../types.ts";
import type {
    ConditionSource,
    EffectSource,
    FeatSource,
    ItemFlagsPF2e,
    ItemSourcePF2e,
    ItemSystemData,
    RawItemChatData,
    TraitChatData,
} from "./data/index.ts";
import type { ItemDescriptionData, ItemTrait } from "./data/system.ts";
import type { ItemSheetPF2e } from "./sheet/sheet.ts";

/** The basic `Item` subclass for the system */
class ItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends Item<TParent> {
    /** Additional item roll options not derived from an item's own data */
    declare specialOptions: string[];

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
    declare rules: RuleElement[];

    /** The sluggified name of the item **/
    get slug(): string | null {
        return this.system.slug;
    }

    /** The UUID of the item from which this one was copied (or is identical to if a compendium item) **/
    get sourceId(): ItemUUID | null {
        const isCompendiumItem = this._id && this.pack && !this.isEmbedded;
        return isCompendiumItem ? this.uuid : (this._stats.duplicateSource ?? this._stats.compendiumSource);
    }

    /** The recorded schema version of this item, updated after each data migration */
    get schemaVersion(): number | null {
        const legacyValue = R.isPlainObject(this._source.system.schema)
            ? Number(this._source.system.schema.version) || null
            : null;
        return Number(this._source.system._migration?.version) || legacyValue;
    }

    get description(): string {
        return this.system.description.value.trim();
    }

    /** Check whether this item is in-memory-only on an actor rather than being a world item or embedded and stored */
    get inMemoryOnly(): boolean {
        return !this.collection?.has(this.id);
    }

    /**
     * Set a source ID on a dropped embedded item without a full data reset
     * This is currently necessary as of 10.291 due to system measures to prevent premature data preparation
     */
    static override async fromDropData<T extends Document>(
        this: ConstructorOf<T>,
        data: object,
        options?: object,
    ): Promise<T | null>;
    static override async fromDropData(data: object, options?: Record<string, unknown>): Promise<Document | null> {
        if ("uuid" in data && UUIDUtils.isItemUUID(data.uuid)) {
            const item = await fromUuid(data.uuid);
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
    override async delete(
        operation: Partial<Omit<DatabaseDeleteOperation<TParent>, "parent" | "pack">> = {},
    ): Promise<this | undefined> {
        if (this.actor) {
            await this.actor.deleteEmbeddedDocuments("Item", [this.id], operation);
            return this;
        }

        return super.delete(operation);
    }

    /** Generate a list of strings for use in predication */
    getRollOptions(prefix = this.type, { includeGranter = true } = {}): string[] {
        if (prefix.length === 0) throw ErrorPF2e("`prefix` must be at least one character long");

        const { value: traits = [], rarity = null, otherTags, config = {} } = this.system.traits;
        const slug = this.slug ?? sluggify(this.name);
        const granterOptions = includeGranter
            ? (this.grantedBy?.getRollOptions("granter", { includeGranter: false }).map((o) => `${prefix}:${o}`) ?? [])
            : [];

        const rollOptions = [
            `${prefix}:id:${this.id}`,
            `${prefix}:${slug}`,
            `${prefix}:slug:${slug}`,
            ...granterOptions,
            ...Array.from(this.specialOptions).map((o) => `${prefix}:${o}`),
            ...otherTags.map((t) => `${prefix}:tag:${t}`),
            ...traits.map((t) => `${prefix}:trait:${t}`),
            ...Object.keys(config).map((k) => `${prefix}:trait:${k}`),
        ];

        if (rarity) {
            rollOptions.push(`${prefix}:rarity:${rarity}`);
        }

        if (this.isOfType("spell") || traits.some((t) => ["magical", ...MAGIC_TRADITIONS].includes(t))) {
            rollOptions.push(`${prefix}:magical`);
        }

        // The heightened level of a spell is retrievable from its getter but not prepared level data
        const level = this.isOfType("spell") ? this.rank : (this.system.level?.value ?? null);
        if (typeof level === "number") {
            rollOptions.push(`${prefix}:level:${level}`);
        }

        const itemType = this.isOfType("feat") && this.isFeature ? "feature" : this.type;
        if (prefix !== itemType) {
            rollOptions.unshift(`${prefix}:type:${itemType}`);
        }

        return rollOptions;
    }

    override getRollData(): RollDataPF2e {
        const actorRollData = this.actor?.getRollData() ?? { actor: null };
        return { ...actorRollData, item: this };
    }

    /**
     * Create a chat card for this item and either return the message or send it to the chat log. Many cards contain
     * follow-up options for attack rolls, effect application, etc.
     */
    async toMessage(
        event?: Maybe<Event>,
        options: { rollMode?: RollMode | "roll"; create?: boolean; data?: Record<string, unknown> } = {},
    ): Promise<ChatMessagePF2e | undefined> {
        if (!this.actor) throw ErrorPF2e(`Cannot create message for unowned item ${this.name}`);

        // Basic template rendering data
        const sluggifiedType = sluggify(this.type);
        const templateBase = ["weapon", "armor", "backpack"].includes(sluggifiedType) ? "equipment" : sluggifiedType;
        const template = `systems/pf2e/templates/chat/${templateBase}-card.hbs`;
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
        const rollMode = options.rollMode ?? eventToRollMode(event);
        const chatData = ChatMessagePF2e.applyRollMode(
            {
                style: CONST.CHAT_MESSAGE_STYLES.OTHER,
                speaker: ChatMessagePF2e.getSpeaker({
                    actor: this.actor,
                    token: this.actor.getActiveTokens(false, true).at(0),
                }),
                content: await fa.handlebars.renderTemplate(template, templateData),
                flags: { pf2e: { origin: this.getOriginData() } },
            },
            rollMode,
        );

        // Create the chat message
        const operation = { rollMode, renderSheet: false };
        return (options.create ?? true)
            ? ChatMessagePF2e.create(chatData, operation)
            : new ChatMessagePF2e(chatData, { rollMode });
    }

    /** A shortcut to `item.toMessage(..., { create: true })`, kept for backward compatibility */
    async toChat(event?: Event): Promise<ChatMessagePF2e | undefined> {
        return this.toMessage(event, { create: true });
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this.rules = [];
        this.specialOptions = [];

        super._initialize(options);
    }

    /** Ensure the presence of the pf2e flag scope with default properties and values */
    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.slug ||= null;
        this.system.description.addenda = [];
        this.system.description.override = null;
        this.system.description.initialized = false;

        // If this item has traits, filter for valid traits and check for annotations
        if (this.system.traits.value) {
            const validTraits = this.constructor.validTraits;
            const original = this.system.traits.value;
            this.system.traits.value = [];
            this.system.traits.config = {};
            for (const trait of original) {
                if (!(trait in validTraits)) continue;
                addOrUpgradeTrait(this.system.traits, trait);
            }
        }

        // Set item grant default values: pre-migration values will be strings, so temporarily check for objectness
        const flags = this.flags;
        flags.pf2e = fu.mergeObject(flags.pf2e ?? {}, { rulesSelections: {} });
        if (R.isPlainObject(flags.pf2e.grantedBy)) {
            flags.pf2e.grantedBy.onDelete ??= this.isOfType("physical") ? "detach" : "cascade";
        }
        const grants = (flags.pf2e.itemGrants ??= {});
        for (const grant of Object.values(grants)) {
            if (R.isPlainObject(grant)) {
                grant.onDelete ??= "detach";
            }
        }
        const actor = this.actor;
        const grantedById = this.flags.pf2e.grantedBy?.id;
        this.grantedBy = grantedById
            ? (actor?.items.get(grantedById) ?? actor?.conditions.get(grantedById) ?? null)
            : null;
    }

    prepareRuleElements(options: Omit<RuleElementOptions, "parent"> = {}): RuleElement[] {
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
                        rank: currentSource.system.spell.system.location.heightenedLevel,
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
            this.updateSource(updates, { recursive: false });
        }
        if (options.notify) ui.notifications.info(localize("Success", { item: this.name }));

        return this;
    }

    override exportToJSON(options: ToCompendiumOptions = {}): void {
        options.clearSource ??= false;
        super.exportToJSON(options);
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

    /** Retrieves base description data before enriching. May be overriden to prepend or append additional data */
    protected async getDescriptionData(): Promise<ItemDescriptionData> {
        // Lazy load description alterations now that we need them
        const actor = this.actor;
        if (!this.system.description.initialized && actor) {
            for (const alteration of actor.synthetics.itemAlterations.filter((i) => i.property === "description")) {
                alteration.applyAlteration({ singleItem: this as ItemPF2e<ActorPF2e> });
            }
            this.system.description.initialized = true;
        }

        return { ...this.system.description };
    }

    /** Retrieves description and gm notes with all prepends and appends applied, and enriched */
    async getDescription(htmlOptions: EnrichmentOptionsPF2e & { includeAddendum?: boolean } = {}): Promise<{
        value: string;
        gm: string;
    }> {
        const actor = this.actor;
        const rollOptions = new Set([actor?.getRollOptions(), this.getRollOptions("item")].flat().filter(R.isTruthy));
        const description = await this.getDescriptionData();
        const includeAddendum = htmlOptions.includeAddendum ?? true;

        const baseText = await (async (): Promise<string> => {
            const override = description?.override;
            if (!override) return description.value;
            return override
                .flatMap((line) => {
                    if (!line.predicate.test(rollOptions)) return [];
                    const hr = line.divider ? document.createElement("hr") : null;

                    // Create paragraph element
                    const paragraph = createHTMLElement("p");
                    if (line.title) {
                        paragraph.appendChild(
                            createHTMLElement("strong", { children: [game.i18n.localize(line.title)] }),
                        );
                        paragraph.appendChild(new Text(" "));
                    }
                    const text = markdownToHTML(line.text);
                    if (text) {
                        paragraph.insertAdjacentHTML("beforeend", text);
                    }

                    return [hr, paragraph].map((e) => e?.outerHTML).filter(R.isTruthy);
                })
                .join("\n");
        })();

        const addenda = await (async (): Promise<string[]> => {
            if (!includeAddendum || this.system.description.addenda.length === 0) return [];

            const templatePath = "systems/pf2e/templates/items/partials/addendum.hbs";
            return Promise.all(
                description.addenda.flatMap((unfiltered) => {
                    const addendum = {
                        label: game.i18n.localize(unfiltered.label),
                        contents: unfiltered.contents
                            .filter((c) => c.predicate.test(rollOptions))
                            .map((line) => {
                                if (!line.processed) {
                                    line.title &&= game.i18n.localize(line.title).trim();
                                    line.text = markdownToHTML(line.text);
                                    line.processed = true;
                                }
                                return line;
                            }),
                    };
                    return addendum.contents.length > 0 ? fa.handlebars.renderTemplate(templatePath, { addendum }) : [];
                }),
            );
        })();

        const assembled = [baseText, addenda.length > 0 ? "\n<hr />\n" : null, ...addenda]
            .filter(R.isTruthy)
            .join("\n");
        const rollData = fu.mergeObject(this.getRollData(), htmlOptions.rollData);

        return {
            value: await TextEditorPF2e.enrichHTML(assembled, { ...htmlOptions, rollData }),
            gm: game.user.isGM ? await TextEditorPF2e.enrichHTML(description.gm, { ...htmlOptions, rollData }) : "",
        };
    }

    /**
     * Internal method that transforms data into something that can be used for chat.
     * Currently renders description text using enrichHTML.
     */
    protected async processChatData(
        htmlOptions: EnrichmentOptionsPF2e = {},
        chatData: RawItemChatData,
    ): Promise<RawItemChatData> {
        const description = {
            ...chatData.description,
            ...(await this.getDescription(htmlOptions)),
        };
        return fu.mergeObject(chatData, { description }, { inplace: false });
    }

    async getChatData(
        htmlOptions: EnrichmentOptionsPF2e = {},
        _rollOptions: Record<string, unknown> = {},
    ): Promise<RawItemChatData> {
        if (!this.actor) throw ErrorPF2e(`Cannot retrieve chat data for unowned item ${this.name}`);
        const data = fu.deepClone({ ...this.system, traits: this.traitChatData() });
        return this.processChatData(htmlOptions, data);
    }

    traitChatData(
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
    static override createDialog<T extends Document>(
        this: ConstructorOf<T>,
        data?: Record<string, unknown>,
        createOptions?: Partial<DatabaseCreateOperation<Document | null>>,
        options?: {
            folders?: { id: string; name: string }[];
            types?: string[];
            template?: string;
            context?: object;
        } & Partial<DialogV2Configuration>,
    ): Promise<T | null>;
    static override async createDialog(
        data: { folder?: string } = {},
        createOptions?: Partial<DatabaseCreateOperation<Actor | null>>,
        options: {
            parent?: Actor | null;
            pack?: Collection<string, ItemPF2e<null>> | null;
            types?: string[];
        } & Partial<DialogV2Configuration> = {},
    ): Promise<Item | null> {
        options.classes = [options.classes ?? [], "item-create"].flat();
        options.types = R.unique([options.types ?? ITEM_TYPES].flat());

        // Exclude certain types from being creatable
        const excludedTypes: ItemType[] = ["condition", "spellcastingEntry", "lore"];
        if (BUILD_MODE === "production") excludedTypes.push("affliction", "book");
        if (game.settings.get("pf2e", "campaignType") !== "kingmaker") excludedTypes.push("campaignFeature");
        for (const type of excludedTypes) {
            options.types.findSplice((t) => t === type);
        }

        return super.createDialog(data, createOptions, options);
    }

    /** Assess and pre-process this JSON data, ensuring it's importable and fully migrated */
    override async importFromJSON(json: string): Promise<this> {
        const processed = await preImportJSON(json);
        return processed ? super.importFromJSON(processed) : this;
    }

    /** Include the item type along with data from upstream */
    override toDragData(): DropCanvasData & { itemType: string } {
        return { ...super.toDragData(), itemType: this.type };
    }

    static override async createDocuments<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        data?: (TDocument | DeepPartial<TDocument["_source"]>)[],
        operation?: Partial<DatabaseCreateOperation<TDocument["parent"]>>,
    ): Promise<TDocument[]>;
    static override async createDocuments(
        data: (ItemPF2e | PreCreate<ItemSourcePF2e>)[] = [],
        operation: Partial<DatabaseCreateOperation<ActorPF2e | null>> = {},
    ): Promise<Item[]> {
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
        // Also remove expired duplicate expired effects.
        // Creature's deleteEmbeddedDocuments() will also delete any linked items.
        const singularTypes = ["ancestry", "background", "class", "heritage", "deity"] as const;
        const singularTypesToDelete = singularTypes.filter((type) => sources.some((s) => s.type === type));
        const preCreateDeletions = singularTypesToDelete.flatMap(
            (type): ItemPF2e<ActorPF2e>[] => actor.itemTypes[type],
        );
        const expiredDuplicateEffects = sources
            .filter((s) => s.type === "effect")
            .map((s) => s._stats?.duplicateSource ?? s._stats?.compendiumSource)
            .flatMap((uuid) => actor.itemTypes.effect.filter((e) => e.sourceId === uuid && e.isExpired));
        const idsToDelete = R.unique([
            ...expiredDuplicateEffects.map((i) => i.id),
            ...preCreateDeletions.map((i) => i.id),
        ]);
        if (idsToDelete.length > 0) {
            await actor.deleteEmbeddedDocuments("Item", idsToDelete, { render: false });
        }

        // Convert all non-kit sources to item objects, and recursively extract the simple grants from ABC items
        const actorClone = actor.clone({}, { keepId: true });
        const items = await (async (): Promise<ItemPF2e<ActorPF2e>[]> => {
            /** Internal function to recursively get all simple granted items */
            async function getSimpleGrants(item: ItemPF2e<ActorPF2e>): Promise<ItemPF2e<ActorPF2e>[]> {
                const granted = (await item.createGrantedItems?.({ size: operation.parent?.size })) ?? [];
                if (granted.length === 0) return [];
                const reparented = granted.map(
                    (i): ItemPF2e<ActorPF2e> =>
                        (i.parent
                            ? i
                            : new CONFIG.Item.documentClass(i._source, { parent: actorClone })) as ItemPF2e<ActorPF2e>,
                );
                return [...reparented, ...(await Promise.all(reparented.map(getSimpleGrants))).flat()];
            }

            const items = sources.map((source): ItemPF2e<ActorPF2e> => {
                if (!(operation.keepId || operation.keepEmbeddedIds)) {
                    source._id = fu.randomID();
                }
                return new CONFIG.Item.documentClass(source, { parent: actorClone }) as ItemPF2e<ActorPF2e>;
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
        const itemUpdates: EmbeddedDocumentUpdateData[] = [];

        // Process item preCreate rules for all items that are going to be added
        // This may add additional items (such as via GrantItem)
        for (const item of [...items]) {
            // Pre-load this item's self: roll options for predication by preCreate rule elements
            item.prepareActorData?.();
            const rules = item.prepareRuleElements({ suppressWarnings: true });

            // Mark suppressed feats as suppressed during preCreate.
            // This must happen *after* rules are fetched, as suppressing kills the rules
            // Our only goal is to prevent choice sets, which are not salvageable
            const sourceId = item.sourceId;
            if (sourceId && item.isOfType("feat")) {
                item.suppressed ||=
                    items.some(
                        (i) => i.isOfType("feat") && i.system.subfeatures.suppressedFeatures.includes(sourceId),
                    ) || actor.itemTypes.feat.some((f) => f.system.subfeatures.suppressedFeatures.includes(sourceId));
            }

            const itemSource = item._source;
            for (const rule of rules) {
                const ruleSource = itemSource.system.rules[rules.indexOf(rule)] as RuleElementSource;
                await rule.preCreate?.({
                    itemSource,
                    ruleSource,
                    pendingItems: outputSources,
                    tempItems: items,
                    itemUpdates,
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

        // If there are any item updates, perform them first
        if (itemUpdates.length) {
            await actor.updateEmbeddedDocuments("Item", itemUpdates, { render: false });
        }

        const nonKits = outputSources.filter((source) => source.type !== "kit");
        return super.createDocuments(nonKits, operation);
    }

    static override async deleteDocuments<TDocument extends Document>(
        this: ConstructorOf<TDocument>,
        ids?: string[],
        operation?: Partial<DatabaseDeleteOperation<TDocument["parent"]>>,
    ): Promise<TDocument[]>;
    static override async deleteDocuments(
        ids: string[] = [],
        operation: Partial<DatabaseDeleteOperation<ActorPF2e | null>> = {},
    ): Promise<Document[]> {
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
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
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

        this._source.system.traits.value?.sort();
        // Remove any rule elements that request their own removal upon item creation
        this._source.system.rules = this._source.system.rules.filter(
            (r) => !("removeUponCreate" in r) || !r.removeUponCreate,
        );

        return super._preCreate(data, options, user);
    }

    /** Keep `TextEditor` and anything else up to no good from setting this item's description to `null` */
    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: fd.BaseUser,
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

        // Validate and deduplicate traits and other-tags
        if (changed.system?.traits) {
            const traits: { value?: string[]; otherTags?: string[] } = changed.system.traits;
            if (traits.value && Array.isArray(traits.value)) {
                const validTraits: ItemTrait[] = [];
                for (const trait of traits.value) {
                    if (objectHasKey(this.constructor.validTraits, trait)) {
                        addOrUpgradeTrait(validTraits, trait);
                    }
                }
                traits.value = validTraits.sort();
            }
            if (Array.isArray(traits.otherTags)) traits.otherTags = traits.otherTags.map((t) => sluggify(t)).sort();
        }

        // Run preUpdateItem rule element callbacks
        for (const rule of this.rules) {
            await rule.preUpdate?.(changed);
        }

        return super._preUpdate(changed, options, user);
    }

    /** Call onCreate rule-element hooks */
    protected override _onCreate(data: ItemSourcePF2e, options: DatabaseCreateCallbackOptions, userId: string): void {
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

    /** Refresh the Item Directory if this item isn't embedded */
    protected override _onUpdate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void {
        super._onUpdate(data, options, userId);
        if (game.ready && game.items.get(this.id) === this) {
            ui.items.render();
        }
    }

    /** Call onDelete rule-element hooks */
    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
        super._onDelete(options, userId);
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
    protected embedHTMLString(_config: DocumentHTMLEmbedConfig, _options: EnrichmentOptionsPF2e): string {
        return this.description;
    }

    protected override async _buildEmbedHTML(
        config: DocumentHTMLEmbedConfig,
        options: EnrichmentOptionsPF2e = {},
    ): Promise<HTMLCollection> {
        options.relativeTo = this;
        const container = document.createElement("div");
        container.innerHTML = await TextEditorPF2e.enrichHTML(this.embedHTMLString(config, options), options);
        return container.children;
    }
}

interface ItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends Item<TParent> {
    constructor: typeof ItemPF2e;
    flags: ItemFlagsPF2e;
    readonly _source: ItemSourcePF2e;
    system: ItemSystemData;

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
                : source?.type === "consumable" && (source.system?.category as string | undefined) === "ammo"
                  ? "ammo"
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
