import { ImmunityType, IWRType, ResistanceType, WeaknessType } from "@actor/types";
import { CONDITION_SLUGS } from "@actor/values";
import { MAGIC_SCHOOLS, WEAPON_MATERIAL_EFFECTS } from "@item";
import { PredicatePF2e, PredicateStatement } from "@system/predication";
import { setHasElement } from "@util";

abstract class IWRData<TType extends IWRType> {
    readonly type: TType;

    readonly exceptions: TType[];

    source: string | null;

    protected abstract readonly typeLabels: Record<TType, string>;

    constructor(data: IWRConstructorData<TType>) {
        this.type = data.type;
        this.exceptions = deepClone(data.exceptions ?? []);
        this.source = data.source ?? null;
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

    get typeLabel(): string {
        return game.i18n.localize(this.typeLabels[this.type]);
    }

    protected describe(iwrType: TType): PredicateStatement[] {
        // Non-damaging IWR
        if (setHasElement(CONDITION_SLUGS, iwrType)) {
            return ["item:type:condition", `item:slug:${iwrType}`];
        }

        if (iwrType === "magical") {
            return ["item:magical"];
        }

        if (iwrType === "non-magical") {
            return [{ not: "item:magical" }];
        }

        if (iwrType in CONFIG.PF2E.damageTypes) {
            return [`damage:type:${iwrType}`];
        }

        if (iwrType === "critical-hits") {
            return ["damage:component:critical"];
        }

        if (setHasElement(WEAPON_MATERIAL_EFFECTS, iwrType)) {
            return iwrType === "silver"
                ? [{ or: ["damage:material:silver", "damage:material:mithral"] }]
                : [`damage:material:${iwrType}`];
        }

        if (setHasElement(MAGIC_SCHOOLS, iwrType)) {
            return ["item:trait:spell", `item:trait:${iwrType}`];
        }

        if (iwrType === "area-damage") {
            return ["area-damage"];
        }

        if (["physical", "energy"].includes(iwrType)) {
            return [`damage:category:${iwrType}`];
        }

        if (["precision", "splash-damage"].includes(iwrType)) {
            const component = iwrType === "splash-damage" ? "splash" : "precision";
            return [`damage:component:${component}`];
        }

        if (iwrType === "ghost-touch") {
            return ["item:rune:property:ghost-touch"];
        }

        if (["air", "earth", "water"].includes(iwrType)) {
            return [`item:trait:${iwrType}`];
        }

        if (iwrType === "unarmed-attacks") {
            return ["item:category:unarmed"];
        }

        if (iwrType === "axe-vulnerability") {
            return ["item:group:axe"];
        }

        if (iwrType === "arrow-vulnerability") {
            return ["item:group:bow", { not: "item:tag:crossbow" }];
        }

        if (iwrType === "object-immunities") {
            return [
                {
                    or: [
                        "damage:type:bleed",
                        "damage:type:mental",
                        "damage:type:poison",
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
        }

        if (iwrType === "all-damage") {
            return ["damage"];
        }

        return [`unhandled:${iwrType}`];
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
    protected createFormatData({ list, prefix }: { list: TType[]; prefix: string }): Record<string, string> {
        return list
            .slice(0, 4)
            .map((e, i) => ({ [`${prefix}${i + 1}`]: game.i18n.localize(this.typeLabels[e]) }))
            .reduce((accum, obj) => ({ ...accum, ...obj }), {});
    }

    test(statements: string[] | Set<string>): boolean {
        return this.predicate.test(statements);
    }
}

type IWRConstructorData<TType extends IWRType> = {
    type: TType;
    exceptions?: TType[];
    source?: string | null;
};

type IWRDisplayData<TType extends IWRType> = Pick<IWRData<TType>, "type" | "exceptions" | "source" | "label">;

class ImmunityData extends IWRData<ImmunityType> implements ImmunitySource {
    protected readonly typeLabels = CONFIG.PF2E.immunityTypes;

    /** No value on immunities, so the full label is the same as the application label */
    get label(): string {
        return this.applicationLabel;
    }
}

interface IWRSource<TType extends IWRType = IWRType> {
    type: TType;
    exceptions?: TType[];
}

type ImmunitySource = IWRSource<ImmunityType>;

class WeaknessData extends IWRData<WeaknessType> implements WeaknessSource {
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

type WeaknessDisplayData = IWRDisplayData<WeaknessType> & Pick<WeaknessData, "value">;

interface WeaknessSource extends IWRSource<WeaknessType> {
    value: number;
}

class ResistanceData extends IWRData<ResistanceType> implements ResistanceSource {
    protected readonly typeLabels = CONFIG.PF2E.resistanceTypes;

    value: number;

    readonly doubleVs: ResistanceType[];

    constructor(data: IWRConstructorData<ResistanceType> & { value: number; doubleVs?: ResistanceType[] }) {
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

type ResistanceDisplayData = IWRDisplayData<ResistanceType> & Pick<ResistanceData, "value" | "doubleVs">;

interface ResistanceSource extends IWRSource<ResistanceType> {
    value: number;
    doubleVs?: ResistanceType[];
}

export { IWRSource, ImmunityData, ImmunitySource, ResistanceData, ResistanceSource, WeaknessData, WeaknessSource };
