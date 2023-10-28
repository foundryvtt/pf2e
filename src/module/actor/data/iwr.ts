import { ImmunityType, IWRType, ResistanceType, WeaknessType } from "@actor/types.ts";
import { CONDITION_SLUGS } from "@item/condition/values.ts";
import { MAGIC_SCHOOLS } from "@item/spell/values.ts";
import { IWRException } from "@module/rules/rule-element/iwr/base.ts";
import { PredicatePF2e, PredicateStatement } from "@system/predication.ts";
import { isObject, objectHasKey, setHasElement } from "@util";

abstract class IWR<TType extends IWRType> {
    readonly type: TType;

    readonly exceptions: IWRException<TType>[];

    /** A definition for a custom IWR */
    readonly definition: PredicatePF2e | null;

    source: string | null;

    /** A label for a custom IWR */
    readonly #customLabel: string | null;

    protected abstract readonly typeLabels: Record<TType, string>;

    constructor(data: IWRConstructorData<TType>) {
        this.type = data.type;
        this.exceptions = deepClone(data.exceptions ?? []);
        this.definition = data.definition ?? null;
        this.source = data.source ?? null;
        this.#customLabel = this.type === "custom" ? data.customLabel ?? null : null;
    }

    abstract get label(): string;

    /** A label showing the type, exceptions, and doubleVs but no value (in case of weaknesses and resistances) */
    get applicationLabel(): string {
        const type = this.typeLabel;
        const exceptions = this.createFormatData({ list: this.exceptions, prefix: "exception" });
        const key = `Exceptions${this.exceptions.length}DoubleVs0`;

        // Remove extra spacing from localization strings with unused {value} placeholders
        return game.i18n
            .format(`PF2E.Damage.IWR.CompositeLabel.${key}`, { type, ...exceptions, value: "" })
            .replace(/\s+/g, " ")
            .trim();
    }

