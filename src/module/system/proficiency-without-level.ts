import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";

type ProficiencyBonusArray = [number, number, number, number, number];
type ProficiencyBonusContext = {
    proficiencyBonus: ProficiencyBonusArray;
    initialProficiencyBonus: ProficiencyBonusArray;
};
type ProficiencyBonusCallback = (ctx: ProficiencyBonusContext) => ProficiencyBonusArray;
type UntrainedProficiencyLevelModifierContext = { proficiency: number; initialProficiency: number; level: number };
type UntrainedProficiencyLevelModifierCallback = (ctx: UntrainedProficiencyLevelModifierContext) => number;
type ProficiencyLevelModifierContext = { level: number; initialLevel: number };
type ProficiencyLevelModifierCallback = (ctx: ProficiencyLevelModifierContext) => number;
type ApplyDCContext = { dc: number; initialDC: number; level: number };
type ApplyDCCallback = (ctx: ApplyDCContext) => number;
type ApplySimpleDCContext = { dc: number; initialDC: number };
type ApplySimpleDCCallback = (ctx: ApplySimpleDCContext) => number;
type ApplyCheckContext = {
    dc: number;
    initialDC: number;
    type: string;
    actor?: ActorPF2e | null;
    item?: ItemPF2e | null;
};
type ApplyCheckCallback = (ctx: ApplyCheckContext) => number;

class ProficiencyWithoutLevel {
    static proficiencyBonusCallbacks: ProficiencyBonusCallback[] = [];
    static untrainedProficiencyLevelModifierCallbacks: UntrainedProficiencyLevelModifierCallback[] = [];
    static proficiencyLevelModifierCallbacks: ProficiencyLevelModifierCallback[] = [];
    static applyDCCallbacks: ApplyDCCallback[] = [];
    static applySimpleDCCallbacks: ApplySimpleDCCallback[] = [];
    static applyCheckCallbacks: ApplyCheckCallback[] = [];

    static enabled = false;
    static proficiencyBonus: ProficiencyBonusArray;

    static update(): void {
        this.enabled = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
        this.proficiencyBonus = [
            game.settings.get("pf2e", "proficiencyUntrainedModifier"),
            game.settings.get("pf2e", "proficiencyTrainedModifier"),
            game.settings.get("pf2e", "proficiencyExpertModifier"),
            game.settings.get("pf2e", "proficiencyMasterModifier"),
            game.settings.get("pf2e", "proficiencyLegendaryModifier"),
        ];
    }

    static getProficiencyBonuses(): ProficiencyBonusArray {
        if (this.proficiencyBonusCallbacks.length > 0) {
            const ctx: ProficiencyBonusContext = {
                proficiencyBonus: [...this.proficiencyBonus],
                initialProficiencyBonus: [...this.proficiencyBonus],
            };
            this.proficiencyBonusCallbacks.forEach((func) => (ctx.proficiencyBonus = func({ ...ctx })));
            return ctx.proficiencyBonus;
        }
        if (this.enabled) {
            return [...this.proficiencyBonus];
        }
        // Default pf2e Bonuses
        return [0, 2, 4, 6, 8];
    }

    static applyUntrainedProficiencyLevelModifier(level: number): number {
        if (this.untrainedProficiencyLevelModifierCallbacks.length > 0) {
            const ctx: UntrainedProficiencyLevelModifierContext = {
                proficiency: this.enabled ? this.proficiencyBonus[0] : 0,
                initialProficiency: this.enabled ? this.proficiencyBonus[0] : 0,
                level,
            };
            this.untrainedProficiencyLevelModifierCallbacks.forEach((func) => (ctx.proficiency = func({ ...ctx })));
            return ctx.proficiency;
        }
        if (this.enabled) {
            // Take the middle point between untrained and trained
            // If untrained is -2, as recommended, then this bonus will be 0
            return Math.floor((this.proficiencyBonus[0] + this.proficiencyBonus[1]) / 2);
        }
        return level;
    }

    static applyProficiencyLevelModifier(level: number): number {
        if (this.proficiencyLevelModifierCallbacks.length > 0) {
            const ctx: ProficiencyLevelModifierContext = {
                level,
                initialLevel: level,
            };
            this.proficiencyLevelModifierCallbacks.forEach((func) => (ctx.level = func({ ...ctx })));
            return ctx.level;
        }
        if (this.enabled) {
            return 0;
        }
        return level;
    }

    static applyDC(dc: number, level: number): number {
        if (this.applyDCCallbacks.length > 0) {
            const ctx: ApplyDCContext = {
                dc,
                initialDC: dc,
                level,
            };
            this.applyDCCallbacks.forEach((func) => (ctx.dc = func({ ...ctx })));
            return ctx.dc;
        }
        if (this.enabled) {
            // -1 shouldn't be subtracted since it's just
            // a creature level and not related to PC levels
            return dc - Math.max(0, level);
        }
        return dc;
    }

    static applySimpleDC(dc: number): number {
        if (this.applySimpleDCCallbacks.length > 0) {
            const ctx: ApplySimpleDCContext = {
                dc,
                initialDC: dc,
            };
            this.applySimpleDCCallbacks.forEach((func) => (ctx.dc = func({ ...ctx })));
            return ctx.dc;
        }
        if (this.enabled) {
            // Till 20 it is the same, and then it scales half as much
            return dc - Math.floor(Math.max(0, dc - 20) / 2);
        }
        return dc;
    }

    static applyCheck(dc: number, type: string, actor?: ActorPF2e | null, item?: ItemPF2e | null): number {
        if (this.applyCheckCallbacks.length > 0) {
            const ctx: ApplyCheckContext = {
                dc,
                initialDC: dc,
                type,
                actor,
                item,
            };
            this.applyCheckCallbacks.forEach((func) => (ctx.dc = func({ ...ctx })));
            return ctx.dc;
        }
        if (this.enabled) {
            if (type !== "flat") {
                // If the item has a level use this,
                // otherwise take the actors level
                // if that also does not exist then do nothing
                return dc - Number(item?.system.level?.value ?? actor?.system.details.level.value ?? 0);
            }
        }
        return dc;
    }
}

export { ProficiencyWithoutLevel };
