import { CharacterPF2e } from "@actor";
import { PredicatePF2e } from "@system/predication";
import { CraftingFormula, CraftingFormulaData } from "./formula";

export class CraftingEntry implements CraftingEntryData {
    preparedFormulas: CraftingFormula[];
    name: string;
    selector: string;
    isAlchemical: boolean;
    isDailyPrep: boolean;
    isPrepared: boolean;
    craftableItems: PredicatePF2e;
    maxSlots: number;
    fieldDiscovery?: "bomb" | "elixir" | "mutagen" | "poison";
    batchSize?: number;
    fieldDiscoveryBatchSize?: number;
    maxItemLevel: number;

    constructor(private parentActor: CharacterPF2e, knownFormulas: CraftingFormula[], data: CraftingEntryData) {
        this.selector = data.selector;
        this.name = data.name;
        this.isAlchemical = !!data.isAlchemical;
        this.isDailyPrep = !!data.isDailyPrep;
        this.isPrepared = !!data.isPrepared;
        this.maxSlots = data.maxSlots ?? 0;
        this.maxItemLevel = data.maxItemLevel || parentActor.level;
        this.fieldDiscovery = data.fieldDiscovery;
        this.batchSize = data.batchSize;
        this.fieldDiscoveryBatchSize = data.fieldDiscoveryBatchSize;
        this.craftableItems = data.craftableItems;
        this.preparedFormulas = knownFormulas.filter((formula) => formula.preparedData[this.selector] !== undefined);
        this.tidyUpSlotData();
    }

