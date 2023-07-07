import { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { AbilityString } from "@actor/types.ts";
import { WeaponPF2e } from "@item";
import { NPCAttackTrait } from "@item/melee/data.ts";
import { WeaponSource } from "@item/weapon/data.ts";
import {
    BaseWeaponType,
    OtherWeaponTag,
    WeaponCategory,
    WeaponGroup,
    WeaponRangeIncrement,
    WeaponTrait,
} from "@item/weapon/types.ts";
import { DamageDieSize, DamageType } from "@system/damage/index.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { objectHasKey, sluggify } from "@util";
import type {
    ArrayField,
    BooleanField,
    FilePathField,
    NumberField,
    SchemaField,
    StringField,
} from "types/foundry/common/data/fields.d.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";
import { ResolvableValueField } from "./data.ts";

/**
 * Create an ephemeral strike on an actor
 * @category RuleElement
 */
class StrikeRuleElement extends RuleElementPF2e<StrikeSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    constructor(source: StrikeSource, options: RuleElementOptions) {
        source.img ??= options.parent.img;

        super(source, options);

        // Force a label of "Fist" if the `fist` shorthand is being used
        if (this.fist) {
            this.label = game.i18n.localize("PF2E.Weapon.Base.fist");
        }

        // Set defaults without writing to this#_source
        this.slug ??= sluggify(this.label);
        this.battleForm ??= false;
        this.fist ??= false;
        this.options ??= [];
    }

    static override defineSchema(): StrikeSchema {
        const { fields } = foundry.data;
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
                choices: CONFIG.PF2E.weaponGroups,
                initial: null,
            }),
            baseType: new fields.StringField({
                required: true,
                nullable: true,
                blank: false,
                choices: CONFIG.PF2E.baseWeaponTypes,
                initial: null,
            }),
            traits: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, choices: CONFIG.PF2E.npcAttackTraits })
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
                { required: true, nullable: false, initial: { modular: null, versatile: null } }
            ),
            otherTags: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, choices: CONFIG.PF2E.otherWeaponTags }),
                { required: false, nullable: false, initial: [] }
            ),
            range: new fields.SchemaField(
                {
                    increment: new fields.NumberField({
                        required: true,
                        integer: true,
                        min: 5,
                        nullable: false,
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
                { required: false, nullable: true, initial: null }
            ),
            damage: new fields.SchemaField({
                base: new fields.SchemaField({
                    damageType: new fields.StringField({ required: true, blank: false, initial: "bludgeoning" }),
                    dice: new ResolvableValueField({ required: true, nullable: false, initial: 1 }),
                    die: new fields.StringField({ required: true, choices: CONFIG.PF2E.damageDie, initial: "d4" }),
                    modifier: new fields.NumberField({ nullable: false, min: 0, initial: 0 }),
                }),
            }),
            img: new fields.FilePathField({
                categories: ["IMAGE"],
                nullable: false,
                initial: () => "systems/pf2e/icons/default-icons/melee.svg",
            }),
            attackModifier: new fields.NumberField({ integer: true, positive: true, nullable: true, initial: null }),
            replaceAll: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            replaceBasicUnarmed: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            battleForm: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            ability: new fields.StringField({
                required: false,
                blank: false,
                choices: CONFIG.PF2E.abilities,
                nullable: true,
                initial: null,
            }),
            options: new fields.ArrayField(new fields.StringField(), { required: false, initial: undefined }),
            fist: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
        };
    }

    /** Allow shorthand `fist` StrikeRuleElement data to pass `DataModel` validation */
    override validate(options?: {
        changes?: Record<string, unknown>;
        clean?: boolean;
        fallback?: boolean;
        strict?: boolean;
        fields?: boolean;
        joint?: boolean;
    }): boolean {
        const source = options?.changes ?? this._source;
        return source.fist === true ? true : super.validate(options);
    }

    /** Keep shorthand `fist` source data to its minimum form */
    protected override _initializeSource(source: object, options: RuleElementOptions): this["_source"] {
        return "fist" in source && source.fist === true
            ? (source as this["_source"])
            : super._initializeSource(source, options);
    }

    protected override _initialize(options?: Record<string, unknown>): void {
        if (this._source.fist) {
            this.key = "Strike";
            this.priority = 100;
            this.slug = "fist";
            this.img = "systems/pf2e/icons/features/classes/powerful-fist.webp";
            this.category = "unarmed";
            this.group = "brawling";
            this.baseType = "fist";
            this.traits = ["agile", "finesse", "nonlethal"];
            this.traitToggles = mergeObject({ modular: null, versatile: null }, this._source.traitToggles ?? {});
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
            this.fist = true;
            this.replaceAll = false;
            this.replaceBasicUnarmed = false;
            this.predicate = new PredicatePF2e([...(this._source.predicate ?? []), { gt: ["hands-free", 0] }]);
        } else {
            super._initialize(options);
        }
    }

    /** Temporary workaround until real migration */
    static override migrateData<TSource extends { range?: unknown; maxRange?: unknown }>(source: TSource): TSource {
        const premigrated = super.migrateData(source);

        if (typeof premigrated.range === "number") {
            const maxRange = typeof premigrated.maxRange === "number" ? premigrated.maxRange : null;
            premigrated.range = { increment: premigrated.range, max: maxRange };
        } else if ("maxRange" in premigrated && typeof premigrated.maxRange === "number") {
            premigrated.range = { increment: premigrated.maxRange, max: premigrated.maxRange };
        }
        delete premigrated.maxRange;

        return premigrated;
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const predicatePassed =
            this.predicate.length === 0 ||
            ((): boolean => {
                const rollOptions = new Set(this.actor.getRollOptions(["attack", "attack-roll", "strike-attack-roll"]));
                return this.resolveInjectedProperties(this.predicate).test(rollOptions);
            })();

        const damageType = this.resolveInjectedProperties(this.damage.base.damageType);
        if (!objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
            return this.failValidation("Unrecognized damage type");
        }

        const dice = ((): number => {
            const resolvedDice = Number(this.resolveValue(this.damage.base.dice));
            return Math.clamped(Math.trunc(resolvedDice), 0, 8);
        })();
        if (Number.isNaN(dice)) {
            return this.failValidation("dice does not resolve to a number");
        }

        if (predicatePassed) {
            const weapon = this.#constructWeapon(damageType, dice);
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
    #constructWeapon(damageType: DamageType, dice: number): WeaponPF2e<ActorPF2e> {
        const actorIsNPC = this.actor.isOfType("npc");
        const source: PreCreate<WeaponSource> = deepClone({
            _id: this.item.id,
            name: this.label,
            type: "weapon",
            img: this.img,
            flags: {
                pf2e: {
                    battleForm: this.battleForm,
                    fixedAttack: actorIsNPC ? this.attackModifier ?? null : null,
                },
            },
            system: {
                slug: this.slug,
                description: { value: "" },
                category: this.category,
                group: this.group,
                baseItem: this.baseType,
                ability: this.ability,
                bonus: {
                    value: actorIsNPC ? this.attackModifier ?? 0 : 0,
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
                        modular: { selection: this.traitToggles.modular },
                        versatile: { selection: this.traitToggles.versatile },
                    },
                },
                options: { value: this.options },
                usage: { value: "held-in-one-hand" },
                equipped: {
                    carryType: "held",
                    handsHeld: 1,
                },
            },
        });

        return new WeaponPF2e(source, { parent: this.actor });
    }

    /** Toggle the modular or versatile trait of this strike's weapon */
    async toggleTrait({ trait, selection }: UpdateToggleParams): Promise<void> {
        const ruleSources = deepClone(this.item._source.system.rules);
        const rule: StrikeSource | undefined = ruleSources.at(this.sourceIndex ?? NaN);
        if (rule?.key === "Strike") {
            rule.traitToggles = { ...this.traitToggles, [trait]: selection };
            await this.item.update({ "system.rules": ruleSources });
        }
    }
}

