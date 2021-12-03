export class CreatureSensePF2e implements SenseData {
    /** low-light vision, darkvision, scent, etc. */
    type: SenseType;
    /** One of "precise", "imprecise", or "vague" */
    acuity: SenseAcuity;
    /** Is acuity visible? */
    showAcuity: boolean;
    /** The range of the sense, if any */
    value: string;
    /** The source of the sense, if any */
    source?: string;
    /** Is this a temporary ability? */
    temporary: boolean;

    get range(): number {
        return Number(this.value) || Infinity;
    }

    constructor(data: Omit<SenseData, "type"> & { type: SenseType }) {
        this.type = data.type;
        this.acuity = data.acuity ?? "precise";
        this.showAcuity = data.showAcuity ?? true;
        this.value = data.value ?? "";
        this.source = data.source || undefined;
        this.temporary = data.temporary ?? false;
    }

    /** The localized label of the sense */
    get label(): string | null {
        const buildLabel = (type: string, acuity?: SenseAcuity, range?: number): string => {
            const senses: Record<string, string | undefined> = CONFIG.PF2E.senses;
            const sense = game.i18n.localize(senses[type] ?? "") || type;
            const acuityLabel = acuity ? game.i18n.localize(CONFIG.PF2E.senseAcuity[acuity]) : null;
            return acuity && range
                ? game.i18n.format("PF2E.Sense.WithAcuityAndRange", { sense, acuity: acuityLabel, range })
                : acuity
                ? game.i18n.format("PF2E.Sense.WithAcuity", { sense, acuity: acuityLabel })
                : sense;
        };

        const range = this.range < Infinity ? this.range : undefined;
        switch (this.type) {
            case "lowLightVision":
            case "darkvision":
            case "greaterDarkvision":
                // Low-light vision and darkvision are always acute with no range limit
                return buildLabel(this.type);
            case "scent":
                // Vague scent is assume and ommitted
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

interface SenseData {
    type?: SenseType;
    acuity: SenseAcuity;
    showAcuity?: boolean;
    value?: string;
    source?: string;
    temporary?: boolean;
}

export type SenseAcuity = typeof SENSE_ACUITIES[number];
export type BasicSenseType = typeof BASIC_SENSE_TYPES[number];
export type SenseType = typeof SENSE_TYPES[number];

export const SENSE_ACUITIES = ["precise", "imprecise", "vague"];

export const BASIC_SENSE_TYPES = [
    "darkvision",
    "echolocation",
    "greaterDarkvision",
    "lifesense",
    "lowLightVision",
    "motionsense",
    "scent",
    "tremorsense",
    "wavesense",
] as const;

export const SENSE_TYPES = [...BASIC_SENSE_TYPES] as const;
