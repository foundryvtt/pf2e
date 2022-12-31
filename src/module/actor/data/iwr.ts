import { ImmunityType, IWRType, ResistanceType, WeaknessType } from "@actor/types";

abstract class IWRData<TType extends IWRType> {
    readonly type: TType;

    readonly exceptions: TType[];

    readonly source: string | null;

    protected abstract readonly typeLabels: Record<TType, string>;

    constructor(data: IWRConstructorData<TType>) {
        this.type = data.type;
        this.exceptions = deepClone(data.exceptions ?? []);
        this.source = data.source ?? null;
    }

    abstract get label(): string;

    get typeLabel(): string {
        return game.i18n.localize(this.typeLabels[this.type]);
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
}

type IWRConstructorData<TType extends IWRType> = {
    type: TType;
    exceptions?: TType[];
    source?: string | null;
};

type IWRDisplayData<TType extends IWRType> = Pick<IWRData<TType>, "type" | "exceptions" | "source" | "label">;

class ImmunityData extends IWRData<ImmunityType> implements ImmunitySource {
    protected readonly typeLabels = CONFIG.PF2E.immunityTypes;

    get label(): string {
        const type = this.typeLabel;
        const exceptions = this.createFormatData({ list: this.exceptions, prefix: "exception" });
        const key = `Exceptions${this.exceptions.length}DoubleVs0`;

        // Remove extra spacing from localization strings with unused {value} placeholders
        return game.i18n
            .format(`PF2E.Damage.IWR.CompositeLabel.${key}`, { type, ...exceptions, value: "" })
            .replace(/\s+/g, " ")
            .trim();
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

        return game.i18n
            .format(`PF2E.Damage.IWR.CompositeLabel.${key}`, {
                type,
                value: this.value,
                ...exceptions,
                ...doubleVs,
            })
            .toLowerCase();
    }

    override toObject(): ResistanceDisplayData {
        return {
            ...super.toObject(),
            value: this.value,
            doubleVs: deepClone(this.doubleVs),
        };
    }
}

type ResistanceDisplayData = IWRDisplayData<ResistanceType> & Pick<ResistanceData, "value" | "doubleVs">;

interface ResistanceSource extends IWRSource<ResistanceType> {
    value: number;
    doubleVs?: ResistanceType[];
}

export { IWRSource, ImmunityData, ImmunitySource, ResistanceData, ResistanceSource, WeaknessData, WeaknessSource };
