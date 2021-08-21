import { CharacterPF2e } from "@actor";
import { FormulaPF2e } from "@item";
import { ItemTrait } from "@item/data/base";
import { ErrorPF2e } from "@module/utils";
import { ItemPF2e } from "../base";
import { CraftingEntryData } from "./data";

interface ActiveFormula {
    formula: Embedded<FormulaPF2e>;
    quantity: number;
}

export class CraftingEntryPF2e extends ItemPF2e {
    static override get schema(): typeof CraftingEntryData {
        return CraftingEntryData;
    }

    private _formulas: ActiveFormula[] | null = null;
    private _reagentCost: number | null = null;

    /** A collection of all formulas prepared in this entry */
    get formulas() {
        if (!this._formulas) {
            this._formulas = [];
            if (this.actor) {
                const formulas = this.actor.itemTypes.formula.filter((i) =>
                    this.data.data.slots.prepared.find((p) => p.id === i.id)
                );
                for (const formula of formulas) {
                    const formulaPrep = this.data.data.slots.prepared.find((p) => p.id === formula.id);
                    this._formulas.push({
                        formula: formula,
                        quantity: formulaPrep?.quantity || 1,
                    });
                }
            }
        }
        return this._formulas;
    }

    /** The total cost in reagents to craft the prepared formulas */
    get reagentCost() {
        if (this.data.data.entryType.value !== "alchemical") {
            return null;
        }

        if (!(this.actor instanceof CharacterPF2e)) {
            return null;
        }

        this._reagentCost = 0;

        const fieldDiscovery = this.actor?.data.data.crafting[this.data.data.entrySelector.value]?.fieldDiscovery;
        const formulas = this.formulas;

        let fieldDiscoveryPrep = 0;
        let formulaPrep = 0;

        for (const formula of formulas) {
            if (
                (fieldDiscovery && formula.formula.data.data.traits.value.includes(fieldDiscovery as ItemTrait)) ||
                formula.formula.data.data.alchemist?.signatureItem
            ) {
                fieldDiscoveryPrep += formula.quantity;
            } else {
                formulaPrep += formula.quantity;
            }
        }

        let remainder = 0;
        this._reagentCost += Math.floor(fieldDiscoveryPrep / 3);
        remainder += fieldDiscoveryPrep % 3;
        this._reagentCost += Math.floor(formulaPrep / 2);
        remainder += formulaPrep % 2;
        this._reagentCost += Math.ceil(remainder / 2);

        return this._reagentCost;
    }

    // TODO getters for entry details. Will become useful for CUSTOM entries.

    get isDailyPrep() {
        return !(this.data.data.entryType.value === "snare");
    }

    get isAlchemical() {
        return this.data.data.entryType.value === "alchemical";
    }

    override prepareData() {
        super.prepareData();

        // Clear data to refresh formulas in exactly the same way as spell entries.
        // TODO: Will definitely need a different implementation to account for scroll prep entries
        // They can hold formulas for scrolls that are not actually part of the character (i.e the
        // character need not know the formula or spell)
        this._formulas = null;
    }

    prepareFormula(formula: FormulaPF2e) {
        // TODO: Compare formula traits/level against advanced alchemy level + item restrictions
        // - Must convert spells to formulas before adding
        // - Item limitations
        const itemRestrictions = this.data.data.itemRestrictions;
        if (itemRestrictions) {
            // Specific items overrule trait requirements.
            if (
                itemRestrictions.traits &&
                !(itemRestrictions.traits || []).every((t) => formula.data.data.traits.value.includes(t))
            ) {
                ui.notifications.warn(
                    `Formula does not meet entry requirements. Must have all of the following traits: [${itemRestrictions.traits.join(
                        ", "
                    )}]`
                );
                return;
            }

            const itemLevel =
                itemRestrictions.level ||
                (this.actor as CharacterPF2e)?.data.data.crafting[this.data.data.entrySelector.value]
                    ?.advancedAlchemyLevel;

            // Level restrictions always apply.
            if (itemLevel && formula.data.data.level.value > itemLevel) {
                ui.notifications.warn(`Formula does not meet entry requirements. Level exceeds limit of ${itemLevel}`);
                return;
            }
        }

        const updatedArray = this.data.data.slots.prepared;
        const existingEntry = updatedArray.findIndex((s) => s.id === formula.id);

        if (existingEntry < 0) {
            updatedArray.push({ id: formula.id, quantity: 1 });
        } else {
            updatedArray[existingEntry].quantity += 1;
        }
        const key = `data.slots.prepared`;
        const updates: Record<string, unknown> = { [key]: updatedArray };

        return this.update(updates);
    }

    unprepareFormula(formulaId: string) {
        const updatedArray = this.data.data.slots.prepared;
        const existingEntry = updatedArray.findIndex((s) => s.id === formulaId);

        if (existingEntry < 0) {
            throw ErrorPF2e("Formual could not be found in crafting entry");
        } else {
            updatedArray.splice(existingEntry, 1);
        }
        const key = `data.slots.prepared`;
        const updates: Record<string, unknown> = { [key]: updatedArray };
        console.log(updates);

        return this.update(updates);
    }

    decreaseQuantity(formulaId: string) {
        const updatedArray = this.data.data.slots.prepared;
        const existingEntry = updatedArray.findIndex((s) => s.id === formulaId);

        if (existingEntry < 0) {
            throw ErrorPF2e("Formual could not be found in crafting entry");
        } else {
            updatedArray[existingEntry].quantity -= 1;
            if (!updatedArray[existingEntry].quantity) {
                return this.unprepareFormula(formulaId);
            }
        }
        const key = `data.slots.prepared`;
        const updates: Record<string, unknown> = { [key]: updatedArray };

        return this.update(updates);
    }

    increaseQuantity(formulaId: string) {
        const updatedArray = this.data.data.slots.prepared;
        const existingEntry = updatedArray.findIndex((s) => s.id === formulaId);

        if (existingEntry < 0) {
            throw ErrorPF2e("Formual could not be found in crafting entry");
        } else {
            updatedArray[existingEntry].quantity += 1;
        }
        const key = `data.slots.prepared`;
        const updates: Record<string, unknown> = { [key]: updatedArray };

        return this.update(updates);
    }

    getFormulaData(this: Embedded<CraftingEntryPF2e>) {
        if (!(this.actor instanceof CharacterPF2e)) {
            throw ErrorPF2e("Crafting entries can only exist on characters");
        }

        const returnValue = {
            id: this.id,
            name: this.name,
            formulas: this.formulas,
            reagentCost: this.reagentCost,
        };

        return returnValue;
    }
}

export interface CraftingEntryPF2e {
    readonly data: CraftingEntryData;
}
