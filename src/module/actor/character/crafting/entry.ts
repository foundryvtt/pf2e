import { CharacterPF2e } from "@actor";
import { PhysicalItemTrait } from "@item/physical/data";
import { groupBy } from "@util";
import { CraftingFormula } from "./formula";

export class CraftingEntry implements CraftingEntryData {
    actorPreparedFormulas: ActorPreparedFormula[];
    preparedFormulas: PreparedFormula[];
    name: string;
    selector: string;
    isAlchemical?: boolean;
    isDailyPrep?: boolean;
    isPrepared?: boolean;
    requiredTraits?: PhysicalItemTrait[][];
    maxSlots?: number;
    fieldDiscovery?: "bomb" | "elixir" | "mutagen" | "poison";
    batchSize?: number;
    fieldDiscoveryBatchSize?: number;
    maxItemLevel?: number;

    constructor(private parentActor: CharacterPF2e, knownFormulas: CraftingFormula[], data: CraftingEntryData) {
        this.actorPreparedFormulas = data.actorPreparedFormulas;
        this.selector = data.selector;
        this.name = data.name;
        this.isAlchemical = data.isAlchemical;
        this.isDailyPrep = data.isDailyPrep;
        this.isPrepared = data.isPrepared;
        this.requiredTraits = data.requiredTraits;
        this.maxSlots = data.maxSlots;
        this.maxItemLevel = data.maxItemLevel;

        this.fieldDiscovery = data.fieldDiscovery;
        this.batchSize = data.batchSize;
        this.fieldDiscoveryBatchSize = data.fieldDiscoveryBatchSize;

        if (knownFormulas && this.actorPreparedFormulas) {
            this.preparedFormulas = this.actorPreparedFormulas
                .map((prepData): PreparedFormula | undefined => {
                    const formula = knownFormulas.find((formula) => formula.uuid === prepData.itemUUID);
                    if (formula) {
                        return Object.assign(new CraftingFormula(formula.item), {
                            quantity: prepData.quantity,
                            expended: prepData.expended,
                            isSignatureItem: prepData.isSignatureItem,
                        });
                    }
                    return;
                })
                .filter((prepData): prepData is PreparedFormula => prepData !== undefined);
        } else {
            this.preparedFormulas = [];
        }
    }

    get formulas() {
        const formulas: (PreparedFormula | null)[] = [];
        Object.assign(formulas, this.preparedFormulas);
        if (this.maxSlots) {
            const fill = this.maxSlots - this.preparedFormulas.length;
            if (fill > 0) {
                const nulls = new Array(fill).fill(null);
                return formulas.concat(nulls);
            }
        }
        return formulas;
    }

    get formulasByLevel() {
        return Object.fromEntries(groupBy(this.preparedFormulas, (prepData) => prepData.level));
    }

    get reagentCost() {
        if (!this.isAlchemical) return 0;

        const fieldDiscoveryQuantity = this.preparedFormulas
            .filter((f) => f.item.traits.has(this.fieldDiscovery!) || f.isSignatureItem)
            .reduce((sum, current) => sum + (current.quantity || 1), 0);

        const otherQuantity = this.preparedFormulas
            .filter((f) => !f.item.traits.has(this.fieldDiscovery!) && !f.isSignatureItem)
            .reduce((sum, current) => sum + (current.quantity || 1), 0);

        const fieldDiscoveryBatchSize = this.fieldDiscoveryBatchSize || 3;
        const batchSize = this.batchSize || 2;

        return (
            Math.floor(fieldDiscoveryQuantity / fieldDiscoveryBatchSize) +
            Math.ceil(((fieldDiscoveryQuantity % fieldDiscoveryBatchSize) + otherQuantity) / batchSize)
        );
    }

    async prepareFormula(formula: CraftingFormula) {
        this.checkEntryRequirements(formula);

        if (this.isAlchemical && this.preparedFormulas.find((f) => f.uuid === formula.uuid)) {
            const index = this.preparedFormulas.findIndex((f) => f.uuid === formula.uuid);
            const quantity = this.preparedFormulas[index].quantity || 1;
            this.preparedFormulas[index].quantity = quantity + 1;
        } else {
            const prepData: PreparedFormula = formula;
            if (this.isAlchemical) prepData.quantity = 1;
            this.preparedFormulas.push(prepData);
        }

        this.updateActorEntryFormulas();
    }

    checkEntryRequirements(formula: CraftingFormula) {
        if (this.maxSlots && this.preparedFormulas.length >= this.maxSlots) return;
        if (this.parentActor.level < formula.level) {
            ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.CharacterLevel"));
        }
        if (this.maxItemLevel && formula.level > this.maxItemLevel) {
            ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MaxItemLevel"));
        }
        if (
            this.requiredTraits &&
            !this.requiredTraits.some((traits) => traits.every((t) => formula.item.traits.has(t)))
        ) {
            ui.notifications.warn(
                game.i18n.format("PF2E.CraftingTab.Alerts.ItemMissingTraits", {
                    traits: JSON.stringify(this.requiredTraits),
                })
            );
        }
    }

    async unprepareFormula(index: number, itemUUID: string) {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        this.preparedFormulas.splice(index, 1);

        this.updateActorEntryFormulas();
    }

    async increaseFormulaQuantity(index: number, itemUUID: string) {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        prepData.quantity ? (prepData.quantity += 1) : (prepData.quantity = 2);
        this.updateActorEntryFormulas();
    }

    async decreaseFormulaQuantity(index: number, itemUUID: string) {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        prepData.quantity ? (prepData.quantity -= 1) : (prepData.quantity = 0);
        if (prepData.quantity <= 0) {
            await this.unprepareFormula(index, itemUUID);
            return;
        }
        this.updateActorEntryFormulas();
    }

    async toggleFormulaExpended(index: number, itemUUID: string) {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        prepData.expended = !prepData.expended;
        this.updateActorEntryFormulas();
    }

    async toggleSignatureItem(index: number, itemUUID: string) {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        prepData.isSignatureItem = !prepData.isSignatureItem;
        this.updateActorEntryFormulas();
    }

    async updateActorEntryFormulas() {
        const actorPreparedFormulas = this.preparedFormulas.map((data) => {
            return {
                itemUUID: data.item.uuid,
                quantity: data.quantity,
                expended: data.expended,
                isSignatureItem: data.isSignatureItem,
            };
        });

        await this.parentActor.update({
            [`data.crafting.entries.${this.selector}.actorPreparedFormulas`]: actorPreparedFormulas,
        });
    }
}

interface PreparedFormula extends CraftingFormula {
    quantity?: number;
    expended?: boolean;
    isSignatureItem?: boolean;
}

interface ActorPreparedFormula {
    itemUUID: string;
    quantity?: number;
    expended?: boolean;
    isSignatureItem?: boolean;
}

export interface CraftingEntryData {
    actorPreparedFormulas: ActorPreparedFormula[];
    selector: string;
    name: string;
    isAlchemical?: boolean;
    isDailyPrep?: boolean;
    isPrepared?: boolean;
    maxSlots?: number;
    requiredTraits?: PhysicalItemTrait[][];
    fieldDiscovery?: "bomb" | "elixir" | "mutagen" | "poison";
    batchSize?: number;
    fieldDiscoveryBatchSize?: number;
    maxItemLevel?: number;
}
