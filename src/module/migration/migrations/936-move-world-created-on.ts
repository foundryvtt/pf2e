import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Move stored World Clock setting to new location */
export class Migration936MoveWorldClockSettings extends MigrationBase {
    static override version = 0.936;

    override async migrate(): Promise<void> {
        const worldSettings = game.settings.storage.get("world");
        const worldCreatedOn = worldSettings.find((s) => s.key === "pf2e.worldClock.worldCreatedOn")?.value;
        const dateTheme = worldSettings.find((s) => s.key === "pf2e.worldClock.dateTheme")?.value;
        const playersCanView = worldSettings.find((s) => s.key === "pf2e.worldClock.playersCanView")?.value;
        const showClockButton = worldSettings.find((s) => s.key === "pf2e.worldClock.showClockButton")?.value;
        const syncDarkness = worldSettings.find((s) => s.key === "pf2e.worldClock.syncDarkness")?.value;
        const timeConvention = worldSettings.find((s) => s.key === "pf2e.worldClock.timeConvention")?.value;
        const setting = game.settings.get(SYSTEM_ID, "worldClock");

        if (worldCreatedOn && R.isPlainObject(setting)) {
            await game.settings.set(SYSTEM_ID, "worldClock", {
                ...setting,
                worldCreatedOn: worldCreatedOn,
                dateTheme: dateTheme ?? setting.dateTheme,
                playersCanView: playersCanView ?? setting.playersCanView,
                showClockButton: showClockButton ?? setting.showClockButton,
                syncDarkness: syncDarkness ?? setting.syncDarkness,
                timeConvention: timeConvention ?? setting.timeConvention,
            });
        }
    }
}
