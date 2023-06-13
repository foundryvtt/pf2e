import { MigrationBase } from "../base.ts";

/** Work around upstream issue (as of 11.301) in which settings are no longer checked or coerced for type validity  */
export class Migration842NumifyNumericSettings extends MigrationBase {
    static override version = 0.842;

    override async migrate(): Promise<void> {
        for (const setting of ["staminaVariant", "worldClock.timeConvention"] as const) {
            const value = game.settings.get("pf2e", setting);
            if (typeof value !== "number") {
                await game.settings.set("pf2e", setting, Number(value));
            }
        }
    }
}