interface StrikeRuleElement extends RuleElementPF2e<StrikeSchema>, ModelPropsFromSchema<StrikeSchema> {
    slug: string;
    fist: boolean;
    options: string[];

    get actor(): CharacterPF2e | NPCPF2e;
}

type StrikeSchema = RuleElementSchema & {
    /** A weapon category */
    category: StringField<WeaponCategory, WeaponCategory, true, false, true>;
    /** A weapon group */
    group: StringField<WeaponGroup, WeaponGroup, true, true, true>;
    /** A weapon base type */
    baseType: StringField<BaseWeaponType, BaseWeaponType, true, true, true>;
    /** Permit NPC attack traits to sneak in for battle forms */
    traits: ArrayField<StringField<NPCAttackTrait, NPCAttackTrait, true, false, false>>;
    traitToggles: SchemaField<
        {
            modular: StringField<DamageType, DamageType, true, true, true>;
            versatile: StringField<DamageType, DamageType, true, true, true>;
        },
        { modular: DamageType | null; versatile: DamageType | null },
        { modular: DamageType | null; versatile: DamageType | null },
        true,
        false,
        true
    >;
    otherTags: ArrayField<
        StringField<OtherWeaponTag, OtherWeaponTag, true, false, false>,
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
    attackModifier: NumberField<number, number, false, true, true>;
    range: SchemaField<
        {
            increment: NumberField<number, number, true, false, true>;
            max: NumberField<number, number, false, true, true>;
        },
        { increment: number; max: number | null },
        { increment: number; max: number | null } | null,
        false,
        true,
        true
    >;
    damage: SchemaField<{
        base: SchemaField<{
            damageType: StringField<string, string, true, false, true>;
            dice: ResolvableValueField<true, false, true>;
            die: StringField<DamageDieSize, DamageDieSize, true, false, true>;
            modifier: NumberField<number, number, false, false, true>;
        }>;
    }>;
    ability: StringField<AbilityString, AbilityString, false, true, true>;
    /** A representative icon for the strike */
    img: FilePathField<ImageFilePath, ImageFilePath, true, false, true>;
    /** Whether to replace all other strike actions */
    replaceAll: BooleanField<boolean, boolean, false, false, false>;
    /** Whether to replace the "basic unarmed" strike action */
    replaceBasicUnarmed: BooleanField<boolean, boolean, false, false, false>;
    /** Whether this attack is from a battle form */
    battleForm: BooleanField<boolean, boolean, false, false, true>;
    options: ArrayField<StringField<string, string, true, false, false>, string[], string[], false, false, false>;
    /** Whether this was a request for a standard fist attack */
    fist: BooleanField<boolean, boolean, false, false, false>;
};

interface StrikeSource extends RuleElementSource {
    img?: unknown;
    category?: unknown;
    group?: unknown;
    baseType?: unknown;
    damage?: unknown;
    range?: unknown;
    maxRange?: unknown;
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
    selection: DamageType | null;
}

export { StrikeRuleElement };
