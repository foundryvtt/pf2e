import { ItemSourcePF2e } from "@item/data/index.ts";
import { SpellSystemData } from "@item/spell/data.ts";
import { DamageType } from "@system/damage/index.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

function createBasicDamage(value: string, applyMod: boolean, damageType: DamageType) {
    return {
        0: {
            applyMod,
            type: { categories: [], value: damageType },
            value,
        },
    };
}

function createBasicScaling(interval: number, scaling: string) {
    return { interval, damage: { 0: scaling } };
}

/** Damage can now be split into multiple rows for spells */
export class Migration663FixSpellDamage extends MigrationBase {
    static override version = 0.663;

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (itemData.type !== "spell") return;
        if (Object.keys(itemData.system.damage?.value ?? {}).length > 0) return;

        const itemName = itemData.system.slug ?? sluggify(itemData.name);
        const systemData: SpellScalingOld = itemData.system;

        switch (itemName) {
            case "animated-assault":
                systemData.damage.value = createBasicDamage("2d10", false, "bludgeoning");
                systemData.scaling = createBasicScaling(2, "2d10");
                break;
            case "daze":
                systemData.damage.value = createBasicDamage("0", true, "mental");
                systemData.scaling = createBasicScaling(2, "1d6");
                break;
            case "personal-blizzard":
                systemData.damage.value = {
                    0: {
                        applyMod: false,
                        type: { value: "cold", categories: [] },
                        value: "1d6",
                    },
                    1: {
                        applyMod: false,
                        type: { value: "cold", subtype: "persistent", categories: [] },
                        value: "1d6",
                    },
                };
                systemData.scaling = {
                    interval: 1,
                    damage: { 0: "1", 1: "1" },
                };
                break;
            case "power-word-kill":
                systemData.damage.value = createBasicDamage("50", false, "untyped");
                break;
        }
    }
}

interface SpellScalingOld extends SpellSystemData {
    scaling?: {
        interval: number;
        damage: Record<string, string>;
    };
}
