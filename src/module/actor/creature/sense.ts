import { objectHasKey } from "@util";
import { SenseAcuity, SenseData } from "./data";

export class CreatureSensePF2e implements SenseData {
    /** low-light vision, darkvision, scent, etc. */
    type: string;
    /** One of "precise", "imprecise", or "vague" */
    acuity: SenseAcuity;
    /** The range of the sense, if any */
    value: string;
    /** The localized label of the sense */
    label: string;
    /** The localized label of the acuity */
    labelAcuity: string;
    /** The source of the sense, if any */
    source?: string;

    static sortSenses(senses: CreatureSensePF2e[]) {
        return senses.sort((a: CreatureSensePF2e, b: CreatureSensePF2e) =>
            a.label && b.labelAcuity && a.label > b.label ? 1 : -1
        );
    }

    get range(): number {
        return Number(this.value) || Infinity;
    }

    constructor(data: Omit<SenseData, "value"> & { value?: string }) {
        this.type = data.type;
        this.acuity = data.acuity ?? "precise";
        this.value = data.value ?? "";
        this.source = data.source || undefined;

        if (this.type === "custom") {
            this.label = data.label;
        } else {
            this.label = game.i18n.localize(
                objectHasKey(CONFIG.PF2E.senses, this.type) ? CONFIG.PF2E.senses[this.type] : this.type
            );
        }

        this.labelAcuity = game.i18n.localize(
            objectHasKey(CONFIG.PF2E.senseAcuity, this.acuity) ? CONFIG.PF2E.senseAcuity[this.acuity] : this.acuity
        );
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
