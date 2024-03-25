import type { ActorPF2e } from "@actor";
import { ItemPF2e, ItemProxyPF2e, type ContainerPF2e } from "@item";
import type { ItemSourcePF2e, PhysicalItemSource, RawItemChatData, TraitChatData } from "@item/base/data/index.ts";
import { MystifiedTraits } from "@item/base/data/values.ts";
import { isContainerCycle } from "@item/container/helpers.ts";
import type { Rarity, Size, ZeroToTwo } from "@module/data.ts";
import type { EffectSpinoff } from "@module/rules/rule-element/effect-spinoff/spinoff.ts";
import type { UserPF2e } from "@module/user/document.ts";
import { ErrorPF2e, isObject, tupleHasValue } from "@util";
import * as R from "remeda";
import { getUnidentifiedPlaceholderImage } from "../identification.ts";
import { Bulk } from "./bulk.ts";
import type {
    IdentificationStatus,
    ItemActivation,
    ItemCarryType,
    ItemMaterialData,
    MystifiedData,
    PhysicalItemHitPoints,
    PhysicalItemTrait,
    PhysicalSystemData,
    Price,
} from "./data.ts";
import { CoinsPF2e, computeLevelRarityPrice, handleHPChange, prepareBulkData } from "./helpers.ts";
import { getUsageDetails, isEquipped } from "./usage.ts";
import { DENOMINATIONS } from "./values.ts";

