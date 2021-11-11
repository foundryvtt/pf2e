import { SenseType } from "@actor/character/data";
import { SenseAcuity, SenseData } from "./data";

export class CreatureSensePF2e implements SenseData {
    /** low-light vision, darkvision, scent, etc. */
    type: SenseType;
    /** One of "precise", "imprecise", or "vague" */
    acuity: SenseAcuity;
    /** The range of the sense, if any */
    value: string;
    /** The localized label of the sense */
    label?: string;
    /** The source of the sense, if any */
    source?: string;

    get range(): number {
        return Number(this.value) || Infinity;
    }

    constructor(data: Omit<SenseData, "value"> & { value?: string }) {
        this.type = data.type;
        this.acuity = data.acuity ?? "precise";
        this.value = data.value ?? "";
        this.source = data.source || undefined;
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
