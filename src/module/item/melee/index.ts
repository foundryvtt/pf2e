import { ItemPF2e } from "@item/base";
import { WeaponDamage } from "@item/weapon/data";
import { WeaponRangeIncrement } from "@item/weapon/types";
import { WeaponDamagePF2e } from "@system/damage";
import { MeleeData, NPCAttackTrait } from "./data";

export class MeleePF2e extends ItemPF2e {
    get traits(): Set<NPCAttackTrait> {
        return new Set(this.data.data.traits.value);
    }

    get isMelee(): boolean {
        return this.data.data.weaponType.value === "melee";
    }

    get isRanged(): boolean {
        return this.data.data.weaponType.value === "ranged";
    }

    get isThrown(): boolean {
        return this.isRanged && this.data.data.traits.value.some((t) => t.startsWith("thrown"));
    }

    /** The range increment of this attack, or null if a melee attack */
    get rangeIncrement(): WeaponRangeIncrement | null {
        if (this.isMelee) return null;

        const incrementTrait = this.data.data.traits.value.find((t) => /^(?:range(?:-increment)?|thrown)-\d+$/.test(t));
        const increment = Number(incrementTrait?.replace(/\D/g, "")) || 10;
        return Number.isInteger(increment) ? (increment as WeaponRangeIncrement) : null;
    }

    /** Get the maximum range of the attack */
    get maxRange(): number | null {
        if (this.isMelee) return null;

        const rangeTrait = this.data.data.traits.value.find((t) => /^range-\d+$/.test(t));
        const range = Number(rangeTrait?.replace(/\D/g, ""));
        if (Number.isInteger(range)) return range;

        // No explicit maximum range: multiply range increment by six or return null
        const rangeIncrement = this.rangeIncrement;
        return typeof rangeIncrement === "number" ? rangeIncrement * 6 : null;
    }

    /** The first of this attack's damage instances */
    get baseDamage(): WeaponDamage {
        const instance = Object.values(this.system.damageRolls).shift();
        if (!instance) {
            return {
                dice: 0,
                die: null,
                modifier: 0,
                damageType: "untyped",
            };
        }

        return WeaponDamagePF2e.npcDamageToWeaponDamage(instance);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Set precious material (currently unused)
        this.system.material = { precious: null };

        // Normalize damage instance formulas
        for (const instance of Object.values(this.system.damageRolls)) {
            try {
                instance.damage = new Roll(instance.damage).formula;
            } catch {
                const message = `Unable to parse damage formula on NPC attack ${this.name}`;
                console.warn(`PF2e System | ${message}`);
                instance.damage = "1d4";
            }
        }
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = this.type): string[] {
        const baseOptions = super.getRollOptions(prefix);
        const delimitedPrefix = prefix ? `${prefix}:` : "";
        const otherOptions = Object.entries({
            equipped: true,
            melee: this.isMelee,
            ranged: this.isRanged,
            thrown: this.isThrown,
            [`range-increment:${this.rangeIncrement}`]: !!this.rangeIncrement,
        })
            .filter(([_key, isTrue]) => isTrue)
            .map(([key]) => `${delimitedPrefix}${key}`);

        return [baseOptions, otherOptions].flat().sort();
    }

    override getChatData(this: Embedded<MeleePF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const traits = this.traitChatData(CONFIG.PF2E.weaponTraits);

        const isAgile = this.traits.has("agile");
        const map2 = isAgile ? "-4" : "-5";
        const map3 = isAgile ? "-8" : "-10";

        return this.processChatData(htmlOptions, { ...data, traits, map2, map3 });
    }
}

export interface MeleePF2e {
    readonly data: MeleeData;
}
