import { objectHasKey } from "@util";
import { SenseData } from "./data.ts";
import { SENSES_WITH_MANDATORY_ACUITIES } from "./values.ts";

export class CreatureSensePF2e implements SenseData {
    /** low-light vision, darkvision, scent, etc. */
    type: SenseType;
    /** One of "precise", "imprecise", or "vague" */
    acuity: SenseAcuity;
    /** The range of the sense, if any */
    value: string;
    /** The source of the sense, if any */
    source?: string;

    get range(): number {
        return Number(this.value) || Infinity;
    }

    constructor(data: Omit<SenseData, "value"> & { value?: string }) {
        this.type = data.type;
        this.acuity = objectHasKey(SENSES_WITH_MANDATORY_ACUITIES, this.type)
            ? SENSES_WITH_MANDATORY_ACUITIES[this.type]
            : data.acuity ?? "precise";
        this.value = data.value ?? "";
        this.source = data.source || undefined;
    }

    /** The localized label of the sense */
    get label(): string | null {
        const buildLabel = (type: string, acuity?: SenseAcuity, range?: number): string => {
            const senses: Record<string, string | undefined> = CONFIG.PF2E.senses;
            const sense = game.i18n.localize(senses[type] ?? "") || type;
            const acuityLabel = acuity ? game.i18n.localize(CONFIG.PF2E.senseAcuity[acuity]) : null;
            return acuity && range
                ? game.i18n.format("PF2E.Actor.Creature.Sense.WithAcuityAndRange", {
                      sense,
                      acuity: acuityLabel,
                      range,
                  })
                : acuity
                ? game.i18n.format("PF2E.Actor.Creature.Sense.WithAcuity", { sense, acuity: acuityLabel })
                : sense;
        };

        const range = this.range < Infinity ? this.range : undefined;
        switch (this.type) {
            case "darkvision":
            case "greaterDarkvision":
            case "lowLightVision":
            case "seeInvisibility":
                // Low-light vision, darkvision, and see invisibility are always precise with no range limit
                return buildLabel(this.type);
            case "scent":
                // Vague scent is assumed and ommitted
                return this.acuity === "vague" ? null : buildLabel(this.type, this.acuity, range);
            default:
                return buildLabel(this.type, this.acuity, range);
        }
    }

    isMoreAcuteThan(sense: { acuity: SenseAcuity }): boolean {
        return (
            (this.acuity === "precise" && ["imprecise", "vague"].includes(sense.acuity ?? "precise")) ||
            (this.acuity === "imprecise" && sense.acuity === "vague")
        );
    }

    hasLongerRangeThan(sense: { value: string }): boolean {
        return this.range > Number(sense.value);
    }
}

export type SenseAcuity = (typeof SENSE_ACUITIES)[number];
export type SenseType = SetElement<typeof SENSE_TYPES>;

export const SENSE_ACUITIES = ["precise", "imprecise", "vague"] as const;

export const SENSE_TYPES = new Set([
    "darkvision",
    "echolocation",
    "greaterDarkvision",
    "heatsight",
    "lifesense",
    "lowLightVision",
    "motionsense",
    "scent",
    "seeInvisibility",
    "spiritsense",
    "thoughtsense",
    "tremorsense",
    "wavesense",
] as const);
