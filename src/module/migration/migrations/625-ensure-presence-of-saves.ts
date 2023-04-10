import { ActorSourcePF2e } from "@actor/data/index.ts";
import { MigrationBase } from "../base.ts";

interface BaseSaveData {
    value: number;
    saveDetail: string;
}

interface BaseNPCSaves {
    fortitude: BaseSaveData;
    reflex: BaseSaveData;
    will: BaseSaveData;
}

/** Ensure presence of all three save types on NPCs */
export class Migration625EnsurePresenceOfSaves extends MigrationBase {
    static override version = 0.625;

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        if (actorData.type !== "npc") return;

        const saves: BaseNPCSaves = actorData.system.saves;
        for (const key of ["fortitude", "reflex", "will"] as const) {
            saves[key] ??= {
                value: 0,
                saveDetail: "",
            };
            if (typeof saves[key].value !== "number") {
                saves[key].value = Number(saves[key].value) || 0;
            }
            if (typeof saves[key].saveDetail !== "string") {
                saves[key].saveDetail = "";
            }
        }
    }
}
