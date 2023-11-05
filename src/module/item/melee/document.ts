import type { ActorPF2e } from "@actor";
import { SIZE_TO_REACH } from "@actor/creature/values.ts";
import { ItemPF2e, WeaponPF2e } from "@item";
import { RangeData } from "@item/types.ts";
import { BaseWeaponType, WeaponCategory, WeaponGroup } from "@item/weapon/types.ts";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { simplifyFormula } from "@scripts/dice.ts";
import { DamageCategorization } from "@system/damage/helpers.ts";
import { ConvertedNPCDamage, WeaponDamagePF2e } from "@system/damage/weapon.ts";
import { sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import { MeleeFlags, MeleeSource, MeleeSystemData, NPCAttackTrait } from "./data.ts";

class MeleePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    /** Set during data preparation if a linked weapon is found */
    declare category: WeaponCategory | null;
    declare group: WeaponGroup | null;
    declare baseType: BaseWeaponType | null;

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

    /** The attribute this attack is based on: determines which of the Clumsy and Enfeebled conditions apply */
    get defaultAttribute(): "str" | "dex" {
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

    /** The range maximum and possibly also increment if a ranged attack; otherwise null */
    get range(): RangeData | null {
        if (this.isMelee) return null;

        const specifiedMaxRange = ((): number | null => {
            const rangeTrait = this.system.traits.value.find((t) => /^range-\d+$/.test(t));
            const range = Number(rangeTrait?.replace(/\D/g, "") || "NaN");
            return Number.isInteger(range) ? range : null;
        })();

        const rangeIncrement = ((): number | null => {
            if (specifiedMaxRange) return null;
            const incrementTrait = this.system.traits.value.find((t) => /^(?:range-increment|thrown)-\d+$/.test(t));
            return Number(incrementTrait?.replace(/\D/g, "")) || 10;
        })();

        return specifiedMaxRange
            ? { increment: null, max: specifiedMaxRange }
            : rangeIncrement
            ? { increment: rangeIncrement, max: rangeIncrement * 6 }
            : null;
    }

    /** The first of this attack's damage instances */
    get baseDamage(): ConvertedNPCDamage {
        const partials = Object.values(this.system.damageRolls);
        const instance = partials.find((p) => !p.category) ?? partials.at(0);
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
        return (
            baseDamage.dice > 0 ||
            baseDamage.modifier > 0 ||
            !!baseDamage.persistent?.number ||
            Object.values(this.system.damageRolls).some((d) => d.category === "splash")
        );
    }

    /** Additional effects that are part of this attack */
    get attackEffects(): string[] {
        return this.system.attackEffects.value;
    }

    get isMagical(): boolean {
        const { traits } = this;
        const magicTraits = ["magical", "arcane", "primal", "divine", "occult"] as const;
        return magicTraits.some((t) => traits.has(t));
    }

    /** The linked inventory weapon, if this melee item was spawned from one */
    get linkedWeapon(): WeaponPF2e<ActorPF2e> | null {
        const item = this.actor?.items.get(this.flags.pf2e.linkedWeapon ?? "");
        return item?.isOfType("weapon") ? item : null;
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        this.category = this.group = this.baseType = null;
        super._initialize(options);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Set precious material (currently unused)
        this.system.material = { type: null, grade: null };

        // Set empty property runes array for use by rule elements
        this.system.runes = { property: [] };

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
        this.baseType = tupleHasValue(["claw", "fist", "jaws"] as const, this.slug)
            ? this.slug
            : this.linkedWeapon?.baseType ?? null;
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

            const { isElite, isWeak } = this.actor;
            if ((isElite || isWeak) && damageInstances.indexOf(instance) === 0) {
                const adjustment = isElite ? 2 : -2;
                instance.damage = simplifyFormula(`${instance.damage} + ${adjustment}`);
            } else {
                instance.damage = new Roll(instance.damage)._formula;
            }
        }
    }

    override getRollOptions(prefix = this.type): string[] {
        const baseOptions = super.getRollOptions(prefix);

        const { damageType } = this.baseDamage;
        const damageCategory = DamageCategorization.fromDamageType(damageType);
        const rangeIncrement = this.range?.increment;
        const propertyRunes = R.mapToObj(this.system.runes.property, (p) => [`rune:property:${sluggify(p)}`, true]);

        const otherOptions = Object.entries({
            equipped: true,
            melee: this.isMelee,
            ranged: this.isRanged,
            thrown: this.isThrown,
            [`category:${this.category}`]: !!this.category,
            [`group:${this.group}`]: !!this.group,
            [`base:${this.baseType}`]: !!this.baseType,
            [`range-increment:${rangeIncrement}`]: !!rangeIncrement,
            [`damage:type:${damageType}`]: true,
            [`damage:category:${damageCategory}`]: !!damageCategory,
            ...propertyRunes,
        })
            .filter(([, isTrue]) => isTrue)
            .map(([key]) => `${prefix}:${key}`);

        return [baseOptions, otherOptions].flat().sort();
    }

    /** Treat this item like a strike in this context and post it as one */
    override async toMessage(
        _event?: MouseEvent | JQuery.TriggeredEvent,
        { create = true }: { create?: boolean } = {},
    ): Promise<ChatMessagePF2e | undefined> {
        if (!create) return undefined; // Nothing useful to do
        const strike = this.actor?.system.actions?.find((s) => s.item === this);
        return strike ? game.pf2e.rollActionMacro({ itemId: this.id, slug: strike.slug }) : undefined;
    }
}

interface MeleePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    flags: MeleeFlags;
    readonly _source: MeleeSource;
    system: MeleeSystemData;
}

export { MeleePF2e };
