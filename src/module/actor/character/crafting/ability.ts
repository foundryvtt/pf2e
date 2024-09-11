import type { CharacterPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import { createBatchRuleElementUpdate } from "@module/rules/helpers.ts";
import { CraftingEntryRuleData, CraftingEntryRuleSource } from "@module/rules/rule-element/crafting-entry.ts";
import { Predicate, RawPredicate } from "@system/predication.ts";
import { ErrorPF2e } from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import { CraftingFormula } from "./formula.ts";

class CraftingAbility implements CraftingAbilityData {
    /** A label for this crafting entry to display on sheets */
    name: string;

    selector: string;

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

    #preparedCraftingFormulas: PreparedCraftingFormula[] | null = null;

    constructor(actor: CharacterPF2e, data: CraftingAbilityData) {
        this.actor = actor;
        this.selector = data.selector;
        this.name = data.name;
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

    async getPreparedCraftingFormulas(): Promise<PreparedCraftingFormula[]> {
        if (this.#preparedCraftingFormulas) return this.#preparedCraftingFormulas;

        // Filter prepared formula data to valid ones. We can't do this until we've loaded compendium items
        const knownFormulas = await this.actor.crafting.getFormulas();
        this.preparedFormulaData = (this.preparedFormulaData ?? []).filter((d) =>
            knownFormulas.some((f) => f.item.uuid === d.itemUUID),
        );

        this.#preparedCraftingFormulas = this.preparedFormulaData
            .sort((prepDataA, prepDataB) => (prepDataA.sort ?? 0) - (prepDataB.sort ?? 0))
            .flatMap((prepData): PreparedCraftingFormula | never[] => {
                const formula = knownFormulas.find((f) => f.uuid === prepData.itemUUID);
                return formula
                    ? Object.assign(new CraftingFormula(formula.item), {
                          quantity: prepData.quantity || 1,
                          expended: !!prepData.expended,
                          isSignatureItem: !!prepData.isSignatureItem,
                          sort: prepData.sort ?? 0,
                      })
                    : [];
            });
        return this.#preparedCraftingFormulas;
    }

    async getSheetData(): Promise<CraftingAbilitySheetData> {
        const preparedCraftingFormulas = await this.getPreparedCraftingFormulas();
        const formulas = preparedCraftingFormulas.map((formula) => {
            return {
                uuid: formula.uuid,
                img: formula.img,
                name: formula.name,
                expended: formula.expended,
                quantity: formula.quantity,
                isSignatureItem: formula.isSignatureItem,
            };
        });
        if (this.maxSlots > 0) {
            const fill = this.maxSlots - formulas.length;
            if (fill > 0) {
                const nulls = new Array(fill).fill(null);
                formulas.push(...nulls);
            }
        }
        return {
            name: this.name,
            selector: this.selector,
            isAlchemical: this.isAlchemical,
            isPrepared: this.isPrepared,
            isDailyPrep: this.isDailyPrep,
            maxItemLevel: this.maxItemLevel,
            maxSlots: this.maxSlots,
            reagentCost: await this.calculateReagentCost(),
            formulas,
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

    static isValid(data: Maybe<Partial<CraftingAbilityData>>): data is CraftingAbilityData {
        return !!data && !!data.name && !!data.selector;
    }

    async prepareFormula(formula: CraftingFormula): Promise<void> {
        this.checkEntryRequirements(formula);

        const quantity = await this.#batchSizeFor(formula);
        const existing = this.preparedFormulaData.find((f) => f.itemUUID === formula.uuid);
        if (existing && this.isAlchemical) {
            existing.quantity = quantity;
        } else {
            this.preparedFormulaData.push({ itemUUID: formula.uuid, quantity });
        }

        return this.#updateRuleElement();
    }

    checkEntryRequirements(formula: CraftingFormula, { warn = true } = {}): boolean {
        if (!!this.maxSlots && this.preparedFormulaData.length >= this.maxSlots) {
            if (warn) ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MaxSlots"));
            return false;
        }

        if (formula.level > this.maxItemLevel) {
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
        if (!formula || formula.itemUUID !== itemUUID) return;

        this.preparedFormulaData.splice(index, 1);

        return this.#updateRuleElement();
    }

    async setFormulaQuantity(index: number, itemUUID: string, value: "increase" | "decrease" | number): Promise<void> {
        if (!UUIDUtils.isItemUUID(itemUUID)) {
            throw ErrorPF2e(`invalid item UUID: ${itemUUID}`);
        }
        const data = this.preparedFormulaData[index];
        if (data?.itemUUID !== itemUUID) return;
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
        if (data?.itemUUID !== itemUUID) return;
        data.expended = !data.expended;

        return this.#updateRuleElement();
    }

    async toggleSignatureItem(itemUUID: string): Promise<void> {
        const data = this.preparedFormulaData.find((f) => f.itemUUID === itemUUID);
        if (data?.itemUUID !== itemUUID) return;
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
        const formula =
            data instanceof CraftingFormula ? data : knownFormulas.find((f) => f.item.uuid === data.itemUUID);
        if (!formula) return 1;

        const isSignatureItem = "isSignatureItem" in data && !!data.isSignatureItem;
        if (isSignatureItem || this.fieldDiscovery?.test(formula.options)) {
            return this.fieldDiscoveryBatchSize;
        }

        const specialBatchSize = this.batchSizes.other.find((s) => s.definition.test(formula.options));
        return specialBatchSize?.quantity ?? this.batchSizes.default;
    }

    async #updateRuleElement(): Promise<void> {
        const rules = this.actor.rules.filter(
            (r: CraftingEntryRuleSource): r is CraftingEntryRuleData =>
                r.key === "CraftingEntry" && r.selector === this.selector,
        );
        const itemUpdates = createBatchRuleElementUpdate(rules, { preparedFormulas: this.preparedFormulaData });
        if (itemUpdates.length) {
            await this.actor.updateEmbeddedDocuments("Item", itemUpdates);
        }
    }
}

interface CraftingAbilityData {
    selector: string;
    name: string;
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

interface PreparedFormulaData {
    itemUUID: string;
    quantity?: number;
    expended?: boolean;
    isSignatureItem?: boolean;
    sort?: number;
}

interface PreparedCraftingFormula extends CraftingFormula {
    quantity: number;
    expended: boolean;
    isSignatureItem: boolean;
    sort: number;
}

interface CraftingAbilitySheetData {
    name: string;
    selector: string;
    isAlchemical: boolean;
    isPrepared: boolean;
    isDailyPrep: boolean;
    maxSlots: number;
    maxItemLevel: number;
    reagentCost: number;
    formulas: ({
        uuid: string;
        expended: boolean;
        img: ImageFilePath;
        name: string;
        quantity: number;
        isSignatureItem: boolean;
    } | null)[];
}

export { CraftingAbility };
export type { CraftingAbilityData, CraftingAbilitySheetData, PreparedFormulaData };
