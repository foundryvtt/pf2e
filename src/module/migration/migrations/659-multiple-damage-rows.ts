import { ItemSourcePF2e } from "@item/data/index.ts";
import { SpellDamage, SpellSystemData } from "@item/spell/data.ts";
import { DamageType } from "@system/damage/index.ts";
import { tupleHasValue } from "@util";
import { MigrationBase } from "../base.ts";

const formulaHasValue = (value?: string | null): value is string => {
    return !!value && value !== "0";
};

const modes = ["level1", "level2", "level3", "level4"] as const;

/** Damage can now be split into multiple rows for spells */
export class Migration659MultipleDamageRows extends MigrationBase {
    static override version = 0.659;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type !== "spell") return;

        const data: SpellSystemDataOld = itemData.system;

        // Migrate scaling (standalone)
        if (data.scaling instanceof Object) {
            if (typeof data.scaling.mode === "string" && tupleHasValue(modes, data.scaling.mode)) {
                data.scaling.interval = modes.indexOf(data.scaling.mode) + 1;
            }

            if (
                typeof data.scaling.formula === "string" &&
                formulaHasValue(data.scaling.formula) &&
                !data.scaling.damage
            ) {
                data.scaling.damage = { 0: data.scaling.formula };
            }

            if (!data.scaling.interval || !data.scaling.damage) {
                if ("game" in globalThis) {
                    data["-=scaling"] = null;
                } else {
                    delete data.scaling;
                }
            } else {
                if ("game" in globalThis) {
                    data.scaling["-=mode"] = null;
                    data.scaling["-=formula"] = null;
                } else {
                    delete data.scaling.mode;
                    delete data.scaling.formula;
                }
            }
        }

        // Migrate damage and damage type
        if (typeof data.damage.value === "string") {
            if (formulaHasValue(data.damage.value) || data.damage.applyMod) {
                const value = data.damage.value;
                data.damage.value = {
                    0: {
                        value,
                        applyMod: data.damage.applyMod || undefined,
                        type: { value: data.damageType?.value || "untyped", categories: [] },
                    },
                };
            } else {
                data.damage.value = {};
            }

            if ("game" in globalThis) {
                data.damage["-=applyMod"] = null;
            } else {
                delete data.damage.applyMod;
            }
        }

        if ("damageType" in data) {
            "game" in globalThis ? (data["-=damageType"] = null) : (data.damageType = undefined);
        }
    }
}

interface SpellSystemDataOld extends Omit<SpellSystemData, "damage" | "scaling"> {
    damage: {
        value: string | Record<number, SpellDamage>;
        applyMod?: boolean;
        "-=applyMod"?: null;
    };
    damageType?: {
        value?: DamageType;
    };
    "-=damageType"?: null;
    scaling?: {
        mode?: string;
        formula?: string;
        interval?: number;
        damage?: Record<number, string>;
        "-=mode"?: null;
        "-=formula"?: null;
    };
    "-=scaling"?: null;
}
