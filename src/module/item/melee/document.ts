import type { ActorPF2e } from "@actor";
import { SIZE_TO_REACH } from "@actor/creature/values.ts";
import { ItemPF2e, type WeaponPF2e } from "@item";
import type { RangeData } from "@item/types.ts";
import type { BaseWeaponType, WeaponCategory, WeaponGroup } from "@item/weapon/types.ts";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { simplifyFormula } from "@scripts/dice.ts";
import { DamageCategorization } from "@system/damage/helpers.ts";
import { ConvertedNPCDamage, WeaponDamagePF2e } from "@system/damage/weapon.ts";
import { sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import type { MeleeFlags, MeleeSource, MeleeSystemData } from "./data.ts";
import type { NPCAttackTrait } from "./types.ts";

class MeleePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    /** Set during data preparation if a linked weapon is found */
    declare category: WeaponCategory | null;
    declare group: WeaponGroup | null;
    declare baseType: BaseWeaponType | null;

    static override get validTraits(): Record<NPCAttackTrait, string> {
        return CONFIG.PF2E.npcAttackTraits;
    }

    get traits(): Set<NPCAttackTrait> {
        return new Set(this.system.traits.value);
    }

    get isMelee(): boolean {
        return !this.isRanged;
    }

    get isRanged(): boolean {
        return !!this.system.range;
    }

    get isThrown(): boolean {
        return this.isRanged && this.system.traits.value.some((t) => t.startsWith("thrown-"));
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
        // To mimic what weapon does, this getter computes max range from increment here rather than data prep
        // If this changes, the melee sheet and range item alterations must be changed in response
        const data = this.system.range;
        return data?.max
            ? (data as RangeData) // typescript fails to detect that data.max is not null and so we must cast
            : data?.increment
              ? { increment: data.increment, max: data.increment * 6 }
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
        const baseDamage = this.baseDamage;
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

    /** Set weapon category, group, and base if that information is available */
    override prepareSiblingData(): void {
        const linkedWeapon = this.linkedWeapon;
        const isUnarmed = this.system.traits.value.includes("unarmed");
        this.category = isUnarmed ? "unarmed" : (linkedWeapon?.category ?? null);
        this.group = isUnarmed ? "brawling" : (linkedWeapon?.group ?? null);
        this.baseType = tupleHasValue(["claw", "fist", "jaws"], this.slug)
            ? this.slug
            : (linkedWeapon?.baseType ?? null);
    }

    override prepareActorData(): void {
        const actor = this.actor;
        if (!actor?.isOfType("npc")) return;

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

            const { isElite, isWeak } = actor;
            if ((isElite || isWeak) && damageInstances.indexOf(instance) === 0) {
                const adjustment = isElite ? 2 : -2;
                instance.damage = simplifyFormula(`${instance.damage} + ${adjustment}`);
            } else {
                instance.damage = new Roll(instance.damage)._formula;
            }
        }

        // Adjust the NPC's reach if this attack has a reach treat
        const reachTrait = this.system.traits.value.find((t) => /^reach-\d+$/.test(t));
        const attackReach = Number(reachTrait?.replace(/^reach-/, "") ?? NaN);
        if (Number.isInteger(attackReach)) {
            const reach = actor.system.attributes.reach;
            reach.base = attackReach > 0 ? Math.max(attackReach, reach.base) : 0;
            reach.manipulate = reach.base;
        }
    }

    override getRollOptions(prefix = this.type, options?: { includeGranter?: boolean }): string[] {
        const baseOptions = super.getRollOptions(prefix, options);

        const damageType = this.baseDamage.damageType;
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
        _event?: PointerEvent,
        { create = true }: { create?: boolean } = {},
    ): Promise<ChatMessagePF2e | undefined> {
        if (!create) return undefined; // Nothing useful to do
        const strike = this.actor?.system.actions?.find((s) => s.item === this);
        return strike ? game.pf2e.rollActionMacro({ itemId: this.id, slug: strike.slug }) : undefined;
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: foundry.abstract.DatabaseUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (!changed.system) return super._preUpdate(changed, options, user);

        // Ensure ranges are in a valid state
        const isThrown = (changed.system.traits?.value ?? this._source.system.traits.value).some((t) =>
            t.startsWith("thrown-"),
        );
        if (isThrown || (changed.system.range?.increment === null && changed.system.range.max === null)) {
            changed.system.range = null;
        } else if (changed.system.range?.max) {
            changed.system.range.increment = null;
        }

        return super._preUpdate(changed, options, user);
    }
}

interface MeleePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    flags: MeleeFlags;
    readonly _source: MeleeSource;
    system: MeleeSystemData;
}

export { MeleePF2e };
