import { LootPF2e } from "@actor";
import { type ContainerPF2e, ItemPF2e } from "@item";
import { PhysicalItemData, TraitChatData } from "@item/data";
import { MystifiedTraits } from "@item/data/values";
import { CoinsPF2e } from "@item/physical/helpers";
import { Rarity, Size } from "@module/data";
import { LocalizePF2e } from "@module/system/localize";
import { UserPF2e } from "@module/user";
import { isObject, sluggify } from "@util";
import { getUnidentifiedPlaceholderImage } from "../identification";
import { Bulk, stackDefinitions, weightToBulk } from "./bulk";
import { IdentificationStatus, ItemCarryType, MystifiedData, PhysicalItemTrait, Price } from "./data";
import { PreciousMaterialGrade, PreciousMaterialType } from "./types";
import { getUsageDetails, isEquipped } from "./usage";
import { DENOMINATIONS } from "./values";

export abstract class PhysicalItemPF2e extends ItemPF2e {
    // The cached container of this item, if in a container, or null
    private _container: Embedded<ContainerPF2e> | null = null;

    get level(): number {
        return this.data.data.level.value;
    }

    get rarity(): Rarity {
        return this.data.data.traits.rarity;
    }

    get traits(): Set<PhysicalItemTrait> {
        return new Set(this.data.data.traits.value);
    }

    get quantity(): number {
        return Number(this.data.data.quantity ?? 1);
    }

    get size(): Size {
        this.folder;
        return this.data.data.size;
    }

    get isEquipped(): boolean {
        return isEquipped(this.data.data.usage, this.data.data.equipped);
    }

    get carryType(): ItemCarryType {
        return this.data.data.equipped.carryType ?? (this.data.data.containerId ? "worn" : "stowed");
    }

    get handsHeld(): number {
        return this.data.data.equipped.carryType === "held" ? this.data.data.equipped.handsHeld ?? 1 : 0;
    }

    get isHeld(): boolean {
        return this.handsHeld > 0;
    }

    get price(): Price {
        return this.data.data.price;
    }

    /** The monetary value of the entire item stack */
    get assetValue(): CoinsPF2e {
        return CoinsPF2e.fromPrice(this.price, this.quantity);
    }

    get identificationStatus(): IdentificationStatus {
        return this.data.data.identification.status;
    }

    get isIdentified(): boolean {
        return this.data.data.identification.status === "identified";
    }

    get isAlchemical(): boolean {
        return this.traits.has("alchemical");
    }

    get isMagical(): boolean {
        const traits: Set<string> = this.traits;
        const magicTraits = ["magical", "arcane", "primal", "divine", "occult"] as const;
        return magicTraits.some((trait) => traits.has(trait));
    }

    get isInvested(): boolean | null {
        const traits: Set<string> = this.traits;
        if (!traits.has("invested")) return null;
        return this.isEquipped && this.isIdentified && this.data.data.equipped.invested === true;
    }

    get isCursed(): boolean {
        return this.traits.has("cursed");
    }

    get isTemporary(): boolean {
        return this.data.data.temporary;
    }

    get isDamaged(): boolean {
        return this.data.data.hp.value > 0 && this.data.data.hp.value < this.data.data.hp.max;
    }

    get material(): { precious: { type: PreciousMaterialType; grade: PreciousMaterialGrade } | null } {
        const systemData = this.data.data;
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
        return !!this.container?.data.data.stowing;
    }

    /** Get this item's container, returning null if it is not in a container */
    get container(): Embedded<ContainerPF2e> | null {
        if (this.data.data.containerId === null) return (this._container = null);

        const container = this._container ?? this.actor?.items.get(this.data.data.containerId ?? "");
        if (container?.isOfType("backpack")) this._container = container;

        return this._container;
    }

    /** Returns the bulk of this item and all sub-containers */
    get bulk(): Bulk {
        const { value, per } = this.data.data.bulk;
        const bulkRelevantQuantity = Math.floor(this.quantity / per);
        return new Bulk({ light: value })
            .convertToSize(this.size, this.actor?.size ?? this.size)
            .times(bulkRelevantQuantity);
    }

