import { ActorPF2e } from "@actor";
import { SIZE_TO_REACH } from "@actor/creature/values";
import { ItemPF2e } from "@item/base";
import { ItemSummaryData } from "@item/data";
import { WeaponPF2e } from "@item/weapon";
import { BaseWeaponType, WeaponCategory, WeaponGroup, WeaponRangeIncrement } from "@item/weapon/types";
import { combineTerms } from "@scripts/dice";
import { ConvertedNPCDamage, WeaponDamagePF2e } from "@system/damage/weapon";
import { DamageCategorization } from "@system/damage/helpers";
import { tupleHasValue } from "@util";
import { MeleeFlags, MeleeSource, MeleeSystemData, NPCAttackTrait } from "./data";

class MeleePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    /** Set during data preparation if a linked weapon is found */
    category!: WeaponCategory | null;
    group!: WeaponGroup | null;
    baseType!: BaseWeaponType | null;

    get traits(): Set<NPCAttackTrait> {
        return new Set(this.system.traits.value);
    }

    get isMelee(): boolean {
        return this.system.weaponType.value === "melee";
    }

    get isRanged(): boolean {
        return this.system.weaponType.value === "ranged";
    }

    get isThrown(): boolean {
        return this.isRanged && this.system.traits.value.some((t) => t.startsWith("thrown"));
    }

    /** The ability score this attack is based on: determines which of the Clumsy and Enfeebled conditions apply */
    get ability(): "str" | "dex" {
        const { traits } = this;
        return this.isMelee ? (traits.has("finesse") ? "dex" : "str") : traits.has("brutal") ? "str" : "dex";
    }

    get attackModifier(): number {
        return Number(this.system.bonus.value) || 0;
    }

    get reach(): number | null {
        if (this.isRanged) return null;
        const reachTrait = this.system.traits.value.find((t) => /^reach-\d+$/.test(t));
        return reachTrait ? Number(reachTrait.replace("reach-", "")) : SIZE_TO_REACH[this.actor?.size ?? "med"];
    }

    /** The range increment of this attack, or null if a melee attack */
    get rangeIncrement(): WeaponRangeIncrement | null {
        if (this.isMelee) return null;

        const incrementTrait = this.system.traits.value.find((t) => /^(?:range(?:-increment)?|thrown)-\d+$/.test(t));
        const increment = Number(incrementTrait?.replace(/\D/g, "")) || 10;
        return Number.isInteger(increment) ? (increment as WeaponRangeIncrement) : null;
    }

    /** Get the maximum range of the attack */
    get maxRange(): number | null {
        if (this.isMelee) return null;

        const rangeTrait = this.system.traits.value.find((t) => /^range-\d+$/.test(t));
        const range = Number(rangeTrait?.replace(/\D/g, ""));
        if (Number.isInteger(range)) return range;

        // No explicit maximum range: multiply range increment by six or return null
        const rangeIncrement = this.rangeIncrement;
        return typeof rangeIncrement === "number" ? rangeIncrement * 6 : null;
    }

    /** The first of this attack's damage instances */
    get baseDamage(): ConvertedNPCDamage {
        const instance = Object.values(this.system.damageRolls).shift();
        if (!instance) {
            return {
                dice: 0,
                die: null,
                modifier: 0,
                damageType: "untyped",
                persistent: null,
                category: null,
            };
        }

        return WeaponDamagePF2e.npcDamageToWeaponDamage(instance);
    }

    get dealsDamage(): boolean {
        const { baseDamage } = this;
        return baseDamage.dice > 0 || baseDamage.modifier > 0;
    }

    /** Additional effects that are part of this attack */
    get attackEffects(): string[] {
        return this.system.attackEffects.value;
    }

    /** The linked inventory weapon, if this melee item was spawned from one */
    get linkedWeapon(): WeaponPF2e<ActorPF2e> | null {
        const item = this.actor?.items.get(this.flags.pf2e.linkedWeapon ?? "");
        return item?.isOfType("weapon") ? item : null;
    }

    protected override _initialize(): void {
        this.category = this.group = this.baseType = null;
        super._initialize();
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Set precious material (currently unused)
        this.system.material = { precious: null };

        for (const attackDamage of Object.values(this.system.damageRolls)) {
            attackDamage.category ||= null;
            if (attackDamage.damageType === "bleed") {
                attackDamage.category = "persistent";
            }
        }
    }

    /** Set weapon category, group, and base if that information is available */
    override prepareSiblingData(): void {
        const { linkedWeapon } = this;
        const isUnarmed = this.traits.has("unarmed");
        this.category = isUnarmed ? "unarmed" : linkedWeapon?.category ?? null;
        this.group = isUnarmed ? "brawling" : this.linkedWeapon?.group ?? null;
        this.baseType = tupleHasValue(["claw", "fist", "jaws"] as const, this.slug) ? this.slug : null;
    }

    override prepareActorData(): void {
        if (!this.actor?.isOfType("npc")) return;

        // Normalize damage instance formulas and add elite/weak adjustments
        const damageInstances = Object.values(this.system.damageRolls);
        for (const instance of Object.values(this.system.damageRolls)) {
            try {
                instance.damage = new Roll(instance.damage)._formula;
            } catch {
                const message = `Unable to parse damage formula on NPC attack ${this.name}`;
                console.warn(`PF2e System | ${message}`);
                instance.damage = "1d4";
            }

            const roll = new Roll(instance.damage);
            const { terms } = roll;
            const { isElite, isWeak } = this.actor;
            if ((isElite || isWeak) && damageInstances.indexOf(instance) === 0) {
                // Add weak or elite adjustment: Foundry's `Roll` class makes all negative `NumericTerms` positive with
                // a preceding negative `OperatorTerm`: change operator if adjustment would change the value's sign
                const modifier =
                    [...terms].reverse().find((t): t is NumericTerm => t instanceof NumericTerm) ??
                    new NumericTerm({ number: 0 });
                const previousTerm = terms[terms.indexOf(modifier) - 1];
                const signFlip = previousTerm instanceof OperatorTerm && previousTerm.operator === "-" ? -1 : 1;
                const baseValue = modifier.number * signFlip;
                const adjustedBase = baseValue + (isElite ? 2 : -2);
                modifier.number = Math.abs(adjustedBase);

                if (previousTerm instanceof OperatorTerm) {
                    if (baseValue < 0 && adjustedBase >= 0 && previousTerm.operator === "-") {
                        previousTerm.operator = "+";
                    }
                    if (baseValue >= 0 && adjustedBase < 0 && previousTerm.operator === "+") {
                        previousTerm.operator = "-";
                    }
                }

                if (!terms.includes(modifier)) {
                    const operator = new OperatorTerm({ operator: adjustedBase >= 0 ? "+" : "-" });
                    terms.push(operator, modifier);
                }
                instance.damage = combineTerms(Roll.fromTerms(terms)._formula);
            } else {
                instance.damage = roll._formula;
            }
        }
    }

    override getRollOptions(prefix = this.type): string[] {
        const baseOptions = super.getRollOptions(prefix);

        const { damageType } = this.baseDamage;
        const damageCategory = DamageCategorization.fromDamageType(damageType);

        const otherOptions = Object.entries({
            equipped: true,
            melee: this.isMelee,
            ranged: this.isRanged,
            thrown: this.isThrown,
            [`category:${this.category}`]: !!this.category,
            [`group:${this.group}`]: !!this.group,
            [`base:${this.baseType}`]: !!this.baseType,
            [`range-increment:${this.rangeIncrement}`]: !!this.rangeIncrement,
            [`damage:type:${damageType}`]: true,
            [`damage:category:${damageCategory}`]: !!damageCategory,
        })
            .filter(([, isTrue]) => isTrue)
            .map(([key]) => `${prefix}:${key}`);

        return [baseOptions, otherOptions].flat().sort();
    }

    override async getChatData(
        this: MeleePF2e<ActorPF2e>,
        htmlOptions: EnrichHTMLOptions = {}
    ): Promise<ItemSummaryData & { map2: string; map3: string } & Omit<MeleeSystemData, "traits">> {
        const systemData = this.system;
        const traits = this.traitChatData(CONFIG.PF2E.weaponTraits);

        const isAgile = this.traits.has("agile");
        const map2 = isAgile ? "-4" : "-5";
        const map3 = isAgile ? "-8" : "-10";

        return this.processChatData(htmlOptions, { ...systemData, traits, map2, map3 });
    }
}

interface MeleePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    flags: MeleeFlags;
    readonly _source: MeleeSource;
    system: MeleeSystemData;
}

export { MeleePF2e };
