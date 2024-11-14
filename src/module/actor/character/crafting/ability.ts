import type { CharacterPF2e } from "@actor";
import { ResourceData } from "@actor/creature/index.ts";
import type { ItemPF2e } from "@item";
import { createBatchRuleElementUpdate } from "@module/rules/helpers.ts";
import type {
    CraftingAbilityRuleData,
    CraftingAbilityRuleSource,
} from "@module/rules/rule-element/crafting-ability.ts";
import { Predicate, RawPredicate } from "@system/predication.ts";
import * as R from "remeda";
import { CraftingFormula, PreparedFormula, PreparedFormulaData } from "./types.ts";

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
        this.checkEntryRequirements(formula);

        const quantity = await this.#batchSizeFor(formula);
        const existing = this.preparedFormulaData.find((f) => f.uuid === formula.uuid);
        if (existing && this.resource) {
            existing.quantity = quantity;
        } else {
            this.preparedFormulaData.push({ uuid: formula.uuid, quantity });
        }

        return this.#updateRuleElement();
    }

    checkEntryRequirements(formula: CraftingFormula, { warn = true } = {}): boolean {
        if (!!this.maxSlots && this.preparedFormulaData.length >= this.maxSlots) {
            if (warn) ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MaxSlots"));
            return false;
        }

        // Check if it meets the entry requirements
        const rollOptions = formula.item.getRollOptions("item");
        if (!this.craftableItems.some((c) => c.predicate.test(rollOptions))) {
            if (warn) {
                ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.ItemMissingTraits"));
            }
            return false;
        }

        // Check if it exceeds the max level we're able to output
        if (formula.item.level > this.maxItemLevel) {
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

    async toggleFormulaExpended(index: number, itemUUID: string): Promise<void> {
        const data = this.preparedFormulaData[index];
        if (data?.uuid !== itemUUID) return;
        data.expended = !data.expended;

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

    async updateFormulas(formulas: PreparedFormulaData[]): Promise<void> {
        this.preparedFormulaData = formulas;
        return this.#updateRuleElement();
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

    async #updateRuleElement(): Promise<void> {
        const rules = this.actor.rules.filter(
            (r: CraftingAbilityRuleSource): r is CraftingAbilityRuleData =>
                r.key === "CraftingAbility" && r.slug === this.slug,
        );
        const itemUpdates = createBatchRuleElementUpdate(rules, { prepared: this.preparedFormulaData });
        if (itemUpdates.length) {
            await this.actor.updateEmbeddedDocuments("Item", itemUpdates);
        }
    }
}

interface CraftingAbilityData {
    slug: string;
    resource: string | null;
    label: string;
    isAlchemical: boolean;
    isDailyPrep: boolean;
    isPrepared: boolean;
    maxSlots: number | null;
    craftableItems: CraftableItemDefinition[];
    fieldDiscovery?: RawPredicate | null;
    batchSize: number;
    fieldDiscoveryBatchSize?: number;
    maxItemLevel: number;
    preparedFormulaData: PreparedFormulaData[];
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

interface CraftableItemDefinition {
    predicate: Predicate;
    batchSize?: number;
}

export { CraftingAbility };
export type { CraftingAbilityData, CraftingAbilitySheetData, PreparedFormulaData };