    get formulas(): (PreparedFormulaSheetData | null)[] {
        const formulas: (PreparedFormulaSheetData | null)[] = [];
        this.preparedFormulas.map((formula) => {
            (formula.preparedData[this.selector].slots || []).map((slot) => {
                if (slot.slot !== undefined)
                    formulas[slot.slot] = {
                        uuid: formula.uuid,
                        img: formula.img,
                        name: formula.name,
                        expended: slot.expended || false,
                        quantity: slot.quantity || 1,
                        isSignatureItem: formula.preparedData[this.selector].isSignatureItem || false,
                    };
            });
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

        const fieldDiscoveryQuantity = this.preparedFormulas
            .filter((f) => f.item.traits.has(this.fieldDiscovery!) || f.preparedData[this.selector].isSignatureItem)
            .reduce(
                (sum, current) =>
                    sum +
                    (current.preparedData[this.selector].slots || []).reduce(
                        (sum, slot) => sum + (slot.quantity || 1),
                        0
                    ),
                0
            );

        const otherQuantity = this.preparedFormulas
            .filter((f) => !f.item.traits.has(this.fieldDiscovery!) && !f.preparedData[this.selector].isSignatureItem)
            .reduce(
                (sum, current) =>
                    sum +
                    (current.preparedData[this.selector].slots || []).reduce(
                        (sum, slot) => sum + (slot.quantity || 1),
                        0
                    ),
                0
            );

        const fieldDiscoveryBatchSize = this.fieldDiscoveryBatchSize || 3;
        const batchSize = this.batchSize || 2;

        return (
            Math.floor(fieldDiscoveryQuantity / fieldDiscoveryBatchSize) +
            Math.ceil(((fieldDiscoveryQuantity % fieldDiscoveryBatchSize) + otherQuantity) / batchSize)
        );
    }

    static isValid(data?: Partial<CraftingEntry>): data is CraftingEntry {
        return !!data && !!data.name && !!data.selector;
    }

    async prepareFormula(formula: CraftingFormula): Promise<void> {
        this.checkEntryRequirements(formula);

        if (!formula.preparedData[this.selector])
            formula.preparedData[this.selector] = {
                slots: [],
            };

        if (this.isAlchemical && this.preparedFormulas.some((f) => f.uuid === formula.uuid)) {
            const slot = formula.preparedData[this.selector].slots?.find(Boolean);
            if (slot) slot.quantity ? (slot.quantity += 1) : (slot.quantity = 1);
        } else {
            // Find the first available slot
            const slot = this.formulas.indexOf(null);
            const slotData = {
                slot: slot < 0 ? this.formulas.length : slot,
                quantity: this.isAlchemical ? 1 : undefined,
            };
            formula.preparedData[this.selector].slots?.push(slotData);
            this.preparedFormulas.push(formula);
        }

        return this.updateActorEntryFormulas();
    }

    checkEntryRequirements(formula: CraftingFormula, { warn = true } = {}): boolean {
        if (!!this.maxSlots && this.formulas.filter((f) => f !== null).length >= this.maxSlots) {
            if (warn) ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MaxSlots"));
            return false;
        }
        if (this.parentActor.level < formula.level) {
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
        const formula = this.preparedFormulas.find((f) => f.uuid === itemUUID);
        if (!formula || !formula.preparedData?.[this.selector].slots) return;
        const slotIndex = formula.preparedData[this.selector].slots!.findIndex((s) => s.slot === index);
        if (slotIndex === -1) return;

        formula.preparedData[this.selector].slots!.splice(slotIndex, 1);
        if (formula.preparedData[this.selector].slots?.length === 0) delete formula.preparedData[this.selector];

        return this.updateActorEntryFormulas();
    }

    async increaseFormulaQuantity(index: number, itemUUID: string): Promise<void> {
        const formula = this.preparedFormulas.find((f) => f.uuid === itemUUID);
        if (!formula || !formula.preparedData?.[this.selector].slots) return;
        const slotIndex = formula.preparedData[this.selector].slots!.findIndex((s) => s.slot === index);
        if (slotIndex === -1) return;

        formula.preparedData[this.selector].slots![slotIndex].quantity
            ? (formula.preparedData[this.selector].slots![slotIndex].quantity! += 1)
            : (formula.preparedData[this.selector].slots![slotIndex].quantity = 2);

        return this.updateActorEntryFormulas();
    }

    async decreaseFormulaQuantity(index: number, itemUUID: string): Promise<void> {
        const formula = this.preparedFormulas.find((f) => f.uuid === itemUUID);
        if (!formula || !formula.preparedData?.[this.selector].slots) return;
        const slotIndex = formula.preparedData[this.selector].slots!.findIndex((s) => s.slot === index);
        if (slotIndex === -1) return;

        formula.preparedData[this.selector].slots![slotIndex].quantity
            ? (formula.preparedData[this.selector].slots![slotIndex].quantity! -= 1)
            : (formula.preparedData[this.selector].slots![slotIndex].quantity = 0);

        if (formula.preparedData[this.selector].slots![slotIndex].quantity! <= 0) {
            await this.unprepareFormula(index, itemUUID);
            return;
        }

        return this.updateActorEntryFormulas();
    }

    async setFormulaQuantity(index: number, itemUUID: string, quantity: number): Promise<void> {
        if (quantity <= 0) {
            await this.unprepareFormula(index, itemUUID);
            return;
        }

        const formula = this.preparedFormulas.find((f) => f.uuid === itemUUID);
        if (!formula || !formula.preparedData?.[this.selector].slots) return;
        const slotIndex = formula.preparedData[this.selector].slots!.findIndex((s) => s.slot === index);
        if (slotIndex === -1) return;

        formula.preparedData[this.selector].slots![slotIndex].quantity = quantity;

        return this.updateActorEntryFormulas();
    }

    async toggleFormulaExpended(index: number, itemUUID: string): Promise<void> {
        const formula = this.preparedFormulas.find((f) => f.uuid === itemUUID);
        if (!formula || !formula.preparedData?.[this.selector].slots) return;
        const slotIndex = formula.preparedData[this.selector].slots!.findIndex((s) => s.slot === index);
        if (slotIndex === -1) return;

        formula.preparedData[this.selector].slots![slotIndex].expended =
            !formula.preparedData[this.selector].slots![slotIndex].expended;

        return this.updateActorEntryFormulas();
    }

    async toggleSignatureItem(itemUUID: string): Promise<void> {
        const formula = this.preparedFormulas.find((f) => f.uuid === itemUUID);
        if (!formula || !formula.preparedData?.[this.selector].slots) return;

        formula.preparedData[this.selector].isSignatureItem = !formula.preparedData[this.selector].isSignatureItem;

        return this.updateActorEntryFormulas();
    }

    async updateActorEntryFormulas(): Promise<void> {
        const actorFormulas: CraftingFormulaData[] = this.parentActor.system.crafting.formulas.map((formula) => {
            const prepFormula = this.preparedFormulas.find((prep) => prep.uuid === formula.uuid);
            if (prepFormula) {
                formula.preparedData = prepFormula.preparedData;
                // If the formula was one granted by an RE, we will now be persisting it on the character and need to make it deletable
                formula.deletable = true;
            }
            return formula;
        });

        await this.parentActor.update({
            [`system.crafting.formulas`]: actorFormulas,
        });
    }

    tidyUpSlotData() {
        const length = this.formulas.length;

        for (let i = 0; i < length; i++) {
            if (this.formulas[i]) continue;
            const targetIndex = this.formulas.findIndex((value, index) => value !== null && index > i);
            if (targetIndex === -1) continue;
            this.preparedFormulas = this.preparedFormulas.map((formula) => {
                const slotIndex = formula.preparedData[this.selector].slots?.findIndex(
                    (value) => value.slot === targetIndex
                );
                if (slotIndex === -1 || slotIndex === undefined) return formula;
                formula.preparedData[this.selector].slots![slotIndex].slot = i;
                return formula;
            });
        }
    }
}

export interface CraftingEntryData {
    selector: string;
    name: string;
    isAlchemical?: boolean;
    isDailyPrep?: boolean;
    isPrepared?: boolean;
    maxSlots?: number;
    craftableItems: PredicatePF2e;
    fieldDiscovery?: "bomb" | "elixir" | "mutagen" | "poison";
    batchSize?: number;
    fieldDiscoveryBatchSize?: number;
    maxItemLevel?: number;
}

interface PreparedFormulaSheetData {
    uuid: string;
    expended: boolean;
    img: string;
    name: string;
    quantity: number;
    isSignatureItem: boolean;
}
