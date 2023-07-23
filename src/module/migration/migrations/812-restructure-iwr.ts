import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ActorTraitsSource } from "@actor/data/base.ts";
import { ImmunitySource, ResistanceSource, WeaknessSource } from "@actor/data/iwr.ts";
import { ImmunityType, ResistanceType, WeaknessType } from "@actor/types.ts";
import { IMMUNITY_TYPES, RESISTANCE_TYPES, WEAKNESS_TYPES } from "@actor/values.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { isObject, pick, setHasElement, sluggify } from "@util";
import { MigrationBase } from "../base.ts";

/** Move IWR data to `actor.system.attributes` */
export class Migration812RestructureIWR extends MigrationBase {
    static override version = 0.812;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const traits: MaybeWithOldIWRData | undefined = source.system.traits;
        if (!traits || source.type === "familiar") return;
        const { attributes } = source.system;

        if ("ci" in traits) {
            if (!("game" in globalThis)) delete traits.ci;
            traits["-=ci"] = null;
        }

        if ("di" in traits) {
            const oldData = traits.di;
            if (!("game" in globalThis)) delete traits.di;
            traits["-=di"] = null;

            if (isObject(oldData) && "value" in oldData && Array.isArray(oldData.value) && oldData.value.length > 0) {
                const immunities = oldData.value
                    .map((i: unknown) => this.#normalizeType(String(i)))
                    .filter((i): i is ImmunityType => setHasElement(IMMUNITY_TYPES, i))
                    .map((i): ImmunitySource => ({ type: i }));

                if (immunities.length > 0) attributes.immunities = immunities;
            }
        }

        if ("dv" in traits) {
            const oldData = traits.dv;
            if (!("game" in globalThis)) delete traits.dv;
            traits["-=dv"] = null;

            if (Array.isArray(oldData) && oldData.length > 0) {
                const weaknesses = this.#getWR(oldData, WEAKNESS_TYPES).map((data): WeaknessSource => {
                    const weakness: WeaknessSource = pick(data, ["type", "value"]);

                    // If parsable exceptions are found, add those as well
                    const parsed = this.#parseExceptions(String(data.exceptions ?? ""));

                    const exceptions = parsed.exceptions.filter((e): e is WeaknessType =>
                        setHasElement(WEAKNESS_TYPES, e)
                    );
                    if (exceptions.length > 0) weakness.exceptions = exceptions;

                    return weakness;
                });

                if (weaknesses.length > 0) attributes.weaknesses = weaknesses;
            }
        }

        if ("dr" in traits) {
            const oldData = traits.dr;
            if (!("game" in globalThis)) delete traits.dr;
            traits["-=dr"] = null;

            if (Array.isArray(oldData) && oldData.length > 0) {
                const resistances = this.#getWR(oldData, RESISTANCE_TYPES).map((data): ResistanceSource => {
                    const resistance: ResistanceSource = pick(data, ["type", "value"]);

                    // If parsable exceptions and resistance-doubling are found, add those as well
                    const parsed = this.#parseExceptions(String(data.exceptions ?? ""));

                    const exceptions = parsed.exceptions.filter((e): e is ResistanceType =>
                        setHasElement(RESISTANCE_TYPES, e)
                    );
                    if (exceptions.length > 0) resistance.exceptions = exceptions;

                    const doubleVs = parsed.doubleVs.filter((e): e is ResistanceType =>
                        setHasElement(RESISTANCE_TYPES, e)
                    );
                    if (doubleVs.length > 0) resistance.doubleVs = doubleVs;

                    return resistance;
                });

                if (resistances.length > 0) attributes.resistances = resistances;
            }
        }
    }

    /** Sluggify precious material types, normalize precious material grades */
    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "weapon") {
            const material: { value: string | null } = source.system.preciousMaterial;
            material.value = material.value ? sluggify(material.value) : null;
            source.system.preciousMaterialGrade.value ||= null;
        }

        // Rule elements with old cold-iron data
        const iwrREs = source.system.rules.filter(
            (r): r is { key: string; type: string; except?: unknown; exceptions?: unknown } =>
                typeof r.key === "string" &&
                ["Immunity", "Weakness", "Resistance"].includes(r.key) &&
                "type" in r &&
                typeof r.type === "string"
        );
        for (const rule of iwrREs) {
            rule.type = rule.type.startsWith("{") ? rule.type : this.#normalizeType(rule.type);
            if (typeof rule.except === "string") {
                const parsed = this.#parseExceptions(rule.except);
                const exceptions = parsed.exceptions.filter((exception) => {
                    if (rule.key === "Immunity") {
                        return setHasElement(IMMUNITY_TYPES, exception);
                    } else if (rule.key === "Weakness") {
                        return setHasElement(WEAKNESS_TYPES, exception);
                    }
                    return setHasElement(RESISTANCE_TYPES, exception);
                });
                if (exceptions.length > 0) rule.exceptions = exceptions;
                delete rule.except;
            }
        }

        const adjustStrikeREs = source.system.rules.filter(
            (r): r is { key: string; property: string; value: string } =>
                r.key === "AdjustStrike" && typeof r.value === "string"
        );
        for (const rule of adjustStrikeREs) {
            rule.value =
                rule.value.startsWith("{") || ["property-runes", "weapon-traits"].includes(rule.property)
                    ? rule.value
                    : this.#normalizeType(rule.value);
        }
    }

    /** Get objects that may or may not be a weakness or resistance */
    #getWR<TType extends string>(
        maybeWR: unknown[],
        typeSet: Set<TType>
    ): { type: TType; value: number; exceptions?: unknown }[] {
        return maybeWR
            .filter(
                (r: unknown): r is { type: string; value: number; exceptions?: string } =>
                    isObject<{ type: unknown; value: unknown }>(r) &&
                    typeof r.type === "string" &&
                    typeof r.value === "number"
            )
            .map((wr) => {
                wr.type = this.#normalizeType(wr.type);
                wr.value = Math.abs(wr.value);
                return wr;
            })
            .filter((r): r is { type: TType; value: number } => setHasElement(typeSet, r.type));
    }

    #oldENmappings: Record<string, string | undefined> = {
        "PF2E.ResistanceException.Bludgeoning": "except bludgeoning",
        "PF2E.ResistanceException.ForceGhostTouchDoubleNonMagical":
            "except force, or ghost touch; double resistance vs. non-magical",
        "PF2E.ResistanceException.ForceGhostTouchNegativeDoubleNonMagical":
            "except force, ghost touch, or negative; double resistance vs. non-magical",
        "PF2E.ResistanceException.ForceGhostTouchPositiveDoubleNonMagical":
            "except force, ghost touch, or positive; double resistance vs. non-magical",
    };

    /** Attempt to parse free-form exceptions text into an array of IWR exception types */
    #parseExceptions(text: string): { exceptions: string[]; doubleVs: string[] } {
        const normalized = (this.#oldENmappings[text] ?? text)
            .toLowerCase()
            .replace("PF2E.TraitForce", "force")
            .replace("PF2E.TraitPositive", "positive")
            .replace("cold iron", "cold-iron")
            .replace("critical hits", "critical-hits")
            .replace("ghost touch", "ghost-touch")
            .replace("nonmagical", "non-magical")
            .replace("weapons shedding bright light", "weapons-shedding-bright-light")
            .replace("unarmed", "unarmed-attacks")
            .replace(/\bexcept\b/, "")
            .trim()
            .replace(/\s+/, " ");

        if (!normalized) return { exceptions: [], doubleVs: [] };

        const doubleIndex = normalized.indexOf("double");
        const exceptions = (doubleIndex === -1 ? normalized : normalized.slice(0, doubleIndex))
            .split(/[,\s]+/)
            .map((d) => sluggify(d));
        const doubleVs = normalized
            .slice(doubleIndex)
            .split(/[,\s]+/)
            .map((d) => sluggify(d));

        return { exceptions, doubleVs };
    }

    #normalizeType(text: string): string {
        text = text.trim();
        switch (text) {
            case "all":
            case "All":
                return "all-damage";
            case "arrow":
                return "arrow-vulnerability";
            case "axe":
                return "axe-vulnerability";
            case "coldiron":
                return "cold-iron";
            case "nonlethal":
                return "nonlethal-attacks";
            case "nonmagical-attacks":
                return "non-magical";
            case "protean anatomy":
                return "protean-anatomy";
            case "unarmed":
                return "unarmed-attacks";
            default:
                return sluggify(text);
        }
    }
}

interface MaybeWithOldIWRData extends ActorTraitsSource<string> {
    ci?: unknown;
    di?: unknown;
    dv?: unknown;
    dr?: unknown;
    "-=ci"?: null;
    "-=di"?: null;
    "-=dv"?: null;
    "-=dr"?: null;
}
