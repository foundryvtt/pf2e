import { CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e, WeaponPF2e } from "@item";
import { WeaponDamage, WeaponSource } from "@item/weapon/data";
import {
    BaseWeaponType,
    OtherWeaponTag,
    WeaponCategory,
    WeaponGroup,
    WeaponRangeIncrement,
    WeaponTrait,
} from "@item/weapon/types";
import { WEAPON_CATEGORIES, WEAPON_GROUPS } from "@item/weapon/values";
import { DamageType } from "@system/damage";
import { objectHasKey, setHasElement, sluggify } from "@util";
import { RuleElementData, RuleElementPF2e, RuleElementSource } from "./";
import { RuleElementOptions } from "./base";

/**
 * Create an ephemeral strike on an actor
 * @category RuleElement
 */
class StrikeRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override slug: string;

    category: WeaponCategory;

    group: WeaponGroup;

    baseType: BaseWeaponType | null;

    traits: WeaponTrait[];

    otherTags: OtherWeaponTag[];

    range: {
        increment: number;
        max: number | null;
    } | null;

    constructor(data: StrikeSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.category = setHasElement(WEAPON_CATEGORIES, data.category) ? data.category : "unarmed";
        this.group = setHasElement(WEAPON_GROUPS, data.group) ? data.group : "brawling";
        this.baseType = objectHasKey(CONFIG.PF2E.baseWeaponTypes, data.baseType) ? data.baseType : null;

        // Permit NPC attack traits to sneak in for battle forms
        this.traits = Array.isArray(data.traits)
            ? data.traits.filter((t): t is WeaponTrait => objectHasKey(CONFIG.PF2E.npcAttackTraits, t))
            : [];

        this.otherTags = Array.isArray(data.otherTags)
            ? data.otherTags.filter((t): t is OtherWeaponTag => objectHasKey(CONFIG.PF2E.otherWeaponTags, t))
            : [];

        this.range = this.#isValidRange(data.range)
            ? {
                  increment: data.range,
                  max: this.#isValidRange(data.maxRange) ? data.maxRange : null,
              }
            : null;

        this.data.replaceAll = !!(this.data.replaceAll ?? false);
        this.data.replaceBasicUnarmed = !!(this.data.replaceBasicUnarmed ?? false);
        this.slug ??= sluggify(this.label);
    }

    #isValidRange(range: unknown): range is number {
        return typeof range === "number" && Number.isInteger(range) && range > 0;
    }

    override beforePrepareData(): void {
        const predicatePassed =
            this.predicate.length === 0 ||
            ((): boolean => {
                const rollOptions = new Set(this.actor.getRollOptions(["attack", "attack-roll", "strike-attack-roll"]));
                return this.resolveInjectedProperties(this.predicate).test(rollOptions);
            })();

        if (predicatePassed) {
            const weapon = this.constructWeapon();
            const slug = weapon.slug ?? sluggify(weapon.name);
            this.actor.synthetics.strikes.set(slug, weapon);
        }
    }

    /** Exclude other strikes if this rule element specifies that its strike replaces all others */
    override afterPrepareData(): void {
        if (!this.actor.isOfType("character")) return;

        if (this.data.replaceAll) {
            const systemData = this.actor.system;
            systemData.actions = systemData.actions.filter(
                (a) => a.item.id === this.item.id && a.item.name === this.label && a.item.group === this.group
            );
        } else if (this.data.replaceBasicUnarmed) {
            const systemData = this.actor.system;
            systemData.actions.findSplice((a) => a.item?.slug === "basic-unarmed");
        }
    }

    private constructWeapon(): Embedded<WeaponPF2e> {
        const damage: DeepPartial<WeaponDamage> = this.data.damage?.base ?? {
            damageType: "bludgeoning",
            dice: 1,
            die: "d4",
        };
        damage.damageType = this.resolveInjectedProperties(damage.damageType ?? "bludgeoning") as DamageType;

        const source: PreCreate<WeaponSource> = {
            _id: this.item.id,
            name: this.label,
            type: "weapon",
            img: this.data.img ?? this.item.img,
            system: {
                slug: this.slug,
                description: { value: "" },
                category: this.category,
                group: this.group,
                baseItem: this.baseType,
                damage,
                range: (this.range?.increment ?? null) as WeaponRangeIncrement | null,
                maxRange: this.range?.max ?? null,
                traits: { value: this.traits, otherTags: this.otherTags, rarity: "common", custom: "" },
                options: { value: this.data.options ?? [] },
                usage: { value: "held-in-one-hand" },
                equipped: {
                    carryType: "held",
                    handsHeld: 1,
                },
            },
        };

        return new WeaponPF2e(source, { parent: this.actor, pf2e: { ready: true } }) as Embedded<WeaponPF2e>;
    }
}

interface StrikeRuleElement {
    data: StrikeData;

    get actor(): CharacterPF2e | NPCPF2e;
}

interface StrikeSource extends RuleElementSource {
    img?: unknown;
    category?: unknown;
    group?: unknown;
    baseType?: unknown;
    damage?: unknown;
    range?: unknown;
    maxRange?: unknown;
    traits?: unknown;
    otherTags?: unknown;
    replaceAll?: unknown;
    replaceBasicUnarmed?: unknown;
    options?: unknown;
}

interface StrikeData extends RuleElementData {
    slug?: string;
    img?: ImagePath;
    damage?: { base?: WeaponDamage };
    replaceAll: boolean;
    replaceBasicUnarmed: boolean;
    options?: string[];
}

export { StrikeRuleElement };
