import type { ActorPF2e, ActorType, CharacterPF2e, NPCPF2e } from "@actor";
import type { ImageFilePath } from "@common/constants.d.mts";
import { WeaponPF2e } from "@item";
import { performLatePreparation } from "@item/helpers.ts";
import type { NPCAttackTrait } from "@item/melee/types.ts";
import { BaseShieldType } from "@item/shield/types.ts";
import type { WeaponRuneSource, WeaponSource } from "@item/weapon/data.ts";
import type {
    BaseWeaponType,
    OtherWeaponTag,
    WeaponCategory,
    WeaponRangeIncrement,
    WeaponTrait,
} from "@item/weapon/types.ts";
import type { DamageDieSize, DamageType } from "@system/damage/index.ts";
import { objectHasKey, sluggify } from "@util";
import { RuleElement, RuleElementOptions } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

/**
 * Create an ephemeral strike on an actor
 * @category RuleElement
 */
class StrikeRuleElement extends RuleElement<StrikeSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    declare graspingAppendage: boolean;

    constructor(source: StrikeSource, options: RuleElementOptions) {
        super(source, options);
        if (this.invalid) return;

        // Set defaults without writing to this#_source
        this.slug ??= sluggify(this.label);
        this.battleForm ??= false;
        this.options ??= [];
        this.graspingAppendage = ["fist", "claw"].includes(this.baseType ?? "")
            ? (this.graspingAppendage ?? true)
            : this.category === "unarmed" || this.traits.includes("unarmed")
              ? !!this.graspingAppendage
              : false;
    }

    static #defaultFistIcon: ImageFilePath = "icons/skills/melee/unarmed-punch-fist.webp";

    static override defineSchema(): StrikeSchema {
        const baseTypeChoices: Record<NonShieldWeaponType, string> = CONFIG.PF2E.baseWeaponTypes;

        return {
            ...super.defineSchema(),
            category: new fields.StringField({
                required: true,
                blank: false,
                choices: CONFIG.PF2E.weaponCategories,
                initial: "unarmed",
            }),
            group: new fields.StringField({
                required: true,
                nullable: true,
                blank: false,
                initial: null,
            }),
            baseType: new fields.StringField({
                required: true,
                nullable: true,
                blank: false,
                choices: baseTypeChoices,
                initial: null,
            }),
            traits: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, choices: CONFIG.PF2E.npcAttackTraits }),
            ),
            traitToggles: new fields.SchemaField(
                {
                    modular: new fields.StringField({
                        required: true,
                        blank: false,
                        nullable: true,
                        choices: CONFIG.PF2E.damageTypes,
                        initial: null,
                    }),
                    versatile: new fields.StringField({
                        required: true,
                        blank: false,
                        nullable: true,
                        choices: CONFIG.PF2E.damageTypes,
                        initial: null,
                    }),
                },
                { required: true, nullable: false, initial: { modular: null, versatile: null } },
            ),
            otherTags: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, choices: CONFIG.PF2E.otherWeaponTags }),
                { required: false, nullable: false, initial: [] },
            ),
            range: new fields.SchemaField(
                {
                    increment: new fields.NumberField({
                        required: false,
                        integer: true,
                        min: 5,
                        nullable: true,
                        initial: 5,
                    }),
                    max: new fields.NumberField({
                        required: false,
                        integer: true,
                        min: 5,
                        nullable: true,
                        initial: null,
                    }),
                },
                { required: false, nullable: true, initial: null },
            ),
            damage: new fields.SchemaField({
                base: new fields.SchemaField({
                    damageType: new fields.StringField({ required: true, blank: false, initial: "bludgeoning" }),
                    dice: new ResolvableValueField({ required: true, nullable: false, initial: 1 }),
                    die: new fields.StringField({ required: true, choices: CONFIG.PF2E.damageDie, initial: "d4" }),
                    modifier: new fields.NumberField({ nullable: false, integer: true, initial: 0 }),
                }),
            }),
            img: new fields.FilePathField({
                categories: ["IMAGE"],
                nullable: false,
                initial: (data) =>
                    data.fist ? StrikeRuleElement.#defaultFistIcon : `${SYSTEM_ROOT}/icons/default-icons/melee.svg`,
            }),
            attackModifier: new fields.NumberField({ integer: true, positive: true, nullable: true, initial: null }),
            replaceAll: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            replaceBasicUnarmed: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            battleForm: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            ability: new fields.StringField({
                required: false,
                blank: false,
                nullable: true,
                initial: null,
            }),
            options: new fields.ArrayField(new fields.StringField(), { required: false, initial: undefined }),
            fist: new fields.BooleanField({ required: false, nullable: false }),
            graspingAppendage: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
        };
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        super._initialize(options);

        if (this.fist) {
            this.priority = 99;
            this.slug = "fist";
            this.label = "PF2E.Weapon.Base.fist";
            this.category = "unarmed";
            this.group = "brawling";
            this.baseType = "fist";
            this.traits = ["agile", "finesse", "nonlethal"];
            this.otherTags = [];
            this.range = null;
            this.damage = {
                base: {
                    dice: 1,
                    die: "d4",
                    damageType: "bludgeoning",
                    modifier: 0,
                },
            };
            this.battleForm = false;
            this.graspingAppendage = true;
            this.replaceAll = false;
            this.replaceBasicUnarmed = false;
        } else if (this.img === `${SYSTEM_ROOT}/icons/default-icons/melee.svg`) {
            this.img = this.parent.img;
        }
    }

    override beforePrepareData(): void {
        if (!this.test()) return;
        const slug = this.slug ?? sluggify(this.label);
        this.actor.synthetics.strikes[slug] = (unarmedRunes) => this.#constructWeapon({ slug, unarmedRunes });
    }

    /** Exclude other strikes if this rule element specifies that its strike replaces all others */
    override afterPrepareData(): void {
        if (this.ignored || !this.actor.isOfType("character")) return;

        if (this.replaceAll) {
            const systemData = this.actor.system;
            systemData.actions = systemData.actions
                .filter(
                    (a) =>
                        (a.item.id === this.item.id && a.item.name === this.label && a.item.group === this.group) ||
                        a.item.shield,
                )
                .map((action) => {
                    // Continue showing shields but disable strikes with them
                    if (action.item.shield) action.canAttack = false;
                    return action;
                });
        } else if (this.replaceBasicUnarmed) {
            const systemData = this.actor.system;
            systemData.actions.findSplice((a) => a.item?.slug === "basic-unarmed");
        }
    }

    /**
     * Construct a `WeaponPF2e` instance for use as the synthetic strike
     * @param damageType The resolved damage type for the strike
     */
    #constructWeapon({ slug, unarmedRunes }: ConstructWeaponParams): WeaponPF2e<ActorPF2e> | null {
        const actor = this.actor;

        const attribute = this.resolveInjectedProperties(this.ability) || null;
        if (attribute !== null && !objectHasKey(CONFIG.PF2E.abilities, attribute)) {
            this.failValidation(`Unrecognized attribute: ${attribute}`);
            return null;
        }

        const damageType = this.resolveInjectedProperties(this.damage.base.damageType);
        if (!objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
            this.failValidation(`Unrecognized damage type: ${damageType}`);
            return null;
        }

        const dice = Math.clamp(Math.floor(Number(this.resolveValue(this.damage.base.dice))), 0, 12);
        if (Number.isNaN(dice)) {
            this.failValidation("dice does not resolve to a number");
            return null;
        }

        const group = this.resolveInjectedProperties(this.group);
        if (group !== null && !objectHasKey(CONFIG.PF2E.weaponGroups, group)) {
            this.failValidation(`Unrecognized weapon group: ${group}`);
            return null;
        }

        const actorIsNPC = actor.isOfType("npc");
        const source: PreCreate<WeaponSource> = fu.deepClone({
            _id: this.fist ? "xxxxxxFISTxxxxxx" : this.item.id,
            name: this.label,
            type: "weapon",
            img: this.img,
            flags: {
                pf2e: {
                    battleForm: this.battleForm,
                    fixedAttack: actorIsNPC ? (this.attackModifier ?? null) : null,
                },
            },
            system: {
                slug,
                description: { value: "" },
                category: this.category,
                group,
                baseItem: this.baseType,
                attribute,
                bonus: {
                    value: actorIsNPC ? (this.attackModifier ?? 0) : 0,
                },
                damage: {
                    ...this.damage.base,
                    dice,
                    damageType,
                },
                range: (this.range?.increment ?? null) as WeaponRangeIncrement | null,
                maxRange: this.range?.max ?? null,
                traits: {
                    value: this.traits as WeaponTrait[],
                    otherTags: this.otherTags,
                    rarity: "common",
                    toggles: {
                        modular: { selected: this.traitToggles.modular },
                        versatile: { selected: this.traitToggles.versatile },
                    },
                },
                options: { value: this.options },
                runes: this.category === "unarmed" ? (unarmedRunes ?? {}) : {},
                usage: { value: "held-in-one-hand" },
                equipped: {
                    carryType: "held",
                    handsHeld: 1,
                },
                graspingAppendage: this.graspingAppendage,
            },
        });

        const weapon = new WeaponPF2e(source, { parent: actor });
        weapon.rule = this;
        weapon.name = weapon._source.name; // Remove renaming by runes
        performLatePreparation(weapon);
        return weapon;
    }

    /** Toggle the modular or versatile trait of this strike's weapon */
    async toggleTrait({ trait, selected }: UpdateToggleParams): Promise<void> {
        const ruleSources = fu.deepClone(this.item._source.system.rules);
        const rule: StrikeSource | undefined = ruleSources.at(this.sourceIndex ?? NaN);
        if (rule?.key === "Strike") {
            rule.traitToggles = { ...this.traitToggles, [trait]: selected };
            await this.item.update({ "system.rules": ruleSources });
        }
    }
}

