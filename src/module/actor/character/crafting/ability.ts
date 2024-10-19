import type { CharacterPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import { createBatchRuleElementUpdate } from "@module/rules/helpers.ts";
import type {
    CraftingAbilityRuleData,
    CraftingAbilityRuleSource,
} from "@module/rules/rule-element/crafting-ability.ts";
import { Predicate, RawPredicate } from "@system/predication.ts";
import { ErrorPF2e } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import { CraftingFormula, PreparedFormula, PreparedFormulaData } from "./types.ts";

class CraftingAbility implements CraftingAbilityData {
    /** A label for this crafting entry to display on sheets */
    label: string;

    slug: string;

    /** This crafting ability's parent actor */
    actor: CharacterPF2e;

    preparedFormulaData: PreparedFormulaData[];
    isAlchemical: boolean;
    isDailyPrep: boolean;
    isPrepared: boolean;
    craftableItems: Predicate;
    maxSlots: number;
    fieldDiscovery: Predicate | null;
    batchSizes: { default: number; other: { definition: Predicate; quantity: number }[] };
    fieldDiscoveryBatchSize: number;
    maxItemLevel: number;

    /** A cache of all formulas that have been loaded from their compendiums */
    #preparedFormulas: PreparedFormula[] | null = null;

    constructor(actor: CharacterPF2e, data: CraftingAbilityData) {
        this.actor = actor;
        this.slug = data.slug;
        this.label = data.label;
        this.isAlchemical = data.isAlchemical;
        this.isDailyPrep = data.isDailyPrep;
        this.isPrepared = data.isPrepared;
        this.maxSlots = data.maxSlots ?? 0;
        this.maxItemLevel = data.maxItemLevel ?? this.actor.level;
        this.fieldDiscovery = data.fieldDiscovery ? new Predicate(data.fieldDiscovery) : null;
        this.batchSizes = {
            default: data.batchSizes?.default ?? (this.isAlchemical ? 2 : 1),
            other:
                data.batchSizes?.other.map((o) => ({
                    definition: new Predicate(o.definition),
                    quantity: o.quantity,
                })) ?? [],
        };
        this.fieldDiscoveryBatchSize = data.fieldDiscoveryBatchSize ?? 3;
        this.craftableItems = new Predicate(data.craftableItems);
        this.preparedFormulaData = data.preparedFormulaData ?? [];
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
            return formula
                ? {
                      ...formula,
                      quantity: prepData.quantity || 1,
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
        if (this.maxSlots > 0) {
            const fill = this.maxSlots - prepared.length;
            if (fill > 0) {
                const nulls = new Array(fill).fill(null);
                prepared.push(...nulls);
            }
        }
        return {
            label: this.label,
            slug: this.slug,
            isAlchemical: this.isAlchemical,
            isPrepared: this.isPrepared,
            isDailyPrep: this.isDailyPrep,
            maxItemLevel: this.maxItemLevel,
            maxSlots: this.maxSlots,
            reagentCost: await this.calculateReagentCost(),
            prepared,
        };
    }

    /** Computes reagent cost. Will go away once updated to PC2 */
    async calculateReagentCost(): Promise<number> {
        if (!this.isAlchemical) return 0;

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
        if (existing && this.isAlchemical) {
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

        if (formula.item.level > this.maxItemLevel) {
            if (warn) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.CraftingTab.Alerts.MaxItemLevel", { level: this.maxItemLevel }),
                );
            }
            return false;
        }

        if (!this.craftableItems.test(formula.item.getRollOptions("item"))) {
            if (warn) {
                ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.ItemMissingTraits"));
            }
            return false;
        }

        return true;
    }

    async unprepareFormula(index: number, itemUUID: string): Promise<void> {
        const formula = this.preparedFormulaData[index];
        if (!formula || formula.uuid !== itemUUID) return;

        this.preparedFormulaData.splice(index, 1);

        return this.#updateRuleElement();
    }

    async setFormulaQuantity(index: number, itemUUID: string, value: "increase" | "decrease" | number): Promise<void> {
        if (!UUIDUtils.isItemUUID(itemUUID)) {
            throw ErrorPF2e(`invalid item UUID: ${itemUUID}`);
        }
        const data = this.preparedFormulaData[index];
        if (data?.uuid !== itemUUID) return;
        const item = this.fieldDiscovery ? await fromUuid<ItemPF2e>(itemUUID) : null;
        const currentQuantity = data.quantity ?? 0;
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
            itemUUID,
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

        const specialBatchSize = this.batchSizes.other.find((s) => s.definition.test(rollOptions));
        return specialBatchSize?.quantity ?? this.batchSizes.default;
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
    label: string;
    isAlchemical: boolean;
    isDailyPrep: boolean;
    isPrepared: boolean;
    maxSlots?: number;
    craftableItems: RawPredicate;
    fieldDiscovery?: RawPredicate | null;
    batchSizes?: { default: number; other: { definition: RawPredicate; quantity: number }[] };
    fieldDiscoveryBatchSize?: number;
    maxItemLevel?: number | null;
    preparedFormulaData?: PreparedFormulaData[];
}

interface CraftingAbilitySheetData {
    slug: string;
    label: string;
    isAlchemical: boolean;
    isPrepared: boolean;
    isDailyPrep: boolean;
    maxSlots: number;
    maxItemLevel: number;
    reagentCost: number;
    prepared: (PreparedFormula | null)[];
}

export { CraftingAbility };
export type { CraftingAbilityData, CraftingAbilitySheetData, PreparedFormulaData };