    /** A label consisting of just the type */
    get typeLabel(): string {
        return game.i18n.localize(this.#customLabel ?? this.typeLabels[this.type]);
    }

    protected describe(iwrType: IWRException<TType>): PredicateStatement[] {
        // Non-damaging IWR
        if (setHasElement(CONDITION_SLUGS, iwrType)) {
            return ["item:type:condition", `item:slug:${iwrType}`];
        }

        if (isObject(iwrType)) return iwrType.definition;

        switch (iwrType) {
            case "air":
            case "earth":
            case "metal":
            case "radiation":
            case "visual":
            case "water":
            case "wood":
                return [`item:trait:${iwrType}`];
            case "all-damage":
                return ["damage"];
            case "area-damage":
                return ["area-damage"];
            case "arrow-vulnerability":
                return ["item:group:bow", { not: "item:tag:crossbow" }];
            case "auditory":
                return ["item:trait:auditory"];
            case "axe-vulnerability":
                return ["item:group:axe"];
            case "critical-hits":
                return ["damage:component:critical"];
            case "custom":
                return this.definition ?? [];
            case "damage-from-spells":
                return ["damage", "item:type:spell", "impulse"];
            case "disease":
                return ["item:trait:disease"];
            case "emotion":
                return ["item:type:effect", "item:trait:emotion"];
            case "energy":
            case "physical":
                return [`damage:category:${iwrType}`];
            case "fear-effects":
                return ["item:type:effect", "item:trait:fear"];
            case "ghost-touch":
                return ["item:rune:property:ghost-touch"];
            case "magical":
                return ["item:magical"];
            case "mental":
                return [{ or: ["damage:type:mental", { and: ["item:type:effect", "item:trait:mental"] }] }];
            case "non-magical":
                return [{ not: "item:magical" }];
            case "object-immunities":
                return [
                    {
                        or: [
                            "damage:type:bleed",
                            "damage:type:mental",
                            "damage:type:poison",
                            "damage:type:spirit",
                            {
                                and: [
                                    "item:type:condition",
                                    {
                                        or: [
                                            "item:slug:doomed",
                                            "item:slug:drained",
                                            "item:slug:fatigued",
                                            "item:slug:paralyzed",
                                            "item:slug:sickened",
                                            "item:slug:unconscious",
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ];
            case "precision":
            case "splash-damage": {
                const component = iwrType === "splash-damage" ? "splash" : "precision";
                return [`damage:component:${component}`];
            }
            case "spells": {
                return ["damage", { or: ["item:type:spell", "item:from-spell", "impulse"] }];
            }
            case "unarmed-attacks":
                return ["item:category:unarmed"];
            default: {
                if (iwrType in CONFIG.PF2E.damageTypes) {
                    return [`damage:type:${iwrType}`];
                }

                if (objectHasKey(CONFIG.PF2E.materialDamageEffects, iwrType)) {
                    switch (iwrType) {
                        case "adamantine":
                            return [{ or: ["damage:material:adamantine", "damage:material:keep-stone"] }];
                        case "cold-iron":
                            return [{ or: ["damage:material:cold-iron", "damage:material:sovereign-steel"] }];
                        case "darkwood":
                            return [
                                {
                                    or: [
                                        "damage:material:darkwood",
                                        { and: ["self:mode:undead", "damage:material:peachwood"] },
                                    ],
                                },
                            ];
                        case "silver":
                            return [{ or: ["damage:material:silver", "damage:material:mithral"] }];
                        default:
                            return [`damage:material:${iwrType}`];
                    }
                }

                if (setHasElement(MAGIC_SCHOOLS, iwrType)) {
                    return ["item:type:effect", `item:trait:${iwrType}`];
                }

                return [`unhandled:${iwrType}`];
            }
        }
    }

    get predicate(): PredicatePF2e {
        const typeStatements = this.describe(this.type);
        const exceptions = this.exceptions.flatMap((exception): PredicateStatement | PredicateStatement[] => {
            const described = this.describe(exception).filter((s) => s !== "damage");
            return described.length === 1 ? described : { and: described };
        });

        const statements = [
            typeStatements,
            exceptions.length === 0 ? [] : exceptions.length === 1 ? { not: exceptions[0] } : { nor: exceptions },
        ].flat();

        return new PredicatePF2e(statements);
    }

    toObject(): Readonly<IWRDisplayData<TType>> {
        return {
            type: this.type,
            exceptions: deepClone(this.exceptions),
            source: this.source,
            label: this.label,
        };
    }

    /** Construct an object argument for Localization#format (see also PF2E.Actor.IWR.CompositeLabel in en.json) */
    protected createFormatData({
        list,
        prefix,
    }: {
        list: IWRException<TType>[];
        prefix: string;
    }): Record<string, string> {
        return list
            .slice(0, 4)
            .map((exception, index) => {
                const label = typeof exception === "string" ? this.typeLabels[exception] : exception.label;
                return { [`${prefix}${index + 1}`]: game.i18n.localize(label) };
            })
            .reduce((accum, obj) => ({ ...accum, ...obj }), {});
    }

    test(statements: string[] | Set<string>): boolean {
        return this.predicate.test(statements);
    }
}

type IWRConstructorData<TType extends IWRType> = {
    type: TType;
    exceptions?: IWRException<TType>[];
    customLabel?: Maybe<string>;
    definition?: Maybe<PredicatePF2e>;
    source?: string | null;
};

type IWRDisplayData<TType extends IWRType> = Pick<IWR<TType>, "type" | "exceptions" | "source" | "label">;

class Immunity extends IWR<ImmunityType> implements ImmunitySource {
    protected readonly typeLabels = CONFIG.PF2E.immunityTypes;

    /** No value on immunities, so the full label is the same as the application label */
    get label(): string {
        return this.applicationLabel;
    }
}

interface IWRSource<TType extends IWRType = IWRType> {
    type: TType;
    exceptions?: IWRException<TType>[];
}

type ImmunitySource = IWRSource<ImmunityType>;

class Weakness extends IWR<WeaknessType> implements WeaknessSource {
    protected readonly typeLabels = CONFIG.PF2E.weaknessTypes;

    value: number;

    constructor(data: IWRConstructorData<WeaknessType> & { value: number }) {
        super(data);
        this.value = data.value;
    }

    get label(): string {
        const type = this.typeLabel;
        const exceptions = this.createFormatData({ list: this.exceptions, prefix: "exception" });
        const key = `Exceptions${this.exceptions.length}DoubleVs0`;

        return game.i18n.format(`PF2E.Damage.IWR.CompositeLabel.${key}`, { type, value: this.value, ...exceptions });
    }

    override toObject(): Readonly<WeaknessDisplayData> {
        return {
            ...super.toObject(),
            value: this.value,
        };
    }
}

type WeaknessDisplayData = IWRDisplayData<WeaknessType> & Pick<Weakness, "value">;

interface WeaknessSource extends IWRSource<WeaknessType> {
    value: number;
}

class Resistance extends IWR<ResistanceType> implements ResistanceSource {
    protected readonly typeLabels = CONFIG.PF2E.resistanceTypes;

    value: number;

    readonly doubleVs: IWRException<ResistanceType>[];

    constructor(
        data: IWRConstructorData<ResistanceType> & { value: number; doubleVs?: IWRException<ResistanceType>[] },
    ) {
        super(data);
        this.value = data.value;
        this.doubleVs = deepClone(data.doubleVs ?? []);
    }

    get label(): string {
        const type = this.typeLabel;
        const exceptions = this.createFormatData({ list: this.exceptions, prefix: "exception" });
        const doubleVs = this.createFormatData({ list: this.doubleVs, prefix: "doubleVs" });
        const key = `Exceptions${this.exceptions.length}DoubleVs${this.doubleVs.length}`;

        return game.i18n.format(`PF2E.Damage.IWR.CompositeLabel.${key}`, {
            type,
            value: this.value,
            ...exceptions,
            ...doubleVs,
        });
    }

    override get applicationLabel(): string {
        const type = this.typeLabel;
        const exceptions = this.createFormatData({ list: this.exceptions, prefix: "exception" });
        const doubleVs = this.createFormatData({ list: this.doubleVs, prefix: "doubleVs" });
        const key = `Exceptions${this.exceptions.length}DoubleVs${this.doubleVs.length}`;

        return game.i18n
            .format(`PF2E.Damage.IWR.CompositeLabel.${key}`, {
                type,
                value: "",
                ...exceptions,
                ...doubleVs,
            })
            .replace(/\s+/g, " ")
            .trim();
    }

    override toObject(): ResistanceDisplayData {
        return {
            ...super.toObject(),
            value: this.value,
            doubleVs: deepClone(this.doubleVs),
        };
    }

    /** Get the doubled value of this resistance if present and applicable to a given instance of damage */
    getDoubledValue(damageDescription: Set<string>): number {
        if (this.doubleVs.length === 0) return this.value;
        const predicate = new PredicatePF2e(this.doubleVs.flatMap((d) => this.describe(d)));
        return predicate.test(damageDescription) ? this.value * 2 : this.value;
    }
}

type ResistanceDisplayData = IWRDisplayData<ResistanceType> & Pick<Resistance, "value" | "doubleVs">;

interface ResistanceSource extends IWRSource<ResistanceType> {
    value: number;
    doubleVs?: IWRException<ResistanceType>[];
}

/** Weaknesses to things that "[don't] normally deal damage, such as water": applied separately as untyped damage */
const NON_DAMAGE_WEAKNESSES: Set<WeaknessType> = new Set([
    "air",
    "earth",
    "ghost-touch",
    "metal",
    "plant",
    "radiation",
    "salt",
    "salt-water",
    "spells",
    "water",
    "wood",
]);

export { Immunity, NON_DAMAGE_WEAKNESSES, Resistance, Weakness };
export type { ImmunitySource, IWRSource, ResistanceSource, WeaknessSource };
