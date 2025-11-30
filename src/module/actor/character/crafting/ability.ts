import type { CharacterPF2e } from "@actor";
import { ResourceData } from "@actor/creature/index.ts";
import type { ItemUUID } from "@client/documents/_module.d.mts";
import type { DatabaseUpdateOperation } from "@common/abstract/_types.d.mts";
import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { PhysicalItemSource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { createBatchRuleElementUpdate } from "@module/rules/helpers.ts";
import type {
    CraftingAbilityRuleData,
    CraftingAbilityRuleSource,
} from "@module/rules/rule-element/crafting-ability.ts";
import { Predicate } from "@system/predication.ts";
import { sluggify } from "@util";
import * as R from "remeda";
import type {
    CraftableItemDefinition,
    CraftingAbilityData,
    CraftingFormula,
    PreparedFormula,
    PreparedFormulaData,
} from "./types.ts";

class CraftingAbility implements CraftingAbilityData {
    /** This crafting ability's parent actor */
    actor: CharacterPF2e;
    declare slug: string;

    /** A label for this crafting entry to display on sheets */
    declare label: string;
    declare resource: string | null;
    declare preparedFormulaData: PreparedFormulaData[];
    declare isAlchemical: boolean;
    declare isDailyPrep: boolean;
    declare isPrepared: boolean;
    declare maxSlots: number;
    declare fieldDiscovery: Predicate | null;
    declare fieldDiscoveryBatchSize: number;
    declare batchSize: number;
    declare maxItemLevel: number;

    /** All craftable item definitions, sorted from biggest batch to smallest batch size */
    declare craftableItems: CraftableItemDefinition[];

    /** A cache of all formulas that have been loaded from their compendiums */
    #preparedFormulas: PreparedFormula[] | null = null;

    constructor(actor: CharacterPF2e) {
        this.actor = actor;
    }

    /** Initializes this crafting ability with data. Call during actor data preparation. */
    initialize(data: CraftingAbilityData): void {
        this.slug = data.slug;
        this.resource = data.resource;
        this.label = data.label;
        this.isAlchemical = data.isAlchemical;
        this.isDailyPrep = data.isDailyPrep;
        this.isPrepared = data.isPrepared;
        this.maxSlots = Math.floor(data.maxSlots ?? 0);
        this.maxItemLevel = data.maxItemLevel;
        this.fieldDiscovery = data.fieldDiscovery ? new Predicate(data.fieldDiscovery) : null;
        this.batchSize = data.batchSize;
        this.craftableItems = R.sortBy(data.craftableItems, [(c) => c.batchSize ?? 1, "desc"]);
        this.fieldDiscoveryBatchSize = data.fieldDiscoveryBatchSize ?? 3;
        this.preparedFormulaData = data.preparedFormulaData ?? [];
        this.#preparedFormulas = null;

        // Temporary compatibility hack until the big migration
        if (this.isAlchemical) {
            this.resource = "infused-reagents";
            this.isDailyPrep = true;
            this.isPrepared = true;
        }
    }

    async getPreparedCraftingFormulas(): Promise<PreparedFormula[]> {
        if (this.#preparedFormulas) return this.#preparedFormulas;

        // Filter prepared formula data to valid ones. We can't do this until we've loaded compendium items
        const knownFormulas = await this.actor.crafting.getFormulas();
        this.preparedFormulaData = (this.preparedFormulaData ?? []).filter((d) =>
            knownFormulas.some((f) => f.item.uuid === d.uuid),
        );

        this.#preparedFormulas = this.preparedFormulaData.flatMap((prepData): PreparedFormula | never[] => {
            const formula = knownFormulas.find((f) => f.uuid === prepData.uuid);
            const rollOptions = formula?.item.getRollOptions("item") ?? [];
            const matching = formula ? this.craftableItems.find((c) => c.predicate.test(rollOptions)) : null;
            const batchSize = matching?.batchSize ?? this.batchSize ?? 1;
            const batches = Math.ceil((prepData.quantity || 1) / batchSize);
            return formula
                ? {
                      ...formula,
                      batchSize,
                      batches,
                      quantity: batches * batchSize,
                      expended: !!prepData.expended,
                      isSignatureItem: !!prepData.isSignatureItem,
                  }
                : [];
        });
        return this.#preparedFormulas;
    }

    /** Calculates the resources needed to craft all prepared crafting items */
    async calculateResourceCost(): Promise<number> {
        if (!this.resource) return 0;

        const preparedCraftingFormulas = await this.getPreparedCraftingFormulas();
        const values = await Promise.all(
            preparedCraftingFormulas.map(async (f) => f.quantity / (await this.#batchSizeFor(f))),
        );
        return Math.ceil(values.reduce((total, part) => total + part, 0));
    }

    /** Returns true if the item can be created by this ability, which requires it to pass predication and be of sufficient level */
    canCraft(item: PhysicalItemPF2e, { warn = true } = {}): boolean {
        const rollOptions = item.getRollOptions("item");
        if (!this.craftableItems.some((c) => c.predicate.test(rollOptions))) {
            if (warn) {
                ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.ItemMissingTraits"));
            }
            return false;
        }

        if (item.level > this.maxItemLevel) {
            if (warn) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.CraftingTab.Alerts.MaxItemLevel", { level: this.maxItemLevel }),
                );
            }
            return false;
        }

        // Avoid granting the ability to expend a resource to craft that same resource
        const resourceUUID = this.resource
            ? this.actor.synthetics.resources[sluggify(this.resource, { camel: "dromedary" })]?.itemUUID
            : null;
        if (item.uuid === resourceUUID) {
            return false;
        }

        return true;
    }

    /** Returns all items that this ability can craft including the batch size produced by this ability */
    async getValidFormulas(): Promise<CraftingFormula[]> {
        const actorFormulas = await this.actor.crafting.getFormulas();
        const validFormulas = actorFormulas.filter((f) => this.canCraft(f.item, { warn: false }));
        return Promise.all(validFormulas.map(async (f) => ({ ...f, batchSize: await this.#batchSizeFor(f) })));
    }

    async prepareFormula(uuid: string): Promise<void> {
        await this.setFormulaQuantity(uuid, "increase");
    }

    async unprepareFormula(indexOrUuid: number | string): Promise<void> {
        if (typeof indexOrUuid === "string") {
            this.preparedFormulaData = this.preparedFormulaData.filter((p) => p.uuid !== indexOrUuid);
            return this.#updateRuleElement();
        }

        this.preparedFormulaData.splice(indexOrUuid, 1);
        return this.#updateRuleElement();
    }

    /** Sets a formula's prepared quantity to a specific value, preparing it if necessary */
    async setFormulaQuantity(indexOrUuid: number | string, value: "increase" | "decrease" | number): Promise<void> {
        const index =
            typeof indexOrUuid === "number"
                ? indexOrUuid
                : this.preparedFormulaData.findIndex((d) => d.uuid === indexOrUuid);
        const data: PreparedFormulaData | null = this.preparedFormulaData[index] ?? null;
        if (!data && typeof indexOrUuid !== "string") return;

        const prepared = await this.getPreparedCraftingFormulas();
        const consumed = prepared.reduce((sum, p) => sum + p.batches, 0);
        const itemUuid = data?.uuid ?? (typeof indexOrUuid === "string" ? indexOrUuid : null);
        const item = itemUuid ? await fromUuid<ItemPF2e>(itemUuid) : null;
        const batchSize =
            this.fieldDiscovery?.test(item?.getRollOptions("item") ?? []) || !item ? 1 : await this.#batchSizeFor(item);
        const individualPrep = !this.isDailyPrep; // Delayed prep (and eventually snares in general?) need to be one at a time
        const currentQuantity = individualPrep
            ? prepared.filter((p) => p.uuid === item?.uuid).length
            : (data?.quantity ?? 0);
        if (!itemUuid) return;

        // Determine if we're maxed out, if so, exit with a warning
        const increasing = value === "increase" || !data || (typeof value === "number" && value > currentQuantity);
        if (!this.resource && consumed >= this.maxSlots && increasing) {
            ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MaxSlots"));
            return;
        }

        // Calculate new quantity. Exit early if we're increasing and there is no item
        // If we're decreasing, we still need to be able to do so even if the item doesn't exist
        const validMaxQuantity = this.maxSlots ? currentQuantity + (this.maxSlots - consumed) * batchSize : Infinity;
        const newQuantity = Math.clamp(
            typeof value === "number"
                ? value
                : value === "increase"
                  ? currentQuantity + batchSize
                  : currentQuantity - batchSize,
            0,
            validMaxQuantity,
        );
        if (newQuantity > currentQuantity && (!item?.isOfType("physical") || !this.canCraft(item))) {
            return;
        }

        // If quantity is being set to zero, unprepare the item
        if (newQuantity === 0) {
            return this.unprepareFormula(itemUuid ?? index);
        }

        // Handle individual prep items, which must be prepared individually without quantity
        if (individualPrep) {
            if (newQuantity > currentQuantity) {
                if (!item) return;
                this.preparedFormulaData.push(
                    ...R.range(0, newQuantity - currentQuantity).map(() => ({ uuid: item.uuid })),
                );
            } else {
                for (let i = 0; i < currentQuantity - newQuantity; i++) {
                    const idx = this.preparedFormulaData.findLastIndex((p) => p.uuid === itemUuid);
                    this.preparedFormulaData.splice(idx, 1);
                }
            }

            return this.#updateRuleElement();
        }

        // Create a new prepared entry if it doesn't exist, otherwise update an existing one
        if (!data) {
            if (!item) return;
            this.preparedFormulaData.push({ uuid: item.uuid, quantity: newQuantity });
        } else {
            data.quantity = Math.ceil(Math.clamp(newQuantity, batchSize, batchSize * 50) / batchSize) * batchSize;
        }

        return this.#updateRuleElement();
    }

    async toggleFormulaExpended(index: number, value?: boolean): Promise<void> {
        const data = this.preparedFormulaData[index];
        data.expended = value ?? !data.expended;

        return this.#updateRuleElement();
    }

    async toggleSignatureItem(itemUUID: string): Promise<void> {
        const data = this.preparedFormulaData.find((f) => f.uuid === itemUUID);
        if (data?.uuid !== itemUUID) return;
        data.isSignatureItem = !data.isSignatureItem;

        return this.setFormulaQuantity(
            this.preparedFormulaData.indexOf(data),
            data.quantity ?? (await this.#batchSizeFor(data)),
        );
    }

    async updateFormulas(
        formulas: PreparedFormulaData[],
        operation?: Partial<DatabaseUpdateOperation<CharacterPF2e>> | undefined,
    ): Promise<void> {
        this.preparedFormulaData = formulas;
        this.#preparedFormulas = null;
        return this.#updateRuleElement(operation);
    }

    async craft(
        itemOrUUIDOrIndex: PhysicalItemPF2e | ItemUUID | number,
        { consume = true, destination }: CraftParameters = {},
    ): Promise<PhysicalItemPF2e | null> {
        // Resolve item and possible index from the given parameter. If an index is given, its a prepared formula
        const preparedFormulas = await this.getPreparedCraftingFormulas();
        const [item, index] = await (async (): Promise<[PhysicalItemPF2e | null, number]> => {
            if (typeof itemOrUUIDOrIndex === "number") {
                return [preparedFormulas[itemOrUUIDOrIndex].item, itemOrUUIDOrIndex];
            }

            const item = typeof itemOrUUIDOrIndex === "string" ? await fromUuid(itemOrUUIDOrIndex) : itemOrUUIDOrIndex;
            if (!(item instanceof PhysicalItemPF2e)) return [null, -1];

            if (this.isPrepared) {
                // determine what index this item could possibly be. Prioritize not expended
                const validIndex = preparedFormulas.findIndex((f) => f.item.uuid === item.uuid && !f.expended);
                const index =
                    validIndex < 0 ? preparedFormulas.findIndex((f) => f.item.uuid === item.uuid) : validIndex;
                return [item, index];
            } else {
                return [item, -1];
            }
        })();
        if (!item) return null;

        // Set the slot to expended if this is a prepared entry
        if (this.isPrepared && consume) {
            if (!this.preparedFormulaData[index] || this.preparedFormulaData[index].expended) {
                ui.notifications.warn("PF2E.CraftingTab.Alerts.FormulaExpended", { localize: true });
                return null;
            }
            await this.toggleFormulaExpended(index);
        }

        const rollOptions = item.getRollOptions("item");
        const matching = this.craftableItems.find((c) => c.predicate.test(rollOptions));
        const batchSize = matching?.batchSize ?? this.batchSize;

        // Consume a special resource if we need to
        if (this.resource && consume) {
            const resource = this.actor.getResource(this.resource ?? "");
            const value = resource?.value ?? 0;
            if (!value) {
                ui.notifications.warn("PF2E.Actor.Character.Crafting.MissingResource", { localize: true });
                return null;
            } else {
                await this.actor.updateResource(this.resource, value - 1);
            }
        }

        // Snares operate under entirely different rules, so we can't really craft them at this time
        if (item.system.traits.value.includes("snare")) {
            return null;
        }

        // Create the item source, and apply necessary temporary item modifications
        const itemSource = item.toObject(true);
        itemSource.system.quantity = batchSize;
        itemSource.system.temporary = true;
        itemSource.system.size = this.actor.ancestry?.size === "tiny" ? "tiny" : "med";
        if (item.isAlchemical && itemIsOfType(itemSource, "consumable", "equipment", "weapon")) {
            itemSource.system.traits.value.push("infused");
            itemSource.system.traits.value.sort(); // required for stack matching
        }
        if (destination === "hand") {
            itemSource.system.equipped = { carryType: "held", handsHeld: 1 };
        }

        // Create the item or update an existing one, then return it
        const stackable = this.actor.inventory.findStackableItem(itemSource);
        if (stackable) {
            stackable.update({ "system.quantity": stackable.quantity + batchSize });
            return stackable;
        } else {
            const created = await this.actor.createEmbeddedDocuments("Item", [itemSource]);
            return (created[0] ?? null) as PhysicalItemPF2e<CharacterPF2e> | null;
        }
    }

    /** Returns what items should be created by this ability during daily preparation, and what the resource expenditure should be */
    async calculateDailyCrafting(): Promise<DailyCraftingResult> {
        if (!this.isDailyPrep) {
            return { items: [], resource: null, insufficient: false };
        }

        const prepared = await this.getPreparedCraftingFormulas();
        const consumed = prepared.reduce((sum, p) => sum + p.batches, 0);

        return {
            items: prepared
                .filter((f) => !f.expended)
                .map((formula) => {
                    const item = formula.item;
                    const itemSource: PhysicalItemSource = item.toObject();
                    itemSource.system.quantity = formula.quantity;
                    itemSource.system.temporary = true;
                    itemSource.system.size = this.actor.ancestry?.size === "tiny" ? "tiny" : "med";
                    if (item.isAlchemical && itemIsOfType(itemSource, "consumable", "equipment", "weapon", "ammo")) {
                        itemSource.system.traits.value.push("infused");
                        itemSource.system.traits.value.sort(); // required for stack matching
                    }

                    return itemSource;
                }),
            resource: this.resource
                ? {
                      slug: this.resource,
                      cost: await this.calculateResourceCost(),
                  }
                : null,
            insufficient: this.maxSlots > 0 && consumed > this.maxSlots,
        };
    }

    async getSheetData(): Promise<CraftingAbilitySheetData> {
        const preparedCraftingFormulas = await this.getPreparedCraftingFormulas();
        const prepared = [...preparedCraftingFormulas];
        const consumed = prepared.reduce((sum, p) => sum + p.batches, 0);
        const remainingSlots = Math.max(0, this.maxSlots - consumed);

        return {
            label: this.label,
            slug: this.slug,
            isAlchemical: this.isAlchemical,
            isPrepared: this.isPrepared,
            isDailyPrep: this.isDailyPrep,
            insufficient: this.maxSlots > 0 && consumed > this.maxSlots,
            maxItemLevel: this.maxItemLevel,
            resource: this.resource ? this.actor.getResource(this.resource) : null,
            resourceCost: await this.calculateResourceCost(),
            maxSlots: this.maxSlots,
            prepared,
            remainingSlots,
        };
    }

    /** Helper to return the batch size for a formula or item. Once signature item is gone, we can make it take only physical items */
    async #batchSizeFor(data: CraftingFormula | PreparedFormulaData | ItemPF2e): Promise<number> {
        const isSignatureItem = "isSignatureItem" in data && !!data.isSignatureItem;
        const item =
            data instanceof ItemPF2e
                ? data
                : "item" in data
                  ? data.item
                  : (await this.actor.crafting.getFormulas()).find((f) => f.item.uuid === data.uuid)?.item;
        if (!item) return 1;

        const rollOptions = item.getRollOptions("item");
        if (isSignatureItem || this.fieldDiscovery?.test(rollOptions)) {
            return this.fieldDiscoveryBatchSize;
        }

        const matching = this.craftableItems.find((c) => c.predicate.test(rollOptions));
        return matching?.batchSize ?? this.batchSize;
    }

    async #updateRuleElement(operation?: Partial<DatabaseUpdateOperation<CharacterPF2e>> | undefined): Promise<void> {
        const rules = this.actor.rules.filter(
            (r: CraftingAbilityRuleSource): r is CraftingAbilityRuleData =>
                r.key === "CraftingAbility" && r.slug === this.slug,
        );
        const itemUpdates = createBatchRuleElementUpdate(rules, { prepared: this.preparedFormulaData });
        if (itemUpdates.length) {
            await this.actor.updateEmbeddedDocuments("Item", itemUpdates, operation);
        }
    }
}

interface CraftingAbilitySheetData {
    slug: string;
    label: string;
    isAlchemical: boolean;
    isPrepared: boolean;
    isDailyPrep: boolean;
    /** This is true if we do not have sufficient slots or resources to craft this ability */
    insufficient: boolean;
    maxSlots: number;
    maxItemLevel: number;
    resource: ResourceData | null;
    resourceCost: number;
    remainingSlots: number;
    prepared: PreparedFormula[];
}

interface DailyCraftingResult {
    items: PreCreate<PhysicalItemSource>[];
    resource: { slug: string; cost: number } | null;
    /** True if this item is internally insufficient. It does not compare with other crafting abilties */
    insufficient: boolean;
}

interface CraftParameters {
    /** If set to true, will craft by consuming the required resource */
    consume?: boolean;
    /* The destination to place the newly created item. */
    destination?: "hand";
}

export { CraftingAbility };
export type { CraftingAbilitySheetData, PreparedFormulaData };
