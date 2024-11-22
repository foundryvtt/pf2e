import type { CharacterPF2e } from "@actor";
import { ResourceData } from "@actor/creature/index.ts";
import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { PhysicalItemSource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { createBatchRuleElementUpdate } from "@module/rules/helpers.ts";
import type {
    CraftingAbilityRuleData,
    CraftingAbilityRuleSource,
} from "@module/rules/rule-element/crafting-ability.ts";
import { Predicate } from "@system/predication.ts";
import * as R from "remeda";
import type {
    CraftableItemDefinition,
    CraftingAbilityData,
    CraftingFormula,
    PreparedFormula,
    PreparedFormulaData,
} from "./types.ts";

class CraftingAbility implements CraftingAbilityData {
    /** A label for this crafting entry to display on sheets */
    label: string;

    slug: string;
    resource: string | null;

    /** This crafting ability's parent actor */
    actor: CharacterPF2e;

    preparedFormulaData: PreparedFormulaData[];
    isAlchemical: boolean;
    isDailyPrep: boolean;
    isPrepared: boolean;
    maxSlots: number;
    fieldDiscovery: Predicate | null;
    fieldDiscoveryBatchSize: number;
    batchSize: number;
    maxItemLevel: number;

    /** A cache of all formulas that have been loaded from their compendiums */
    #preparedFormulas: PreparedFormula[] | null = null;

    /** All craftable item definitions, sorted from biggest batch to smallest batch size */
    craftableItems: CraftableItemDefinition[];

    constructor(actor: CharacterPF2e, data: CraftingAbilityData) {
        this.actor = actor;
        this.slug = data.slug;
        this.resource = data.resource;
        this.label = data.label;
        this.isAlchemical = data.isAlchemical;
        this.isDailyPrep = data.isDailyPrep;
        this.isPrepared = data.isPrepared;
        this.maxSlots = data.maxSlots ?? 0;
        this.maxItemLevel = data.maxItemLevel;
        this.fieldDiscovery = data.fieldDiscovery ? new Predicate(data.fieldDiscovery) : null;
        this.batchSize = data.batchSize;
        this.craftableItems = R.sort(data.craftableItems, (c) => c.batchSize ?? 1);
        this.fieldDiscoveryBatchSize = data.fieldDiscoveryBatchSize ?? 3;
        this.preparedFormulaData = data.preparedFormulaData ?? [];

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
            return formula
                ? {
                      ...formula,
                      batchSize,
                      quantity: this.resource ? prepData.quantity || 1 : batchSize,
                      expended: !!prepData.expended,
                      isSignatureItem: !!prepData.isSignatureItem,
                  }
                : [];
        });
        return this.#preparedFormulas;
    }

    async getSheetData(): Promise<CraftingAbilitySheetData> {
        const preparedCraftingFormulas = await this.getPreparedCraftingFormulas();
        const prepared = [...preparedCraftingFormulas];
        const remainingSlots = Math.max(0, this.maxSlots - prepared.length);

        return {
            label: this.label,
            slug: this.slug,
            isAlchemical: this.isAlchemical,
            isPrepared: this.isPrepared,
            isDailyPrep: this.isDailyPrep,
            maxItemLevel: this.maxItemLevel,
            resource: this.resource ? this.actor.getResource(this.resource) : null,
            resourceCost: await this.calculateResourceCost(),
            maxSlots: this.maxSlots,
            prepared,
            remainingSlots,
        };
    }

    async calculateResourceCost(): Promise<number> {
        if (!this.resource) return 0;

        const preparedCraftingFormulas = await this.getPreparedCraftingFormulas();
        const values = await Promise.all(
            preparedCraftingFormulas.map(async (f) => f.quantity / (await this.#batchSizeFor(f))),
        );
        return Math.ceil(values.reduce((total, part) => total + part, 0));
    }

    async prepareFormula(formula: CraftingFormula): Promise<void> {
        if (!this.resource && this.preparedFormulaData.length >= this.maxSlots) {
            ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MaxSlots"));
            return;
        }

        if (!this.canCraft(formula.item)) {
            return;
        }

        const quantity = await this.#batchSizeFor(formula);
        const existing = this.preparedFormulaData.find((f) => f.uuid === formula.uuid);
        if (existing && this.resource) {
            existing.quantity = quantity;
        } else {
            this.preparedFormulaData.push({ uuid: formula.uuid, quantity });
        }

        return this.#updateRuleElement();
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

        return true;
    }

    async unprepareFormula(index: number): Promise<void> {
        const formula = this.preparedFormulaData[index];
        if (!formula) return;
        this.preparedFormulaData.splice(index, 1);
        return this.#updateRuleElement();
    }

    async setFormulaQuantity(index: number, value: "increase" | "decrease" | number): Promise<void> {
        const data = this.preparedFormulaData[index];
        if (!data) return;

        const currentQuantity = data.quantity ?? 0;
        const item = this.fieldDiscovery ? await fromUuid<ItemPF2e>(data.uuid) : null;
        const adjustment = this.fieldDiscovery?.test(item?.getRollOptions("item") ?? [])
            ? 1
            : await this.#batchSizeFor(data);
        const newQuantity =
            typeof value === "number"
                ? value
                : value === "increase"
                  ? currentQuantity + adjustment
                  : currentQuantity - adjustment;
        data.quantity = Math.ceil(Math.clamp(newQuantity, adjustment, adjustment * 50) / adjustment) * adjustment;

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
        { consume = true }: { consume?: boolean } = {},
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
            return { items: [], resource: null };
        }

        const prepared = await this.getPreparedCraftingFormulas();
        return {
            items: prepared
                .filter((f) => !f.expended)
                .map((formula) => {
                    const itemSource: PhysicalItemSource = formula.item.toObject();
                    itemSource.system.quantity = formula.quantity;
                    itemSource.system.temporary = true;
                    itemSource.system.size = this.actor.ancestry?.size === "tiny" ? "tiny" : "med";
                    if (formula.item.isAlchemical && itemIsOfType(itemSource, "consumable", "equipment", "weapon")) {
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
        };
    }

    async #batchSizeFor(data: CraftingFormula | PreparedFormulaData): Promise<number> {
        const knownFormulas = await this.actor.crafting.getFormulas();
        const formula = knownFormulas.find((f) => f.item.uuid === data.uuid);
        if (!formula) return 1;

        const rollOptions = formula.item.getRollOptions("item");
        const isSignatureItem = "isSignatureItem" in data && !!data.isSignatureItem;
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
}

export { CraftingAbility };
export type { CraftingAbilitySheetData, PreparedFormulaData };
