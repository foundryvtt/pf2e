import { ActorPF2e, CharacterPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { CraftingEntryRuleData, CraftingEntryRuleSource } from "@module/rules/rule-element/crafting/entry";
import { PredicatePF2e } from "@system/predication";
import { CraftingFormula } from "./formula";

export class CraftingEntry implements Omit<CraftingEntryData, "parentItem"> {
    /** Array of crafting formulas currently prepared */
    preparedCraftingFormulas: PreparedCraftingFormula[];

    /** Array of prepared item uuids and preparation data to be persisted on the parent RE */
    preparedFormulaData: PreparedFormulaData[];

    /** The display name of the crafting entry */
    name: string;

    /** The identifying selector for the crafting entry */
    selector: string;

    /** Alchemical entries do not have limited slots and formulas are crafted during daily preparations */
    isAlchemical: boolean;

    /** Formulas are crafted during daily preparations */
    isDailyPrep: boolean;

    /** Formulas are prepared to be crafted individually and expended */
    isPrepared: boolean;

    /** Predicate to determine which item formulas are usable within the entry */
    craftableItems: PredicatePF2e;

    /** How many formulas can be prepared within the entry */
    maxSlots: number;

    /** For alchemical entries: How many items are crafted by expending 1 batch of infused reagents */
    defaultBatchSize: number;

    /** The highest level of item that can be prepared within the entry. Defaults to character level. */
    maxItemLevel: number;

    /** The parent item that contains the crafting entry RE */
    parentItem: Embedded<ItemPF2e>;

    /** An array of Predicate, Batch Size pairs for determining the maximum batch size of different formulas */
    batchSizes: BatchSizeData[];

    /** Added after calculating the batch size of a formula */
    batchSizeModifier: number;

    constructor(actor: CharacterPF2e, knownFormulas: CraftingFormula[], data: CraftingEntryData) {
        this.selector = data.selector;
        this.name = data.name;
        this.isAlchemical = !!data.isAlchemical;
        this.isDailyPrep = !!data.isDailyPrep;
        this.isPrepared = !!data.isPrepared;
        this.maxSlots = data.maxSlots ?? 0;
        this.maxItemLevel = data.maxItemLevel || actor.level;
        this.defaultBatchSize = data.defaultBatchSize || 1;
        this.craftableItems = data.craftableItems;
        this.preparedFormulaData = (data.preparedFormulaData || [])
            .map((prepData) => {
                const formula = knownFormulas.find((formula) => formula.uuid === prepData.itemUUID);
                if (formula) return prepData;
                return null;
            })
            .filter((prepData): prepData is PreparedFormulaData => !!prepData);
        this.parentItem = actor.items.get(data.parentItem, { strict: true });
        this.preparedCraftingFormulas = this.preparedFormulaData
            .map((prepData): PreparedCraftingFormula | null => {
                const formula = knownFormulas.find((formula) => formula.uuid === prepData.itemUUID);
                if (formula) {
                    return Object.assign(new CraftingFormula(formula.item), {
                        quantity: prepData.quantity || 1,
                        expended: !!prepData.expended,
                        isSignatureItem: !!prepData.isSignatureItem,
                    });
                }
                return null;
            })
            .filter((prepData): prepData is PreparedCraftingFormula => !!prepData);
        this.batchSizes = data.batchSizes || [];
        this.batchSizeModifier = data.batchSizeModifier || 0;
    }

    get actor(): ActorPF2e {
        return this.parentItem.actor;
    }

    get formulas(): (PreparedFormulaSheetData | null)[] {
        const formulas: (PreparedFormulaSheetData | null)[] = this.preparedCraftingFormulas.map((formula) => {
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
                return formulas.concat(nulls);
            }
        }
        return formulas;
    }

    get reagentCost(): number {
        if (!this.isAlchemical) return 0;

        const batchQuantities = new Map<number, number>();

        for (const formula of this.preparedCraftingFormulas) {
            const rollOptions = formula.item.getRollOptions("item");
            if (formula.isSignatureItem) rollOptions.push("item:signature");
            const batchSize = this.getFormulaBatchSize(rollOptions);
            const currentQuantity = batchQuantities.get(batchSize) || 0;
            batchQuantities.set(batchSize, currentQuantity + formula.quantity);
        }

        let remainder = 0;

        return (
            Array.from(batchQuantities.entries()).reduce((total, data) => {
                const batchSize = data[0];
                const quantity = data[1];

                remainder += quantity % batchSize;
                return total + Math.floor(quantity / batchSize);
            }, 0) + Math.ceil(remainder / this.defaultBatchSize)
        );
    }

    static isValid(data?: Partial<CraftingEntryData>): data is CraftingEntryData {
        return !!data && !!data.name && !!data.selector;
    }

    async prepareFormula(formula: CraftingFormula): Promise<void> {
        this.checkEntryRequirements(formula);

        const index = this.preparedFormulaData.findIndex((f) => f.itemUUID === formula.uuid);

        if (this.isAlchemical && index !== -1) {
            const formula = this.preparedFormulaData[index];
            formula.quantity ? (formula.quantity += 1) : (formula.quantity = 2);
        } else {
            this.preparedFormulaData.push({
                itemUUID: formula.uuid,
                quantity: this.getFormulaBatchSize(formula.item.getRollOptions("item")),
            });
        }

        return this.#updateRE();
    }

    checkEntryRequirements(formula: CraftingFormula, { warn = true } = {}): boolean {
        if (!!this.maxSlots && this.formulas.filter((f) => f !== null).length >= this.maxSlots) {
            if (warn) ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MaxSlots"));
            return false;
        }
        if (this.actor.level < formula.level) {
            if (warn) ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.CharacterLevel"));
            return false;
        }
        if (formula.level > this.maxItemLevel) {
            if (warn) ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MaxItemLevel"));
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

        return this.#updateRE();
    }

    async increaseFormulaQuantity(index: number, itemUUID: string): Promise<void> {
        const formula = this.preparedFormulaData[index];
        if (!formula || formula.itemUUID !== itemUUID) return;

        formula.quantity ? (formula.quantity += 1) : (formula.quantity = 2);

        return this.#updateRE();
    }

    async decreaseFormulaQuantity(index: number, itemUUID: string): Promise<void> {
        const formula = this.preparedFormulaData[index];
        if (!formula || formula.itemUUID !== itemUUID) return;

        formula.quantity ? (formula.quantity -= 1) : (formula.quantity = 0);

        if (formula.quantity <= 0) {
            await this.unprepareFormula(index, itemUUID);
            return;
        }

        return this.#updateRE();
    }

    async setFormulaQuantity(index: number, itemUUID: string, quantity: number): Promise<void> {
        if (quantity <= 0) {
            await this.unprepareFormula(index, itemUUID);
            return;
        }

        const formula = this.preparedFormulaData[index];
        if (!formula || formula.itemUUID !== itemUUID) return;

        formula.quantity = quantity;

        return this.#updateRE();
    }

    async toggleFormulaExpended(index: number, itemUUID: string): Promise<void> {
        const formula = this.preparedFormulaData[index];
        if (!formula || formula.itemUUID !== itemUUID) return;

        formula.expended = !formula.expended;

        return this.#updateRE();
    }

    async toggleSignatureItem(itemUUID: string): Promise<void> {
        const formula = this.preparedFormulaData.find((f) => f.itemUUID === itemUUID);
        if (!formula) return;

        formula.isSignatureItem = !formula.isSignatureItem;

        return this.#updateRE();
    }

    async #updateRE(): Promise<void> {
        const rules = this.parentItem.toObject().system.rules;
        const thisRule = rules.find(
            (r: CraftingEntryRuleSource): r is CraftingEntryRuleData =>
                r.key === "CraftingEntry" && r.selector === this.selector
        );
        if (thisRule) {
            thisRule.preparedFormulas = this.preparedFormulaData;
            await this.parentItem.update({ "system.rules": rules });
        }
    }

    /** Check each predicate in the array of batch sizes, choosing the largest valid size or the default */
    getFormulaBatchSize(itemRollOptions: string[]): number {
        const defaultBatchSize = this.defaultBatchSize || 2;
        const actorRollOptions = this.actor.getRollOptions(["all"]);

        const validBatchSizes = this.batchSizes.map((data) => {
            if (data.predicate.test([...actorRollOptions, ...itemRollOptions])) {
                return data.batchSize;
            }
            return 0;
        });
        const batchSize = Math.max(...validBatchSizes);
        return (batchSize > 0 ? batchSize : defaultBatchSize) + this.batchSizeModifier;
    }
}

export interface CraftingEntryData {
    selector: string;
    name: string;
    parentItem: string;
    isAlchemical?: boolean;
    isDailyPrep?: boolean;
    isPrepared?: boolean;
    maxSlots?: number;
    craftableItems: PredicatePF2e;
    defaultBatchSize?: number;
    maxItemLevel?: number;
    preparedFormulaData?: PreparedFormulaData[];
    batchSizes?: BatchSizeData[];
    batchSizeModifier?: number;
}

interface BatchSizeData {
    batchSize: number;
    predicate: PredicatePF2e;
}

interface PreparedFormulaData {
    itemUUID: string;
    quantity?: number;
    expended?: boolean;
    isSignatureItem?: boolean;
}

interface PreparedCraftingFormula extends CraftingFormula {
    quantity: number;
    expended: boolean;
    isSignatureItem: boolean;
}

interface PreparedFormulaSheetData {
    uuid: string;
    expended: boolean;
    img: ImagePath;
    name: string;
    quantity: number;
    isSignatureItem: boolean;
}
