import type { MacroSource } from "types/foundry/common/documents/macro.d.ts";
import { MigrationBase } from "../base.ts";

/** Migrate "Take a Breather" macro to use function exposed at `game.pf2e.actions` */
export class Migration878TakeABreather extends MigrationBase {
    static override version = 0.878;

    override async updateMacro(source: MacroSource): Promise<void> {
        if (source.type === "script" && source.command.includes("console.log(resolve, sp)")) {
            source.command = "game.pf2e.actions.takeABreather();";
        }
    }
}
