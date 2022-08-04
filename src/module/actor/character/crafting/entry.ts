import { CharacterPF2e } from "@actor";
import { PhysicalItemTrait } from "@item/physical/data";
import { groupBy } from "@util";
import { CraftingFormula } from "./formula";
import { CraftingInfusionRuleElement } from "@module/rules/rule-element/crafting/infusion";

export class CraftingEntry implements CraftingEntryData {
    actorPreparedFormulas: ActorPreparedFormula[];
    preparedFormulas: PreparedFormula[];
    name: string;
    selector: string;
    isAlchemical: boolean;
    isDailyPrep: boolean;
    isPrepared: boolean;
    requiredTraits: PhysicalItemTrait[][];
    maxSlots: number;
    fieldDiscovery?: "bomb" | "elixir" | "mutagen" | "poison";
    batchSize?: number;
    fieldDiscoveryBatchSize?: number;
    maxItemLevel: number;
    infusionRules: CraftingInfusionRuleElement[];

    constructor(private parentActor: CharacterPF2e, knownFormulas: CraftingFormula[], data: CraftingEntryData) {
        this.actorPreparedFormulas = data.actorPreparedFormulas;
        this.selector = data.selector;
        this.name = data.name;
        this.isAlchemical = data.isAlchemical ?? false;
        this.isDailyPrep = data.isDailyPrep ?? false;
        this.isPrepared = data.isPrepared ?? false;
        this.maxSlots = data.maxSlots ?? 0;
        this.maxItemLevel = data.maxItemLevel || parentActor.level;
        this.fieldDiscovery = data.fieldDiscovery;
        this.batchSize = data.batchSize;
        this.fieldDiscoveryBatchSize = data.fieldDiscoveryBatchSize;
        this.infusionRules = data.infusionRules || [];

        this.requiredTraits = data.requiredTraits ?? [[]];
        if (this.requiredTraits.length === 0) this.requiredTraits.push([]);

        this.preparedFormulas = this.actorPreparedFormulas
            .map((prepData): PreparedFormula | null => {
                const formula = knownFormulas.find((formula) => formula.uuid === prepData.itemUUID);
                if (formula) {
                    return Object.assign(
                        new CraftingFormula(formula.item, {
                            dc: formula.dc,
                            batchSize: formula.batchSize,
                            deletable: formula.deletable,
                        }),
                        {
                            quantity: prepData.quantity,
                            expended: prepData.expended,
                            isSignatureItem: prepData.isSignatureItem,
                    });
                }
                return null;
            })
            .filter((prepData): prepData is PreparedFormula => !!prepData);
    }

    get formulas(): (PreparedFormula | null)[] {
        const formulas: (PreparedFormula | null)[] = [];
        Object.assign(formulas, this.preparedFormulas);
        if (this.maxSlots > 0) {
            const fill = this.maxSlots - this.preparedFormulas.length;
            if (fill > 0) {
                const nulls = new Array(fill).fill(null);
                return formulas.concat(nulls);
            }
        }
        return formulas;
    }

    get formulasByLevel(): Record<string, PreparedFormula[]> {
        return Object.fromEntries(groupBy(this.preparedFormulas, (prepData) => prepData.level));
    }

    get reagentCost(): number {
        if (!this.isAlchemical) return 0;

        const fieldDiscoveryBatchSize = this.fieldDiscoveryBatchSize || 3;
        return this.preparedFormulas.reduce((sum: number, formula: PreparedFormula) => {
            const fieldDiscoveryQuantity =
                formula.item.traits.has(this.fieldDiscovery!) || formula.isSignatureItem ? formula.quantity || 1 : 0;
            const otherQuantity =
                !formula.item.traits.has(this.fieldDiscovery!) && !formula.isSignatureItem ? formula.quantity || 1 : 0;

            const batchSizeOverride = this.infusionRules
                .map((rule) => rule.getBatchSize(formula.item))
                .filter((b) => b)[0];

            const batchSize = batchSizeOverride || this.batchSize || 2;

            return (
                sum +
                Math.floor(fieldDiscoveryQuantity / fieldDiscoveryBatchSize) +
                Math.ceil(((fieldDiscoveryQuantity % fieldDiscoveryBatchSize) + otherQuantity) / batchSize)
            );
        }, 0);
    }