    get activations() {
        return Object.values(this.data.data.activations ?? {}).map((action) => {
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
        const delimitedPrefix = prefix ? `${prefix}:` : "";
        const physicalItemOptions = Object.entries({
            equipped: this.isEquipped,
            magical: this.isMagical,
            uninvested: this.isInvested === false,
            [`material:${this.material.precious?.type}`]: !!this.material.precious,
        })
            .filter(([_key, isTrue]) => isTrue)
            .map(([key]) => `${delimitedPrefix}${key}`);

        return [baseOptions, physicalItemOptions].flat();
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const systemData = this.data.data;
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
        if (systemData.traits.value.includes("infused")) {
            systemData.temporary = true;
        }

        // Normalize and fill price data
        systemData.price.value = new CoinsPF2e(systemData.temporary ? {} : systemData.price.value);
        systemData.price.per = Math.max(1, systemData.price.per ?? 1);

        // Fill out usage and equipped status
        this.data.data.usage = getUsageDetails(systemData.usage.value);
        const { equipped, usage } = this.data.data;

        equipped.handsHeld ??= 0;
        equipped.carryType ??= "worn";
        if (usage.type === "worn" && usage.where) equipped.inSlot ??= false;

        // Unequip items on loot actors
        if (this.actor instanceof LootPF2e) {
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
        if (this._container?.id !== this.data.data.containerId) {
            this._container = null;
        }
    }

    /** Refresh certain derived properties in case of special data preparation from subclasses */
    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const systemData = this.data.data;
        systemData.identification.identified = {
            name: this.name,
            img: this.img,
            data: {
                description: { value: this.description },
            },
        };

        // Update properties according to identification status
        const mystifiedData = this.getMystifiedData(this.identificationStatus);
        mergeObject(this.data, mystifiedData, { insertKeys: false, insertValues: false });

        // Fill gaps in unidentified data with defaults
        systemData.identification.unidentified = this.getMystifiedData("unidentified");
    }

    override prepareSiblingData(this: Embedded<PhysicalItemPF2e>): void {
        if (this.isStowed) {
            this.data.data.equipped.carryType = "stowed";
            delete this.data.data.equipped.inSlot;
        }

        // Clear the container reference if it turns out to be stale
        if (this._container && !this.actor.items.has(this._container.id)) {
            this._container = this.data.data.containerId = null;
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

        const thisData = this.toObject().data;
        const otherData = item.toObject().data;
        thisData.quantity = otherData.quantity;
        thisData.equipped = otherData.equipped;
        thisData.containerId = otherData.containerId;
        thisData.schema = otherData.schema;
        thisData.identification = otherData.identification;

        return JSON.stringify(thisData) === JSON.stringify(otherData);
    }

    /* Retrieve subtitution data for an unidentified or misidentified item, generating defaults as necessary */
    getMystifiedData(status: IdentificationStatus, _options?: Record<string, boolean>): MystifiedData {
        const mystifiedData: MystifiedData = this.data.data.identification[status];

        const name = mystifiedData.name || this.generateUnidentifiedName();
        const img = mystifiedData.img || getUnidentifiedPlaceholderImage(this.data);

        const description =
            mystifiedData.data.description.value ||
            (() => {
                if (status === "identified") return this.description;

                const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedDescription;
                const itemType = this.generateUnidentifiedName({ typeOnly: true });
                const caseCorrect = (noun: string) =>
                    game.i18n.lang.toLowerCase() === "de" ? noun : noun.toLowerCase();
                return game.i18n.format(formatString, { item: caseCorrect(itemType) });
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

    override getChatData(): Record<string, unknown> {
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
            "data.identification.status": status,
            "data.identification.unidentified": this.getMystifiedData("unidentified"),
        });
    }

    generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const itemType = game.i18n.localize(`ITEM.Type${this.data.type.capitalize()}`);
        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
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
                const gmNote = LocalizePF2e.translations.PF2E.identification.TraitGMNote;
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
        data: PreDocumentId<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        await super._preCreate(data, options, user);

        // Set some defaults
        this.data.update({
            "data.equipped.carryType": "worn",
            "data.equipped.-=handsHeld": null,
            "data.equipped.-=inSlot": null,
        });

        if (this.actor) {
            const isSlottedItem = this.data.data.usage.type === "worn" && !!this.data.data.usage.where;
            if (this.actor.isOfType("character", "npc") && isSlottedItem) {
                this.data.update({ "data.equipped.inSlot": false });
            }
        }
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        // Clamp hit points to between zero and max
        if (typeof changed.data?.hp?.value === "number") {
            changed.data.hp.value = Math.clamped(changed.data.hp.value, 0, this.data.data.hp.max);
        }

        if (!changed.data) return await super._preUpdate(changed, options, user);

        // Remove equipped.handsHeld and equipped.inSlot if the item is held or worn anywhere
        const equipped: Record<string, unknown> = mergeObject(changed, { data: { equipped: {} } }).data.equipped;
        const newCarryType = String(equipped.carryType ?? this.data.data.equipped.carryType);
        if (!newCarryType.startsWith("held")) equipped.handsHeld = 0;

        // Clear 0 price denominations and per fields with values 0 or 1
        if (isObject<Record<string, unknown>>(changed.data?.price)) {
            const price: Record<string, unknown> = changed.data.price;
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

        const newUsage = getUsageDetails(String(changed.data.usage?.value ?? this.data.data.usage.value));
        const hasSlot = newUsage.type === "worn" && newUsage.where;
        const isSlotted = Boolean(equipped.inSlot ?? this.data.data.equipped.inSlot);

        if (hasSlot) {
            equipped.inSlot = isSlotted;
        } else {
            equipped["-=inSlot"] = null;
        }

        await super._preUpdate(changed, options, user);
    }
}

export interface PhysicalItemPF2e {
    readonly data: PhysicalItemData;
}
