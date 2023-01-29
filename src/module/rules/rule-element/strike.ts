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
import { PredicatePF2e } from "@system/predication";
import { isImageFilePath, isObject, objectHasKey, setHasElement, sluggify } from "@util";
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

    /** A representative icon for the strike */
    img: ImageFilePath;

    range: {
        increment: number;
        max: number | null;
    } | null;

    /** Whether to replace all other strike actions */
    replaceAll: boolean;

    /** Whether to replace the "basic unarmed" strike action */
    replaceBasicUnarmed: boolean;

    damage: Omit<WeaponDamage, "damageType"> & { damageType: string };

    /** Whether this attack is from a battle form */
    battleForm: boolean;

    options: string[];

    /** Whether this was a request for a standard fist attack */
    fist: boolean;

    constructor(data: StrikeSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        const unarmedDamage: WeaponDamage = {
            dice: 1,
            die: "d4",
            damageType: "bludgeoning",
            modifier: 0,
            persistent: null,
        };

        // If `fist` is set to true, generate full data for standard fist attack
        if (data.fist === true) {
            this.slug = "fist";
            this.img = "systems/pf2e/icons/features/classes/powerful-fist.webp";
            this.label = game.i18n.localize("PF2E.Weapon.Base.fist");
            this.category = "unarmed";
            this.group = "brawling";
            this.baseType = "fist";
            this.traits = ["agile", "finesse", "nonlethal"];
            this.otherTags = [];
            this.range = null;
            this.damage = unarmedDamage;
            this.battleForm = false;
            this.fist = true;
            this.replaceAll = false;
            this.replaceBasicUnarmed = false;
            this.predicate = new PredicatePF2e([{ gt: ["hands-free", 0] }]);
        } else {
            this.slug ??= sluggify(this.label);
            this.img = isImageFilePath(data.img) ? data.img : this.item.img;
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

            if (this.#isWeaponDamage(data.damage)) {
                this.damage = mergeObject(unarmedDamage, data.damage.base);
            } else {
                this.failValidation("invalid or missing damage data");
                this.damage = unarmedDamage;
            }

            this.battleForm = !!data.battleForm;
            this.fist = false;

            this.replaceAll = !!data.replaceAll;
            this.replaceBasicUnarmed = !!data.replaceBasicUnarmed;
        }

        this.options =
            Array.isArray(data.options) && data.options.every((o): o is string => typeof o === "string")
                ? data.options
                : [];
    }

    #isValidRange(range: unknown): range is number {
        return typeof range === "number" && Number.isInteger(range) && range > 0;
    }

    #isWeaponDamage(data: unknown): data is { base: WeaponDamage } {
        if (!isObject<{ base: unknown }>(data)) return false;
        const damage = data.base;

        return (
            isObject<string>(damage) &&
            typeof damage.damageType === "string" &&
            typeof damage.dice === "number" &&
            (!("die" in damage) || (typeof damage.die === "string" && /^d(?:4|6|8|10|12)$/.test(damage.die)))
        );
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const predicatePassed =
            this.predicate.length === 0 ||
            ((): boolean => {
                const rollOptions = new Set(this.actor.getRollOptions(["attack", "attack-roll", "strike-attack-roll"]));
                return this.resolveInjectedProperties(this.predicate).test(rollOptions);
            })();

        const damageType = this.resolveInjectedProperties(this.damage.damageType);
        if (!objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
            return this.failValidation("Unrecognized damage type");
        }

        if (predicatePassed) {
            const weapon = this.#constructWeapon(damageType);
            const slug = weapon.slug ?? sluggify(weapon.name);
            this.actor.synthetics.strikes.set(slug, weapon);
        }
    }

    /** Exclude other strikes if this rule element specifies that its strike replaces all others */
    override afterPrepareData(): void {
        if (this.ignored || !this.actor.isOfType("character")) return;

        if (this.replaceAll) {
            const systemData = this.actor.system;
            systemData.actions = systemData.actions.filter(
                (a) => a.item.id === this.item.id && a.item.name === this.label && a.item.group === this.group
            );
        } else if (this.replaceBasicUnarmed) {
            const systemData = this.actor.system;
            systemData.actions.findSplice((a) => a.item?.slug === "basic-unarmed");
        }
    }

    /**
     * Construct a `WeaponPF2e` instance for use as the synthetic strike
     * @param damageType The resolved damage type for the strike
     */
    #constructWeapon(damageType: DamageType): Embedded<WeaponPF2e> {
        const source: PreCreate<WeaponSource> = deepClone({
            _id: this.item.id,
            name: this.label,
            type: "weapon",
            img: this.img,
            flags: { pf2e: { battleForm: this.battleForm } },
            system: {
                slug: this.slug,
                description: { value: "" },
                category: this.category,
                group: this.group,
                baseItem: this.baseType,
                damage: { ...this.damage, damageType },
                range: (this.range?.increment ?? null) as WeaponRangeIncrement | null,
                maxRange: this.range?.max ?? null,
                traits: { value: this.traits, otherTags: this.otherTags, rarity: "common" },
                options: { value: this.options ?? [] },
                usage: { value: "held-in-one-hand" },
                equipped: {
                    carryType: "held",
                    handsHeld: 1,
                },
            },
        });

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
    battleForm?: unknown;
    options?: unknown;
    fist?: unknown;
}

interface StrikeData extends RuleElementData {
    damage?: { base?: WeaponDamage };
}

export { StrikeRuleElement };