    static isValid(data?: Partial<CraftingEntry>): data is CraftingEntry {
        return !!data && !!data.name && !!data.selector && !!data.actorPreparedFormulas;
    }

    async prepareFormula(formula: CraftingFormula): Promise<void> {
        this.checkEntryRequirements(formula);

        if (this.isAlchemical && this.preparedFormulas.some((f) => f.uuid === formula.uuid)) {
            const index = this.preparedFormulas.findIndex((f) => f.uuid === formula.uuid);
            const quantity = this.preparedFormulas[index].quantity || 1;
            this.preparedFormulas[index].quantity = quantity + 1;
        } else {
            const prepData: PreparedFormula = formula;
            if (this.isAlchemical) prepData.quantity = 1;
            this.preparedFormulas.push(prepData);
        }

        return this.updateActorEntryFormulas();
    }

    checkEntryRequirements(formula: CraftingFormula, { warn = true } = {}): boolean {
        if (this.maxSlots && this.preparedFormulas.length >= this.maxSlots) return false;
        if (this.parentActor.level < formula.level) {
            if (warn) ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.CharacterLevel"));
            return false;
        }
        if (formula.level > this.maxItemLevel) {
            if (warn) ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MaxItemLevel"));
            return false;
        }

        if (!this.requiredTraits.some((traits) => traits.every((t) => formula.item.traits.has(t)))) {
            if (warn) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.CraftingTab.Alerts.ItemMissingTraits", {
                        traits: JSON.stringify(this.requiredTraits),
                    })
                );
            }
            return false;
        }

        return true;
    }

    async unprepareFormula(index: number, itemUUID: string): Promise<void> {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        this.preparedFormulas.splice(index, 1);

        return this.updateActorEntryFormulas();
    }

    async increaseFormulaQuantity(index: number, itemUUID: string): Promise<void> {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        prepData.quantity ? (prepData.quantity += 1) : (prepData.quantity = 2);

        return this.updateActorEntryFormulas();
    }

    async decreaseFormulaQuantity(index: number, itemUUID: string): Promise<void> {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        prepData.quantity ? (prepData.quantity -= 1) : (prepData.quantity = 0);
        if (prepData.quantity <= 0) {
            await this.unprepareFormula(index, itemUUID);
            return;
        }

        return this.updateActorEntryFormulas();
    }

    async setFormulaQuantity(index: number, itemUUID: string, quantity: number): Promise<void> {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        prepData.quantity = quantity;
        if (prepData.quantity <= 0) {
            await this.unprepareFormula(index, itemUUID);
            return;
        }

        return this.updateActorEntryFormulas();
    }

    async toggleFormulaExpended(index: number, itemUUID: string): Promise<void> {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        prepData.expended = !prepData.expended;

        return this.updateActorEntryFormulas();
    }

    async toggleSignatureItem(index: number, itemUUID: string): Promise<void> {
        const prepData = this.preparedFormulas[index];
        if (!prepData || prepData.item.uuid !== itemUUID) return;
        prepData.isSignatureItem = !prepData.isSignatureItem;

        return this.updateActorEntryFormulas();
    }

    async updateActorEntryFormulas(): Promise<void> {
        const actorPreparedFormulas = this.preparedFormulas.map((data) => {
            return {
                itemUUID: data.item.uuid,
                quantity: data.quantity,
                expended: data.expended,
                isSignatureItem: data.isSignatureItem,
            };
        });

        await this.parentActor.update({
            [`system.crafting.entries.${this.selector}.actorPreparedFormulas`]: actorPreparedFormulas,
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
    infusionRules: CraftingInfusionRuleElement[];
}
