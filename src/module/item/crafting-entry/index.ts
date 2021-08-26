import { CharacterPF2e } from "@actor";
import { FormulaPF2e } from "@item";
import { ItemTrait } from "@item/data/base";
import { ErrorPF2e } from "@module/utils";
import { ItemPF2e } from "../base";
import { CraftingEntryData } from "./data";

interface ActiveFormula {
    formula: Embedded<FormulaPF2e>;
    quantity?: number;
    expended?: boolean;
}

export class CraftingEntryPF2e extends ItemPF2e {
    static override get schema(): typeof CraftingEntryData {
        return CraftingEntryData;
    }

    private _formulas: (ActiveFormula | null)[] | null = null;
    private _reagentCost: number | null = null;

    /** A collection of all formulas prepared in this entry */
    get formulas() {
        if (!this._formulas) {
            this._formulas = [];
            if (this.actor) {
                const actorFormulas = this.actor.itemTypes.formula;
                const slots = this.data.data.slots.prepared;
                const updatedArray = Object.assign([], this.data.data.slots.prepared);

                slots.forEach((prepData, index) => {
                    const formula = actorFormulas.find((f) => f.id === prepData.id);
                    if (!formula) {
                        //TODO, tidy up unknown formulas
                        updatedArray.splice(index, 1);
                        console.log(updatedArray);
                        return;
                    }
                    this._formulas!.push({
                        formula: formula,
                        quantity: prepData?.quantity || undefined,
                        expended: prepData?.expended || undefined,
                    });
                });
                if (JSON.stringify(slots) !== JSON.stringify(updatedArray)) {
                    const key = `data.slots.prepared`;
                    const updates: Record<string, unknown> = { [key]: updatedArray };
                    this.update(updates);
                }
            }
        }

        if (this.maxSlots) {
            const fill = this.maxSlots - this._formulas.length;
            if (fill > 0) {
                const nulls = new Array(fill).fill(null);
                this._formulas = this._formulas.concat(nulls);
            }
        }

        return this._formulas;
    }

