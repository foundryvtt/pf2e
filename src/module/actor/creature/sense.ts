import type { ActorPF2e } from "@actor";
import type { NumberField, StringField } from "types/foundry/common/data/fields.d.ts";
import type { SenseData } from "./data.ts";
import type { SenseAcuity, SenseType } from "./index.ts";
import { SENSES_WITH_MANDATORY_ACUITIES, SENSE_ACUITIES, SENSE_TYPES } from "./values.ts";

class Sense extends foundry.abstract.DataModel<ActorPF2e, SenseSchema> {
    constructor(data: SenseConstructorParams, options: DataModelConstructionOptions<ActorPF2e>) {
        if (data.range === Infinity) data.range = null;
        super(data, { ...options, strict: false });
        this.range ??= Infinity;
        this.acuity = SENSES_WITH_MANDATORY_ACUITIES[this.type] ?? this.acuity;
    }

    static override defineSchema(): SenseSchema {
        const fields = foundry.data.fields;
        return {
            type: new fields.StringField({
                required: true,
                nullable: false,
                choices: Array.from(SENSE_TYPES),
                initial: undefined,
            }),
            acuity: new fields.StringField({
                required: true,
                nullable: false,
                choices: SENSE_ACUITIES,
                initial: "precise",
            }),
            range: new fields.NumberField({
                required: true,
                nullable: true,
                integer: true,
                positive: true,
                initial: null,
            }),
            source: new fields.StringField({ required: false, blank: false, nullable: true, initial: null }),
        };
    }

    /** The localized label of the sense */
    get label(): string | null {
        const buildLabel = (type: string, acuity?: Maybe<SenseAcuity>, range?: Maybe<number>): string => {
            const senses: Record<string, string | undefined> = CONFIG.PF2E.senses;
            const sense = game.i18n.localize(senses[type] ?? "") || type;
            const acuityLabel = acuity ? game.i18n.localize(CONFIG.PF2E.senseAcuities[acuity]) : null;
            return acuity && range
                ? game.i18n.format("PF2E.Actor.Creature.Sense.WithAcuityAndRange", {
                      sense,
                      acuity: acuityLabel,
                      range,
                  })
                : acuity
                  ? game.i18n.format("PF2E.Actor.Creature.Sense.WithAcuity", { sense, acuity: acuityLabel })
                  : range
                    ? game.i18n.format("PF2E.Actor.Creature.Sense.WithRange", { sense, range })
                    : sense;
        };

        const range = this.range < Infinity ? this.range : null;
        switch (this.type) {
            case "darkvision":
            case "greater-darkvision":
            case "low-light-vision":
            case "see-invisibility":
                // Low-light vision, darkvision, and see invisibility are always precise with no range limit
                return buildLabel(this.type);
            case "echolocation":
                // Echolocation is always precise
                return buildLabel(this.type, null, this.range);
            case "lifesense":
                // Lifesense's acuity is omitted if precise
                return buildLabel(this.type, this.acuity === "precise" ? null : this.acuity, range);
            case "truesight":
                // Truesight has an assumed and omitted range of 60 feet
                return buildLabel(this.type);
            case "scent":
                // Vague scent is assumed and omitted
                return this.acuity === "vague" ? null : buildLabel(this.type, this.acuity, range);
            default:
                return buildLabel(this.type, this.acuity, range);
        }
    }

    /** Whether to emphasize the label when displayed on actor sheets */
    get emphasizeLabel(): boolean {
        return ["see-invisibility", "truesight"].includes(this.type);
    }

    isMoreAcuteThan(sense: { acuity: SenseAcuity }): boolean {
        return (
            (this.acuity === "precise" && ["imprecise", "vague"].includes(sense.acuity ?? "precise")) ||
            (this.acuity === "imprecise" && sense.acuity === "vague")
        );
    }

    override toObject(source?: true): this["_source"];
    override toObject(source: false): LabeledSenseData<this>;
    override toObject(source?: boolean): this["_source"] | LabeledSenseData;
    override toObject(source = true): this["_source"] | LabeledSenseData {
        const data = super.toObject(source);
        return source ? data : { ...data, label: this.label, emphasizeLabel: this.emphasizeLabel };
    }
}

interface Sense extends foundry.abstract.DataModel<ActorPF2e, SenseSchema>, ModelPropsFromSchema<SenseSchema> {
    range: number;
}

type SenseConstructorParams = Partial<Omit<SenseData, "range" | "type">> & {
    type: SenseType;
    range?: number | null;
};

type SenseSchema = {
    type: StringField<SenseType, SenseType, true, false, false>;
    acuity: StringField<SenseAcuity, SenseAcuity, true, false, true>;
    range: NumberField<number, number, true, true, true>;
    source: StringField<string, string, false, true, true>;
};

type LabeledSenseData<TModel extends Sense = Sense> = RawObject<TModel> & {
    range: number;
    label: string | null;
    emphasizeLabel: boolean;
};

export { Sense, type LabeledSenseData };
