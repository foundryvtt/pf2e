import { ActorPF2e } from "@actor";
import { ItemPF2e, type ContainerPF2e } from "@item";
import { isCycle } from "@item/container/helpers.ts";
import { ItemSummaryData, PhysicalItemSource, TraitChatData } from "@item/data/index.ts";
import { MystifiedTraits } from "@item/data/values.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { Rarity, Size } from "@module/data.ts";
import { UserPF2e } from "@module/user/document.ts";
import { ErrorPF2e, isObject, sluggify, sortBy } from "@util";
import { getUnidentifiedPlaceholderImage } from "../identification.ts";
import { Bulk, stackDefinitions, weightToBulk } from "./bulk.ts";
import {
    IdentificationStatus,
    ItemActivation,
    ItemCarryType,
    MystifiedData,
    PhysicalItemTrait,
    PhysicalSystemData,
    Price,
} from "./data.ts";
import { PreciousMaterialGrade, PreciousMaterialType } from "./types.ts";
import { getUsageDetails, isEquipped } from "./usage.ts";
import { DENOMINATIONS } from "./values.ts";

abstract class PhysicalItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    // The cached container of this item, if in a container, or null
    private declare _container: ContainerPF2e<ActorPF2e> | null;

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

    get isEquipped(): boolean {
        return isEquipped(this.system.usage, this.system.equipped);
    }

    get carryType(): ItemCarryType {
        return this.system.equipped.carryType ?? (this.system.containerId ? "worn" : "stowed");
    }

    get handsHeld(): number {
        return this.system.equipped.carryType === "held" ? this.system.equipped.handsHeld ?? 1 : 0;
    }

    get isHeld(): boolean {
        return this.handsHeld > 0;
    }

    get price(): Price {
        return this.system.price;
    }

    /** The monetary value of the entire item stack */
    get assetValue(): CoinsPF2e {
        return CoinsPF2e.fromPrice(this.price, this.quantity);
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
        return this.isEquipped && this.isIdentified && this.system.equipped.invested === true;
    }

    get isCursed(): boolean {
        return this.traits.has("cursed");
    }

    override get isTemporary(): boolean {
        return this.system.temporary;
    }

    get isShoddy(): boolean {
        return this.system.traits.otherTags.includes("shoddy");
    }

    get isDamaged(): boolean {
        return this.system.hp.value > 0 && this.system.hp.value < this.system.hp.max;
    }

    get material(): { precious: { type: PreciousMaterialType; grade: PreciousMaterialGrade } | null } {
        const systemData = this.system;
        return systemData.preciousMaterial.value && systemData.preciousMaterialGrade.value
            ? {
                  precious: {
                      type: systemData.preciousMaterial.value,
                      grade: systemData.preciousMaterialGrade.value,
                  },
              }
            : { precious: null };
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
        const { value, per } = this.system.bulk;
        const bulkRelevantQuantity = Math.floor(this.quantity / per);
        // Only convert to actor-relative size if the actor is a creature
        // https://2e.aonprd.com/Rules.aspx?ID=258
        const actorSize = this.actor?.isOfType("creature") ? this.actor.size : null;

        return new Bulk({ light: value }).convertToSize(this.size, actorSize ?? this.size).times(bulkRelevantQuantity);
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

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = this.type): string[] {
        const baseOptions = super.getRollOptions(prefix);
        const physicalItemOptions = Object.entries({
            equipped: this.isEquipped,
            magical: this.isMagical,
            uninvested: this.isInvested === false,
            [`material:${this.material.precious?.type}`]: !!this.material.precious,
        })
            .filter(([_key, isTrue]) => isTrue)
            .map(([key]) => `${prefix}:${key}`)
            .concat(this.system.traits.otherTags.map((t) => `${prefix}:tag:${t}`));

        return [baseOptions, physicalItemOptions].flat();
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this._container = null;
        super._initialize(options);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const systemData = this.system;
        // null out empty-string values
        systemData.preciousMaterial.value ||= null;
        systemData.preciousMaterialGrade.value ||= null;
        systemData.containerId ||= null;
        systemData.stackGroup ||= null;
        systemData.equippedBulk.value ||= null;
        systemData.baseItem ??= sluggify(systemData.stackGroup ?? "") || null;

        // Temporary: prevent noise from items pre migration 746
        if (typeof systemData.price.value === "string") {
            systemData.price.value = CoinsPF2e.fromString(systemData.price.value);
        }

        // Ensure infused items are always temporary
        const traits: PhysicalItemTrait[] = systemData.traits.value;
        if (traits.includes("infused")) systemData.temporary = true;

        // Normalize and fill price data
        systemData.price.value = new CoinsPF2e(systemData.temporary ? {} : systemData.price.value);
        systemData.price.per = Math.max(1, systemData.price.per ?? 1);

        // Fill out usage and equipped status
        this.system.usage = getUsageDetails(systemData.usage.value);
        const { equipped, usage } = this.system;

        equipped.handsHeld ??= 0;
        equipped.carryType ??= "worn";
        if (usage.type === "worn" && usage.where) equipped.inSlot ??= false;

        // Unequip items on loot actors
        if (this.actor?.isOfType("loot")) {
            equipped.carryType = "worn";
            equipped.inSlot = false;
        }

        // Temporary conversion of scattershot bulk data into a single object
        systemData.bulk = (() => {
            const stackData = stackDefinitions[systemData.stackGroup ?? ""] ?? null;
            const per = stackData?.size ?? 1;

            const heldOrStowed = stackData?.lightBulk ?? weightToBulk(systemData.weight.value)?.toLightBulk() ?? 0;
            const worn = systemData.equippedBulk.value
                ? weightToBulk(systemData.equippedBulk.value)?.toLightBulk() ?? 0
                : null;

            const { carryType } = systemData.equipped;
            const value = this.isEquipped && carryType === "worn" ? worn ?? heldOrStowed : heldOrStowed;

            return { heldOrStowed, worn, value, per };
        })();

        // Set the _container cache property to null if it no longer matches this item's container ID
        if (this._container?.id !== this.system.containerId) {
            this._container = null;
        }
    }

    /** Refresh certain derived properties in case of special data preparation from subclasses */
    override prepareDerivedData(): void {
        super.prepareDerivedData();

        this.system.identification.identified ??= {
            name: this.name,
            img: this.img,
            data: {
                description: { value: this.description },
            },
        };

        // If the item has an adjusted price, replace it if higher
        const adjustedPrice = this.computeAdjustedPrice?.();
        if (adjustedPrice) {
            const basePrice = this.price.value;
            const modifiedIsHigher = adjustedPrice.copperValue > basePrice.copperValue;
            const highestPrice = modifiedIsHigher ? adjustedPrice : basePrice;
            this.system.price.value = highestPrice;
        }

        if (this.isShoddy) {
            this.system.price.value = this.system.price.value.scale(0.5);
            this.system.hp.max = Math.floor(this.system.hp.max / 2);
            this.system.hp.value = Math.min(this.system.hp.value, this.system.hp.max);
            this.system.hp.brokenThreshold = Math.floor(this.system.hp.brokenThreshold / 2);
        }

        this.system.price.value = this.adjustPriceForSize();

        // Update properties according to identification status
        const mystifiedData = this.getMystifiedData(this.identificationStatus);
        this.name = mystifiedData.name;
        this.img = mystifiedData.img;
        this.system.description.value = mystifiedData.data.description.value;

        // Fill gaps in unidentified data with defaults
        this.system.identification.unidentified = this.getMystifiedData("unidentified");
    }

    /** Increase the price if it is larger than medium and not magical. */
    protected adjustPriceForSize(): CoinsPF2e {
        return this.isMagical ? this.price.value : this.price.value.adjustForSize(this.size);
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
        thisData.schema = otherData.schema;
        thisData.identification = otherData.identification;

        return JSON.stringify(thisData) === JSON.stringify(otherData);
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
            if (containerResolved && !isCycle(this, containerResolved)) {
                const carryType = containerResolved.stowsItems ? "stowed" : "worn";
                const equipped = { carryType, handsHeld: 0, inSlot: false };
                return { system: { containerId: containerResolved?.id, equipped } };
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
        const siblings = (containerResolved?.contents.contents ?? inventory.contents).sort(sortBy((i) => i.sort));

        // If there is nothing to sort, perform the normal update and end here
        if (!sortBefore && !siblings.length && !!mainContainerUpdate) {
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
                return mergeObject(baseUpdate, mainContainerUpdate);
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
            data: {
                description: {
                    value: description,
                },
            },
        };
    }

    override async getChatData(): Promise<ItemSummaryData> {
        const { precious } = this.material;
        const material = precious
            ? game.i18n.format("PF2E.Item.Weapon.MaterialAndRunes.MaterialOption", {
                  type: game.i18n.localize(CONFIG.PF2E.preciousMaterials[precious.type]),
                  grade: game.i18n.localize(CONFIG.PF2E.preciousMaterialGrades[precious.grade]),
              })
            : null;

        return {
            rarity: {
                name: this.rarity,
                label: CONFIG.PF2E.rarityTraits[this.rarity],
                description: CONFIG.PF2E.traitsDescriptions[this.rarity],
            },
            description: { value: this.description },
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

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** Set to unequipped upon acquiring */
    protected override async _preCreate(
        data: PreDocumentId<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        await super._preCreate(data, options, user);

        // Set some defaults
        this.updateSource({
            "system.equipped.carryType": "worn",
            "system.equipped.-=handsHeld": null,
            "system.equipped.-=inSlot": null,
        });

        if (this.actor) {
            const isSlottedItem = this.system.usage.type === "worn" && !!this.system.usage.where;
            if (this.actor.isOfType("character", "npc") && isSlottedItem) {
                this.updateSource({ "system.equipped.inSlot": false });
            }
        }
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        // Clamp hit points to between zero and max
        if (typeof changed.system?.hp?.value === "number") {
            changed.system.hp.value = Math.clamped(changed.system.hp.value, 0, this.system.hp.max);
        }

        if (!changed.system) return super._preUpdate(changed, options, user);

        // Avoid setting a `baseItem` or `stackGroup` to an empty string
        for (const key of ["baseItem", "stackGroup"] as const) {
            if (typeof changed.system?.[key] === "string") {
                changed.system[key] = String(changed.system[key]).trim() || null;
            }
        }

        // Uninvest if dropping
        if (changed.system.equipped?.carryType === "dropped" && this.system.equipped.invested) {
            changed.system.equipped.invested = false;
        }

        // Remove equipped.handsHeld and equipped.inSlot if the item is held or worn anywhere
        const equipped: Record<string, unknown> = mergeObject(changed, { system: { equipped: {} } }).system.equipped;
        const newCarryType = String(equipped.carryType ?? this.system.equipped.carryType);
        if (!newCarryType.startsWith("held")) equipped.handsHeld = 0;

        // Clear 0 price denominations and per fields with values 0 or 1
        if (isObject<Record<string, unknown>>(changed.system?.price)) {
            const price: Record<string, unknown> = changed.system!.price;
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

        const newUsage = getUsageDetails(String(changed.system?.usage?.value ?? this.system.usage.value));
        const hasSlot = newUsage.type === "worn" && newUsage.where;
        const isSlotted = Boolean(equipped.inSlot ?? this.system.equipped.inSlot);

        if (hasSlot) {
            equipped.inSlot = isSlotted;
        } else {
            equipped["-=inSlot"] = null;
        }

        await super._preUpdate(changed, options, user);
    }
}

interface PhysicalItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: PhysicalItemSource;
    system: PhysicalSystemData;

    computeAdjustedPrice?(): CoinsPF2e | null;
}

export { PhysicalItemPF2e };
