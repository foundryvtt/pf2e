import type { MacroSource } from "types/foundry/common/documents/macro.d.ts";
import { MigrationBase } from "../base.ts";

/** Migrate rollActionMacro function parameters to an object */
export class Migration871MigrateRollActionMacroParams extends MigrationBase {
    static override version = 0.871;

    override async updateMacro(source: MacroSource): Promise<void> {
        if (source.type !== "script") return;

        const matches = source.command.matchAll(/game\.pf2e\.rollActionMacro\("(.+)".*"(.+)"\)/gm);
        for (const match of matches) {
            if (match.length < 3) continue;
            const [current, itemId, slug] = match;
            source.command = source.command.replace(
                current,
                `game.pf2e.rollActionMacro({ itemId: "${itemId}", slug: "${slug}" })`,
            );
        }
    }
}
