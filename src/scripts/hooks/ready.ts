import { activateSocketListener } from "@scripts/socket";
import { PlayerConfigPF2e } from "@module/user/player-config";
import { prepareMinions } from "@scripts/actor/prepare-minions";
import { MigrationRunner } from "@module/migration/runner";
import { MigrationList } from "@module/migration";
import { storeInitialWorldVersions } from "@scripts/store-versions";
import { extendDragData } from "@scripts/system/dragstart-handler";
import { MigrationSummary } from "@module/apps/migration-summary";
import { SetGamePF2e } from "@scripts/set-game-pf2e";

export const Ready = {
    listen: (): void => {
        Hooks.once("ready", () => {
            /** Once the entire VTT framework is initialized, check to see if we should perform a data migration */
            console.log("PF2e System | Readying Pathfinder 2nd Edition System");
            console.debug(`PF2e System | Build mode: ${BUILD_MODE}`);

            // Determine whether a system migration is required and feasible
            const currentVersion = game.settings.get("pf2e", "worldSchemaVersion");

            // Save the current world schema version if hasn't before.
            storeInitialWorldVersions().then(async () => {
                // User#isGM is inclusive of both gamemasters and assistant gamemasters, so check for the specific role
                if (!game.user.hasRole(CONST.USER_ROLES.GAMEMASTER)) return;

                // Perform migrations, if any
                const migrationRunner = new MigrationRunner(MigrationList.constructFromVersion(currentVersion));
                if (migrationRunner.needsMigration()) {
                    if (currentVersion && currentVersion < MigrationRunner.MINIMUM_SAFE_VERSION) {
                        ui.notifications.error(
                            `Your PF2E system data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`,
                            { permanent: true }
                        );
                    }
                    await migrationRunner.runMigration();
                    new MigrationSummary().render(true);
                }

                // Update the world system version
                const previous = game.settings.get("pf2e", "worldSystemVersion");
                const current = game.system.data.version;
                if (!foundry.utils.isNewerVersion(current, previous)) return;

                await game.settings.set("pf2e", "worldSystemVersion", current);

                // Nag the GM for running sub-V9 modules
                const subV9Modules = Array.from(game.modules.values()).filter(
                    (m) =>
                        m.active &&
                        // Foundry does not enforce the presence of `ModuleData#compatibleCoreVersion`, but modules
                        // without it will also not be listed in the package manager. Skip warning those without it in
                        // case they were made for private use.
                        m.data.compatibleCoreVersion &&
                        !foundry.utils.isNewerVersion(m.data.compatibleCoreVersion, "0.8.9")
                );

                for (const badModule of subV9Modules) {
                    ui.notifications.warn(
                        game.i18n.format("PF2E.ErrorMessage.SubV9Module", { module: badModule.data.title })
                    );
                }
            });

            PlayerConfigPF2e.activateColorScheme();

            // update minion-type actors to trigger another prepare data cycle with the master actor already prepared and ready
            prepareMinions();
            activateSocketListener();

            // Extend drag data for things such as condition value
            extendDragData();

            // Some of game.pf2e must wait until the ready phase
            SetGamePF2e.onReady();

            // Final pass to ensure effects on actors properly consider the initiative of any active combat
            game.pf2e.effectTracker.refresh();

            // Sort item types for display in sidebar create-item dialog
            game.system.documentTypes.Item.sort((typeA, typeB) => {
                return game.i18n
                    .localize(CONFIG.Item.typeLabels[typeA] ?? "")
                    .localeCompare(game.i18n.localize(CONFIG.Item.typeLabels[typeB] ?? ""));
            });

            // Announce the system is ready in case any module needs access to an application not available until now
            Hooks.callAll("pf2e.systemReady");
        });
    },
};
