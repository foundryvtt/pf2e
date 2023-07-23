import { ActorPF2e, CharacterPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { CraftingEntryRuleData, CraftingEntryRuleSource } from "@module/rules/rule-element/crafting/entry.ts";
import { PredicatePF2e, RawPredicate } from "@system/predication.ts";
import { CraftingFormula } from "./formula.ts";

class CraftingEntry implements Omit<CraftingEntryData, "parentItem"> {
    preparedCraftingFormulas: PreparedCraftingFormula[];
    preparedFormulaData: PreparedFormulaData[];
    name: string;
    selector: string;
    isAlchemical: boolean;
    isDailyPrep: boolean;
    isPrepared: boolean;
    craftableItems: PredicatePF2e;
    maxSlots: number;
    fieldDiscovery: PredicatePF2e | null;
    batchSize?: number;
    fieldDiscoveryBatchSize?: number;
    maxItemLevel: number;
    parentItem: ItemPF2e<ActorPF2e>;

    constructor(actor: CharacterPF2e, knownFormulas: CraftingFormula[], data: CraftingEntryData) {
        this.selector = data.selector;
        this.name = data.name;
        this.isAlchemical = !!data.isAlchemical;
        this.isDailyPrep = !!data.isDailyPrep;
        this.isPrepared = !!data.isPrepared;
        this.maxSlots = data.maxSlots ?? 0;
        this.maxItemLevel = data.maxItemLevel || actor.level;
        this.fieldDiscovery = data.fieldDiscovery ? new PredicatePF2e(data.fieldDiscovery) : null;
        this.batchSize = data.batchSize;
        this.fieldDiscoveryBatchSize = data.fieldDiscoveryBatchSize;
        this.craftableItems = new PredicatePF2e(data.craftableItems);
        this.preparedFormulaData = (data.preparedFormulaData || [])
            .map((prepData) => {
                const formula = knownFormulas.find((formula) => formula.uuid === prepData.itemUUID);
                if (formula) return prepData;
                return null;
            })
            .filter((prepData): prepData is PreparedFormulaData => !!prepData);
        this.parentItem = actor.items.get(data.parentItem, { strict: true });
        this.preparedCraftingFormulas = this.preparedFormulaData
            .sort((prepDataA, prepDataB) => (prepDataA.sort ?? 0) - (prepDataB.sort ?? 0))
            .map((prepData): PreparedCraftingFormula | null => {
                const formula = knownFormulas.find((formula) => formula.uuid === prepData.itemUUID);
                if (formula) {
                    return Object.assign(new CraftingFormula(formula.item), {
                        quantity: prepData.quantity || 1,
                        expended: !!prepData.expended,
                        isSignatureItem: !!prepData.isSignatureItem,
                        sort: prepData.sort ?? 0,
                    });
                }
                return null;
            })
            .filter((prepData): prepData is PreparedCraftingFormula => !!prepData);
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

        const fieldDiscoveryQuantity = this.preparedCraftingFormulas
            .filter((f) => !!this.fieldDiscovery?.test(f.item.getRollOptions("item")) || f.isSignatureItem)
            .reduce((sum, current) => sum + current.quantity, 0);

        const otherQuantity = this.preparedCraftingFormulas
            .filter((f) => !this.fieldDiscovery?.test(f.item.getRollOptions("item")) && !f.isSignatureItem)
            .reduce((sum, current) => sum + current.quantity, 0);

        const fieldDiscoveryBatchSize = this.fieldDiscoveryBatchSize || 3;
        const batchSize = this.batchSize || 2;

        return (
            Math.floor(fieldDiscoveryQuantity / fieldDiscoveryBatchSize) +
            Math.ceil(((fieldDiscoveryQuantity % fieldDiscoveryBatchSize) + otherQuantity) / batchSize)
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
                quantity: 1,
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

    async updateFormulas(formulas: PreparedFormulaData[]): Promise<void> {
        this.preparedFormulaData = formulas;

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
}

interface CraftingEntryData {
    selector: string;
    name: string;
    parentItem: string;
    isAlchemical?: boolean;
    isDailyPrep?: boolean;
    isPrepared?: boolean;
    maxSlots?: number;
    craftableItems: RawPredicate;
    fieldDiscovery?: RawPredicate | null;
    batchSize?: number;
    fieldDiscoveryBatchSize?: number;
    maxItemLevel?: number;
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

interface PreparedFormulaSheetData {
    uuid: string;
    expended: boolean;
    img: ImageFilePath;
    name: string;
    quantity: number;
    isSignatureItem: boolean;
}

export { CraftingEntry, CraftingEntryData, PreparedFormulaData };