abstract class PhysicalItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    /** The item in which this item is embedded */
    parentItem: PhysicalItemPF2e | null;

    /**
     * The cached container of this item, if in a container, or null
     * @ignore
     */
    private declare _container: ContainerPF2e<ActorPF2e> | null;

    /** Doubly-embedded adjustments, attachments, talismans etc. */
    declare subitems: Collection<PhysicalItemPF2e<TParent>>;

    /** A map of effect spinoff objects, which can be used to create new effects from using certain items */
    effectSpinoffs: Map<string, EffectSpinoff>;

    constructor(data: PreCreate<ItemSourcePF2e>, context: PhysicalItemConstructionContext<TParent> = {}) {
        super(data, context);
        this.parentItem = context.parentItem ?? null;
        this.effectSpinoffs = new Map();
        Object.defineProperty(this, "effectSpinoffs", { enumerable: false });
    }

    get level(): number {
        return this.system.level.value;
    }

    get rarity(): Rarity {
        return this.system.traits.rarity;
    }

    get traits(): Set<PhysicalItemTrait> {
        return new Set(this.system.traits.value);
    }

    get quantity(): number {
        return Number(this.system.quantity ?? 1);
    }

    get size(): Size {
        return this.system.size;
    }

    get hitPoints(): PhysicalItemHitPoints {
        return fu.deepClone(this.system.hp);
    }

    get hardness(): number {
        return this.system.hardness;
    }

    get isEquipped(): boolean {
        return isEquipped(this.system.usage, this.system.equipped);
    }

    get carryType(): ItemCarryType {
        return this.system.equipped.carryType;
    }

    /** Whether the item is currently being held */
    get isHeld(): boolean {
        return this.handsHeld > 0;
    }

    /** The number of hands being used to hold this item */
    get handsHeld(): ZeroToTwo {
        return this.system.equipped.carryType === "held" ? this.system.equipped.handsHeld ?? 1 : 0;
    }

    /** Whether the item is currently being worn */
    get isWorn(): boolean {
        return this.system.equipped.carryType === "worn";
    }

    /** Whether the item has an attached (or affixed, applied, etc.) usage */
    get isAttachable(): boolean {
        return false;
    }

    get price(): Price {
        return this.system.price;
    }

    /** The monetary value of the entire item stack */
    get assetValue(): CoinsPF2e {
        const baseValue = CoinsPF2e.fromPrice(this.price, this.quantity);
        return this.isSpecific
            ? baseValue
            : this.subitems.reduce((total, i) => total.plus(CoinsPF2e.fromPrice(i.price, i.quantity)), baseValue);
    }

    get identificationStatus(): IdentificationStatus {
        return this.system.identification.status;
    }

    get isIdentified(): boolean {
        return this.system.identification.status === "identified";
    }

    get isAlchemical(): boolean {
        return this.traits.has("alchemical");
    }

    get isMagical(): boolean {
        const traits: Set<string> = this.traits;
        const magicTraits = ["magical", "arcane", "primal", "divine", "occult"] as const;
        return magicTraits.some((t) => traits.has(t));
    }

    get isInvested(): boolean | null {
        const traits: Set<string> = this.traits;
        if (!traits.has("invested")) return null;
        return (
            (this.isEquipped || this.system.usage.type !== "worn") &&
            !this.isStowed &&
            this.isIdentified &&
            this.system.equipped.invested === true
        );
    }

    get isCursed(): boolean {
        return this.traits.has("cursed");
    }

    get isTemporary(): boolean {
        return this.system.temporary;
    }

    get isShoddy(): boolean {
        return this.system.traits.otherTags.includes("shoddy");
    }

    get isDamaged(): boolean {
        return this.system.hp.value > 0 && this.system.hp.value < this.system.hp.max;
    }

    get isBroken(): boolean {
        const { hitPoints } = this;
        return hitPoints.max > 0 && !this.isDestroyed && hitPoints.value <= hitPoints.brokenThreshold;
    }

    get isDestroyed(): boolean {
        const { hitPoints } = this;
        return hitPoints.max > 0 && hitPoints.value === 0;
    }

    get material(): ItemMaterialData {
        return fu.deepClone(this.system.material);
    }

    /** Whether this is a specific magic item: applicable to armor, shields, and weapons */
    get isSpecific(): boolean {
        return false;
    }

    get isInContainer(): boolean {
        return !!this.container;
    }

    get isStowed(): boolean {
        return !!this.container?.system.stowing;
    }

    /** Get this item's container, returning null if it is not in a container */
    get container(): ContainerPF2e<ActorPF2e> | null {
        if (this.system.containerId === null) return (this._container = null);
        return (this._container ??=
            this.actor?.itemTypes.backpack.find((c) => c.id === this.system.containerId) ?? null);
    }

    /** Returns the bulk of this item and all sub-containers */
    get bulk(): Bulk {
        const per = this.system.bulk.per;
        const bulkRelevantQuantity = Math.floor(this.quantity / per);
        // Only convert to actor-relative size if the actor is a creature
        // https://2e.aonprd.com/Rules.aspx?ID=258
        const actorSize = this.actor?.isOfType("creature") ? this.actor.size : null;

        return new Bulk(this.system.bulk.value)
            .convertToSize(this.size, actorSize ?? this.size)
            .times(bulkRelevantQuantity);
    }

    get activations(): (ItemActivation & { componentsLabel: string })[] {
        return Object.values(this.system.activations ?? {}).map((action) => {
            const components: string[] = [];
            if (action.components.cast) components.push(game.i18n.localize("PF2E.Item.Activation.Cast"));
            if (action.components.command) components.push(game.i18n.localize("PF2E.Item.Activation.Command"));
            if (action.components.envision) components.push(game.i18n.localize("PF2E.Item.Activation.Envision"));
            if (action.components.interact) components.push(game.i18n.localize("PF2E.Item.Activation.Interact"));

            return {
                componentsLabel: components.join(", "),
                ...action,
            };
        });
    }

    /** Whether other items can be attached (or affixed, applied, etc.) to this item */
    acceptsSubitem(candidate: PhysicalItemPF2e): boolean;
    acceptsSubitem(): boolean {
        return false;
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix: string, options?: { includeGranter?: boolean }): string[] {
        const rollOptions = super.getRollOptions(prefix, options);
        const { material } = this.system;
        rollOptions.push(
            ...Object.entries({
                equipped: this.isEquipped,
                [`hands-held:${this.handsHeld}`]: this.handsHeld > 0,
                uninvested: this.isInvested === false,
                [`material:${material.type}`]: !!material.type,
            })
                .filter((e) => !!e[1])
                .map((e) => `${prefix}:${e[0]}`),
        );

        return rollOptions;
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this._container = null;
        this.subitems ??= new Collection();
        super._initialize(options);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // null out empty-string values
        this.system.containerId ||= null;
        this.system.material.type ||= null;
        this.system.material.grade ||= null;
        this.system.material.effects ??= [];
        this.system.stackGroup ??= null;
        this.system.hp.brokenThreshold = Math.floor(this.system.hp.max / 2);

        // Temporary: prevent noise from items pre migration 746
        if (typeof this.system.price.value === "string") {
            this.system.price.value = CoinsPF2e.fromString(this.system.price.value);
        }

        // Ensure infused items are always temporary
        const traits: PhysicalItemTrait[] = this.system.traits.value;
        if (traits.includes("infused")) this.system.temporary = true;

        // Normalize and fill price data
        this.system.price.value = new CoinsPF2e(this.system.temporary ? {} : this.system.price.value);
        this.system.price.per = Math.max(1, this.system.price.per ?? 1);

        // Fill out usage and equipped status
        this.system.usage = getUsageDetails(this.system.usage?.value ?? "carried");
        const { equipped, usage } = this.system;

        equipped.handsHeld ??= 0;
        equipped.carryType ??= "worn";
        if (usage.type === "worn" && usage.where) equipped.inSlot ??= false;

        // Unequip items on loot actors
        if (this.actor?.isOfType("loot")) {
            equipped.carryType = "worn";
            equipped.inSlot = false;
        }

        // Set the _container cache property to null if it no longer matches this item's container ID
        if (this._container?.id !== this.system.containerId) {
            this._container = null;
        }

        // Prepare doubly-embedded items if this is of an appropriate physical-item type
        for (const subitemSource of this.system.subitems ?? []) {
            subitemSource.system.equipped = R.pick(this.system.equipped, ["carryType", "handsHeld"]);
            const item =
                this.subitems.get(subitemSource._id ?? "") ??
                (new ItemProxyPF2e(subitemSource, {
                    parent: this.parent,
                    parentItem: this,
                }) as PhysicalItemPF2e<TParent>);
            item.updateSource(subitemSource);
            this.subitems.set(item.id, item);
        }

        // Remove any items no longer in the subitem source
        const subitemIds = this.system.subitems?.flatMap((i) => i._id ?? []) ?? [];
        for (const subitem of this.subitems) {
            if (!subitemIds.includes(subitem.id)) this.subitems.delete(subitem.id);
        }

        this.system.bulk = prepareBulkData(this);

        // Normalize apex data
        if (this.system.apex) {
            if (!this.traits.has("apex")) {
                delete this.system.apex;
            } else if (!this.isInvested) {
                this.system.apex.selected = false;
            }
        }

        // Optionally chained in case this data preparation cycle is being run during construction
        this.effectSpinoffs?.clear();
    }

    /** Refresh certain derived properties in case of special data preparation from subclasses */
    override prepareDerivedData(): void {
        super.prepareDerivedData();

        this.name = game.pf2e.system.generateItemName(this);

        this.system.identification.identified ??= {
            name: this.name,
            img: this.img,
            data: {
                description: { value: this.description },
            },
        };

        // Compute level, rarity, and price from factors like runes, precious material, shoddiness, and size
        const { level, rarity, price } = computeLevelRarityPrice(this);
        this.system.level.value = level;
        this.system.traits.rarity = rarity;
        this.system.price.value = price;

        // Update properties according to identification status
        const mystifiedData = this.getMystifiedData(this.identificationStatus);
        this.name = mystifiedData.name;
        this.img = mystifiedData.img;
        this.system.description.value = mystifiedData.data.description.value;

        // Fill gaps in unidentified data with defaults
        this.system.identification.unidentified = this.getMystifiedData("unidentified");

        if (!this.isEmbedded) {
            // Otherwise called in`onPrepareSynthetics`
            this.system.hp.value = Math.clamped(this.system.hp.value, 0, this.system.hp.max);
        }
    }

    override prepareSiblingData(): void {
        if (!this.actor) return;

        if (this.isStowed) {
            this.system.equipped.carryType = "stowed";
            delete this.system.equipped.inSlot;
        }

        // Clear the container reference if it turns out to be stale
        if (this._container && !this.actor.items.has(this._container.id)) {
            this._container = this.system.containerId = null;
        }

        // Ensure that there is only one selected apex item, and all others are set to false
        if (this.system.apex) {
            const otherApexData = this.actor.inventory.contents.flatMap((e) => (e === this ? [] : e.system.apex ?? []));
            if (this.system.apex.selected || (this.isInvested && otherApexData.every((d) => !d.selected))) {
                this.system.apex.selected = true;
                for (const data of otherApexData) {
                    data.selected = false;
                }
            }
        }
    }

    /** After item alterations have occurred, ensure that this item's hit points are no higher than its maximum */
    override onPrepareSynthetics(): void {
        this.system.hp.value = Math.clamped(this.system.hp.value, 0, this.system.hp.max);
    }

    override prepareActorData(): void {
        const { actor } = this;
        if (!actor?.isOfType("character")) return;

        // Apply this item's apex attribute upgrade if applicable
        if (this.system.apex?.selected) {
            if (actor.system.build.attributes.apex) {
                this.system.apex.selected = false;
            } else {
                actor.system.build.attributes.apex = this.system.apex.attribute;
            }
        }
    }

    /** Can the provided item stack with this item? */
    isStackableWith(item: PhysicalItemPF2e): boolean {
        const preCheck =
            this !== item &&
            this.type === item.type &&
            this.name === item.name &&
            this.isIdentified === item.isIdentified &&
            ![this, item].some((i) => i.isHeld || i.isOfType("backpack"));
        if (!preCheck) return false;

        const thisData = this.toObject().system;
        const otherData = item.toObject().system;
        thisData.quantity = otherData.quantity;
        thisData.equipped = otherData.equipped;
        thisData.containerId = otherData.containerId;
        thisData._migration = otherData._migration;
        thisData.identification = otherData.identification;

        return R.equals(thisData, otherData);
    }

    /** Combine this item with a target item if possible */
    async stackWith(targetItem: PhysicalItemPF2e): Promise<void> {
        if (this.isStackableWith(targetItem)) {
            const stackQuantity = this.quantity + targetItem.quantity;
            if (await this.delete({ render: false })) {
                await targetItem.update({ "system.quantity": stackQuantity });
            }
        }
    }

    /**
     * Move this item somewhere else in the inventory, possibly before or after another item or in or out of a container.
     * If this item and the target item are stackable they will be stacked automatically
     * @param options Options to control where this item is moved to
     * @param options.relativeTo An optional target item to sort this item relative to
     * @param options.sortBefore Should this item be sorted before or after the target item?
     * @param options.toContainer An optional container to move this item into. If the target item is in a container this can be omitted
     * @param options.render Render the update? Overridden by moving the item in or out of a container. Defaults to true
     * @returns
     */
    async move({
        relativeTo,
        sortBefore,
        toContainer,
        toStack,
        render = true,
    }: {
        relativeTo?: PhysicalItemPF2e;
        sortBefore?: boolean;
        toContainer?: ContainerPF2e<ActorPF2e> | null;
        toStack?: PhysicalItemPF2e;
        render?: boolean;
    }): Promise<void> {
        if (!this.actor) {
            throw ErrorPF2e(`Tried to move an unonwned item!`);
        }
        if (toStack) {
            return this.stackWith(toStack);
        }
        const containerResolved = toContainer ?? relativeTo?.container;
        const mainContainerUpdate = (() => {
            // Move into a container
            if (containerResolved && !isContainerCycle(this, containerResolved)) {
                const carryType = containerResolved.stowsItems ? "stowed" : "worn";
                const equipped = { carryType, handsHeld: 0, inSlot: false };
                return { system: { containerId: containerResolved.id, equipped } };
            }
            // Move out of a container
            if (!containerResolved && this.isInContainer) {
                const equipped = { carryType: "worn", handsHeld: 0, inSlot: false };
                return { system: { containerId: null, equipped } };
            }
            // Move without changing container state
            return null;
        })();
        const inventory = this.actor.inventory;
        const siblings = (containerResolved?.contents.contents ?? inventory.contents).sort((a, b) => a.sort - b.sort);

        // If there is nothing to sort, perform the normal update and end here
        if (!sortBefore && siblings.length === 0 && !!mainContainerUpdate) {
            await this.update(mainContainerUpdate);
            return;
        }

        const sorting = SortingHelpers.performIntegerSort(this, {
            target: relativeTo,
            siblings,
            sortBefore,
        });
        const updates = sorting.map((s) => {
            const baseUpdate = { _id: s.target.id, ...s.update };
            if (mainContainerUpdate && s.target.id === this.id) {
                return fu.mergeObject(baseUpdate, mainContainerUpdate);
            }
            return baseUpdate;
        });

        // Always render if moved in or out of a container
        const stowedOrUnstowed = (!this.container && !!containerResolved) || (this.container && !containerResolved);
        await this.actor.updateEmbeddedDocuments("Item", updates, { render: stowedOrUnstowed || render });
    }

    /* Retrieve subtitution data for an unidentified or misidentified item, generating defaults as necessary */
    getMystifiedData(status: IdentificationStatus, _options?: Record<string, boolean>): MystifiedData {
        const mystifiedData: MystifiedData = this.system.identification[status];

        const name = mystifiedData.name || this.generateUnidentifiedName();
        const img = mystifiedData.img || getUnidentifiedPlaceholderImage(this);

        const description =
            mystifiedData.data.description.value ||
            (() => {
                if (status === "identified") return this.description;

                const itemType = this.generateUnidentifiedName({ typeOnly: true });
                const caseCorrect = (noun: string) =>
                    game.i18n.lang.toLowerCase() === "de" ? noun : noun.toLowerCase();
                return game.i18n.format("PF2E.identification.UnidentifiedDescription", { item: caseCorrect(itemType) });
            })();

        return {
            name,
            img,
            data: { description: { value: description } },
        };
    }

    override async getChatData(): Promise<RawItemChatData> {
        const { type, grade } = this.system.material;
        const material =
            type && grade
                ? game.i18n.format("PF2E.Item.Weapon.MaterialAndRunes.MaterialOption", {
                      type: game.i18n.localize(CONFIG.PF2E.preciousMaterials[type]),
                      grade: game.i18n.localize(CONFIG.PF2E.preciousMaterialGrades[grade]),
                  })
                : null;
        const rarity =
            this.rarity === "common"
                ? null
                : {
                      slug: this.rarity,
                      label: CONFIG.PF2E.rarityTraits[this.rarity],
                      description: CONFIG.PF2E.traitsDescriptions[this.rarity],
                  };

        return {
            rarity,
            description: this.system.description,
            material,
        };
    }

    async setIdentificationStatus(status: IdentificationStatus): Promise<void> {
        if (this.identificationStatus === status) return;

        await this.update({
            "system.identification.status": status,
            "system.identification.unidentified": this.getMystifiedData("unidentified"),
        });
    }

    generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = {}): string {
        const itemType = game.i18n.localize(`TYPES.Item.${this.type}`);
        if (typeOnly) return itemType;

        return game.i18n.format("PF2E.identification.UnidentifiedItem", { item: itemType });
    }

    /** Include mystification-related rendering instructions for views that will display this data. */
    protected override traitChatData(dictionary: Record<string, string>): TraitChatData[] {
        const traitData = super.traitChatData(dictionary);
        for (const trait of traitData) {
            trait.mystified = !this.isIdentified && MystifiedTraits.has(trait.value);
            trait.excluded = trait.mystified && !game.user.isGM;
            if (trait.excluded) {
                delete trait.description;
            } else if (trait.mystified) {
                const gmNote = game.i18n.localize("PF2E.identification.TraitGMNote");
                trait.description = trait.description
                    ? `${gmNote}\n\n${game.i18n.localize(trait.description)}`
                    : gmNote;
            }
        }

        return traitData;
    }

    /** Redirect subitem updates to the parent item */
    override async update(
        data: Record<string, unknown>,
        context: DocumentModificationContext<TParent> = {},
    ): Promise<this | undefined> {
        if (this.parentItem) {
            const parentItem = this.parentItem;
            const newSubitems = parentItem._source.system.subitems?.map((i) =>
                i._id === this.id ? fu.mergeObject(i, data, { ...context, inplace: false }) : i,
            );
            const parentContext = { ...context, diff: true, recursive: true };
            const updated = await parentItem.update({ system: { subitems: newSubitems } }, parentContext);
            if (updated) {
                this._onUpdate(data as DeepPartial<this["_source"]>, context, game.user.id);
                return this;
            }
            return undefined;
        }

        return super.update(data, context);
    }

    /** Redirect subitem deletes to parent-item updates */
    override async delete(context: DocumentModificationContext<TParent> = {}): Promise<this | undefined> {
        if (this.parentItem) {
            const parentItem = this.parentItem;
            const newSubitems = parentItem._source.system.subitems?.filter((i) => i._id !== this.id) ?? [];
            const updated = await parentItem.update({ "system.subitems": newSubitems }, context);
            if (updated) {
                this._onDelete(context, game.user.id);
                return this;
            }
            return undefined;
        }

        return super.delete(context);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Set to unequipped upon acquiring */
    protected override async _preCreate(
        data: this["_source"],
        options: DocumentModificationContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (!this.actor || this._source.system.containerId?.length !== 16) {
            this._source.system.containerId = null;
        }

        // Clear the apex selection in case this is an apex item being copied from a previous owner
        delete this._source.system.apex?.selected;

        this._source.system.equipped = { carryType: "worn" };
        const isSlottedItem = this.system.usage.type === "worn" && !!this.system.usage.where;
        if (isSlottedItem && this.actor?.isOfType("character")) {
            this._source.system.equipped.inSlot = false;
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: PhysicalItemUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (!changed.system) return super._preUpdate(changed, options, user);

        for (const property of ["quantity", "hardness"] as const) {
            if (changed.system[property] !== undefined) {
                const max = property === "quantity" ? 999_999 : 999;
                changed.system[property] = Math.clamped(Math.trunc(Number(changed.system[property])), 0, max) || 0;
            }
        }

        if (options.checkHP ?? true) handleHPChange(this, changed);

        // Clear 0 price denominations and per fields with values 0 or 1
        if (isObject<Record<string, unknown>>(changed.system.price)) {
            const price: Record<string, unknown> = changed.system.price;
            if (isObject<Record<string, number | null>>(price.value)) {
                const coins = price.value;
                for (const denomination of DENOMINATIONS) {
                    if (coins[denomination] === 0) {
                        coins[`-=${denomination}`] = null;
                    }
                }
            }

            if ("per" in price && (!price.per || Number(price.per) <= 1)) {
                price["-=per"] = null;
            }
        }

        const equipped: Record<string, unknown> = changed.system.equipped ?? {};

        // Uninvest if dropping
        if (equipped.carryType === "dropped" && this.system.equipped.invested) {
            equipped.invested = false;
        }

        // Remove equipped.handsHeld and equipped.inSlot if the item is held or worn anywhere
        const newCarryType = String(equipped.carryType ?? this.system.equipped.carryType);
        if (!newCarryType.startsWith("held")) equipped.handsHeld = 0;

        const newUsage = getUsageDetails(String(changed.system.usage?.value ?? this.system.usage.value));
        const hasSlot = newUsage.type === "worn" && newUsage.where;
        const isSlotted = Boolean(equipped.inSlot ?? this.system.equipped.inSlot);
        if (hasSlot) {
            equipped.inSlot = isSlotted;
        } else if ("inSlot" in this._source.system.equipped) {
            equipped["-=inSlot"] = null;
        }

        // Remove apex data if apex trait is no longer present
        const changedTraits = changed.system?.traits?.value;
        const hasApexTrait =
            tupleHasValue(this._source.system.traits.value, "apex") &&
            (!Array.isArray(changedTraits) || tupleHasValue(changedTraits, "apex"));
        if (!hasApexTrait && this._source.system.apex) {
            delete changed.system?.apex;
            (changed.system satisfies object | undefined) ??= {}; // workaround of `DeepPartial` limitations
            changed.system = fu.mergeObject(changed.system!, { "-=apex": null });
        }

        return super._preUpdate(changed, options, user);
    }
}

interface PhysicalItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: PhysicalItemSource;
    system: PhysicalSystemData;
}

interface PhysicalItemConstructionContext<TParent extends ActorPF2e | null>
    extends DocumentConstructionContext<TParent> {
    parentItem?: PhysicalItemPF2e<TParent>;
}

interface PhysicalItemUpdateContext<TParent extends ActorPF2e | null> extends DocumentUpdateContext<TParent> {
    checkHP?: boolean;
}

export { PhysicalItemPF2e, type PhysicalItemConstructionContext };