    // Organise entries with level limits into a level structure.
    get formulaByLevel() {
        if (!this.slotsByLevel) {
            return null;
        }

        const formulaRecord: Record<number, (ActiveFormula | null)[]> = {};

        // Init arrays
        for (const key of Object.keys(this.slotsByLevel).map(Number)) {
            formulaRecord[key] = [];
        }

        // Push to level
        for (const formula of this.formulas) {
            if (!formula) continue;
            const key =
                formula.formula.data.data.magicConsumable?.heightenedLevel || formula.formula.data.data.level.value;
            formulaRecord[key].push(formula);
        }

        // Fill with nulls
        for (const key of Object.keys(formulaRecord).map(Number)) {
            const fill = (this.slotsByLevel[key] || 0) - formulaRecord[key].length;
            if (fill > 0) {
                const nulls = new Array(fill).fill(null);
                formulaRecord[key] = formulaRecord[key].concat(nulls);
            }
        }

        return formulaRecord;
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
            if (!formula) {
                return;
            }

            if (
                (fieldDiscovery && formula.formula.data.data.traits.value.includes(fieldDiscovery as ItemTrait)) ||
                formula.formula.data.data.alchemist?.signatureItem
            ) {
                fieldDiscoveryPrep += formula.quantity || 0;
            } else {
                formulaPrep += formula.quantity || 0;
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

    get actionCost() {
        // Action Cost is only for snare entries
        return (this.actor as CharacterPF2e)?.data.data.crafting["snare"]?.actions || 3;
    }

    get maxSlots() {
        // Max slots for snares are CUMULATIVE.
        if (this.isSnare) {
            // Add up maximum slots
            return (this.actor as CharacterPF2e)?.data.data.crafting["snare"]?.maximumSlots || null;
        } else {
            return (
                (this.actor as CharacterPF2e)?.data.data.crafting[this.data.data.entrySelector.value]?.maximumSlots ||
                null
            );
        }
    }

    get slotsByLevel() {
        return (
            (this.actor as CharacterPF2e)?.data.data.crafting[this.data.data.entrySelector.value]?.slotsByLevel || null
        );
    }

    get isDailyPrep() {
        return !(this.data.data.entryType.value === "snare");
    }

    get isAlchemical() {
        return this.data.data.entryType.value === "alchemical";
    }

    get isSnare() {
        return this.data.data.entryType.value === "snare";
    }

    get itemRestrictions() {
        const itemRestrictions = this.data.data.itemRestrictions;

        if (this.isAlchemical && itemRestrictions !== undefined) {
            itemRestrictions.level =
                (this.actor as CharacterPF2e)?.data.data.crafting[this.data.data.entrySelector.value]
                    ?.advancedAlchemyLevel || 0;
        }

        return itemRestrictions;
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
        const updatedArray = this.data.data.slots.prepared;

        if (this.maxSlots && updatedArray.length >= this.maxSlots) {
            console.log("Max slots reached");
            return;
        }

        if (this.slotsByLevel) {
            const key = formula.data.data.magicConsumable?.heightenedLevel || formula.data.data.level.value;
            const formulasForLevel = (this.formulaByLevel?.[key] || []).filter((f) => f);
            if (formulasForLevel.length >= this.slotsByLevel[key]) {
                console.log("Max slots by level reached");
                return;
            }
        }

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

        // Alchemical entries use quantities, others use slots
        if (this.isAlchemical) {
            const existingEntry = updatedArray.findIndex((s) => s.id === formula.id);
            if (existingEntry < 0) {
                updatedArray.push({ id: formula.id, quantity: 1 });
            } else {
                updatedArray[existingEntry].quantity = (updatedArray[existingEntry].quantity || 0) + 1;
            }
        } else {
            updatedArray.push({ id: formula.id, expended: false });
        }

        const key = `data.slots.prepared`;
        const updates: Record<string, unknown> = { [key]: updatedArray };

        return this.update(updates);
    }

    unprepareFormula(formulaId: string, slotKey?: number) {
        const updatedArray = this.data.data.slots.prepared;
        if (slotKey === undefined) {
            const index = updatedArray.findIndex((f) => f.id === formulaId);

            if (index >= 0) {
                updatedArray.splice(index, 1);
            } else {
                throw ErrorPF2e("Formula could not be found in crafting entry");
            }
        } else if (updatedArray[slotKey]?.id === formulaId) {
            updatedArray.splice(slotKey, 1);
        } else {
            throw ErrorPF2e("Formula could not be found in crafting entry");
        }
        const key = `data.slots.prepared`;
        const updates: Record<string, unknown> = { [key]: updatedArray };

        return this.update(updates);
    }

    decreaseQuantity(formulaId: string, slotKey: number) {
        const updatedArray = this.data.data.slots.prepared;
        if (updatedArray[slotKey]?.id === formulaId) {
            updatedArray[slotKey].quantity = (updatedArray[slotKey].quantity || 0) - 1;
            if ((updatedArray[slotKey].quantity || 0) <= 0) {
                return this.unprepareFormula(formulaId, slotKey);
            }
        } else {
            throw ErrorPF2e("Formual could not be found in crafting entry");
        }
        const key = `data.slots.prepared`;
        const updates: Record<string, unknown> = { [key]: updatedArray };

        return this.update(updates);
    }

    increaseQuantity(formulaId: string, slotKey: number) {
        const updatedArray = this.data.data.slots.prepared;
        if (updatedArray[slotKey]?.id === formulaId) {
            updatedArray[slotKey].quantity = (updatedArray[slotKey].quantity || 0) + 1;
        } else {
            throw ErrorPF2e("Formual could not be found in crafting entry");
        }
        const key = `data.slots.prepared`;
        const updates: Record<string, unknown> = { [key]: updatedArray };

        return this.update(updates);
    }

    toggleExpended(formulaId: string, slotKey: number) {
        const updatedArray = this.data.data.slots.prepared;
        if (updatedArray[slotKey]?.id === formulaId) {
            updatedArray[slotKey].expended = !updatedArray[slotKey].expended;
        } else {
            throw ErrorPF2e("Formual could not be found in crafting entry");
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
            maxSlots: this.maxSlots,
            actionCost: this.actionCost,
            formulaByLevel: this.formulaByLevel,
        };
        return returnValue;
    }
}

export interface CraftingEntryPF2e {
    readonly data: CraftingEntryData;
}
