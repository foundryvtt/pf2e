import { ActorSourcePF2e } from "@actor/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Ensure `crafting` property in character system data has the correct structure */
export class Migration722CraftingSystemData extends MigrationBase {
    static override version = 0.722;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        if (!isObject(source.system.crafting)) {
            source.system.crafting = { entries: {}, formulas: [] };
        }

        const { crafting } = source.system;
        if (!isObject(crafting.entries) || Array.isArray(crafting.entries)) {
            crafting.entries = {};
        }

        if (!Array.isArray(crafting.formulas)) {
            crafting.formulas = [];
        }
    }
}
