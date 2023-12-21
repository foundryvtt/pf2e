import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellSource, SpellSystemSource } from "@item/spell/data.ts";
import { DamageType } from "@system/damage/types.ts";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Fix traits on spell variants */
export class Migration895FixVariantSpellTraits extends MigrationBase {
    static override version = 0.895;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "spell") return;

        switch (source.system.slug) {
            case "harm":
            case "heal":
                this.#fixHarmHeal(source);
                break;
            case "elemental-annihilation-wave":
            case "horizon-thunder-sphere":
                this.#removeOverlayTraits(source);
                break;
            default:
                this.#fixOtherVariants(source);
        }
    }

    #fixHarmHeal(source: SpellSource): void {
        const damage = source.system.damage["0"];
        if (R.isObject(damage)) {
            damage.kinds = ["damage", "healing"];
        }
        if (source.system.slug === "heal") {
            source.system.traits.value = ["healing", "manipulate", "vitality"];
        } else {
            source.system.traits.value = ["manipulate", "void"];
        }

        const variants = R.isObject(source.system.overlays)
            ? Object.values(source.system.overlays).filter(
                  (o) => R.isObject(o) && R.isObject(o.system?.traits) && Array.isArray(o.system?.traits.value),
              )
            : [];

        for (const variant of variants) {
            if (!variant.system?.traits) continue;
            const system: DeepPartial<SpellSystemSource> & { "-=traits"?: null } = variant.system;
            if (system.time?.value === "1") {
                system["-=traits"] = null;
            } else {
                system.traits =
                    source.system.slug === "heal"
                        ? { value: ["concentrate", "healing", "manipulate", "vitality"] }
                        : { value: ["concentrate", "manipulate", "void"] };
                if (system.damage?.["0"]?.formula?.includes("+")) {
                    system.damage["0"].kinds = ["healing"];
                    system.defense = null;
                } else if (system.time?.value === "2" && !system.damage?.["0"]) {
                    system.damage = { "0": { kinds: ["damage"] } };
                }
            }
        }
    }

    #removeOverlayTraits(source: SpellSource): void {
        source.system.traits.value = R.uniq([
            ...source.system.traits.value,
            "concentrate",
            "manipulate",
        ] as const).sort();
        for (const overlay of Object.values(source.system.overlays ?? {})) {
            const overlaySystem: { traits?: object; "-=traits"?: null } = overlay.system ?? {};
            overlaySystem["-=traits"] = null;
        }
    }

    #fixOtherVariants(source: SpellSource): void {
        for (const partial of Object.values(source.system.damage).filter((p) => R.isObject(p))) {
            if (typeof partial.type === "string") {
                partial.type = partial.type === ("healing" as DamageType) ? "untyped" : partial.type;
                partial.type ||= "untyped";
            }
        }

        for (const overlay of Object.values(source.system.overlays ?? {})) {
            const overlaySystem: { traits?: { value?: (string | undefined)[] }; "-=traits"?: null } =
                overlay.system ?? {};
            if (overlaySystem.traits?.value && Array.isArray(overlaySystem.traits.value)) {
                if (!R.compact(overlaySystem.traits.value).every((t) => ["concentrate", "manipulate"].includes(t))) {
                    continue;
                }
                overlaySystem.traits.value = R.uniq(
                    [...overlaySystem.traits.value, ...source.system.traits.value].sort(),
                );
                if (R.equals(overlaySystem.traits.value, R.uniq(source.system.traits.value.sort()))) {
                    overlaySystem["-=traits"] = null;
                }
            }
        }
    }
}