interface StrikeRuleElement extends RuleElement<StrikeSchema>, ModelPropsFromRESchema<StrikeSchema> {
    slug: string;
    fist: boolean;
    options: string[];

    get actor(): CharacterPF2e | NPCPF2e;
}

type NonShieldWeaponType = Exclude<BaseWeaponType, BaseShieldType>;
type StrikeSchema = RuleElementSchema & {
    /** A weapon category */
    category: fields.StringField<WeaponCategory, WeaponCategory, true, false, true>;
    /** A weapon group */
    group: fields.StringField<string, string, true, true, true>;
    /** A weapon base type */
    baseType: fields.StringField<NonShieldWeaponType, NonShieldWeaponType, true, true, true>;
    /** Permit NPC attack traits to sneak in for battle forms */
    traits: fields.ArrayField<fields.StringField<NPCAttackTrait, NPCAttackTrait, true, false, false>>;
    traitToggles: fields.SchemaField<
        {
            modular: fields.StringField<DamageType, DamageType, true, true, true>;
            versatile: fields.StringField<DamageType, DamageType, true, true, true>;
        },
        { modular: DamageType | null; versatile: DamageType | null },
        { modular: DamageType | null; versatile: DamageType | null },
        true,
        false,
        true
    >;
    otherTags: fields.ArrayField<
        fields.StringField<OtherWeaponTag, OtherWeaponTag, true, false, false>,
        OtherWeaponTag[],
        OtherWeaponTag[],
        false,
        false,
        true
    >;
    /**
     * A fixed attack modifier: usable only if the strike is generated for an NPC
     * Also causes the damage to not be recalculated when converting the resulting weapon to an NPC attack
     */
    attackModifier: fields.NumberField<number, number, false, true, true>;
    range: fields.SchemaField<
        {
            increment: fields.NumberField<number, number, false, true, true>;
            max: fields.NumberField<number, number, false, true, true>;
        },
        { increment: number | null; max: number | null },
        { increment: number | null; max: number | null },
        false,
        true,
        true
    >;
    damage: fields.SchemaField<{
        base: fields.SchemaField<{
            damageType: fields.StringField<string, string, true, false, true>;
            dice: ResolvableValueField<true, false, true>;
            die: fields.StringField<DamageDieSize, DamageDieSize, true, false, true>;
            modifier: fields.NumberField<number, number, false, false, true>;
        }>;
    }>;
    ability: fields.StringField<string, string, false, true, true>;
    /** A representative icon for the strike */
    img: fields.FilePathField<ImageFilePath, ImageFilePath, true, false, true>;
    /** Whether to replace all other strike actions */
    replaceAll: fields.BooleanField<boolean, boolean, false, false, false>;
    /** Whether to replace the "basic unarmed" strike action */
    replaceBasicUnarmed: fields.BooleanField<boolean, boolean, false, false, false>;
    /** Whether this attack is from a battle form */
    battleForm: fields.BooleanField<boolean, boolean, false, false, true>;
    options: fields.ArrayField<
        fields.StringField<string, string, true, false, false>,
        string[],
        string[],
        false,
        false,
        false
    >;
    /** Whether this was a request for a standard fist attack */
    fist: fields.BooleanField<boolean, boolean, false, false, true>;
    /** Whether the unarmed attack is a grasping appendage */
    graspingAppendage: fields.BooleanField<boolean, boolean, false, false, false>;
};

interface ConstructWeaponParams {
    slug: string;
    /** Weapon runes from handwraps of mighty blows */
    unarmedRunes: Maybe<WeaponRuneSource>;
}

interface StrikeSource extends RuleElementSource {
    img?: unknown;
    category?: unknown;
    group?: unknown;
    baseType?: unknown;
    damage?: unknown;
    range?: unknown;
    traits?: unknown;
    traitToggles?: unknown;
    replaceAll?: unknown;
    replaceBasicUnarmed?: unknown;
    battleForm?: unknown;
    options?: unknown;
    fist?: unknown;
}

interface UpdateToggleParams {
    trait: "modular" | "versatile";
    selected: DamageType | null;
}

export { StrikeRuleElement };
export type { StrikeSource };
