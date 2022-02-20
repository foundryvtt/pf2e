import { activateSocketListener } from "@scripts/socket";
import { PlayerConfigPF2e } from "@module/user/player-config";
import { prepareMinions } from "@scripts/actor/prepare-minions";
import { MigrationRunner } from "@module/migration/runner";
import { MigrationList } from "@module/migration";
import { ActionsPF2e } from "@system/actions/actions";
import { setWorldSchemaVersion } from "@module/migration/set-world-schema-version";
import { WorldClock } from "@module/apps/world-clock";
import { CompendiumBrowser } from "@module/apps/compendium-browser";
import { extendDragData } from "@scripts/system/dragstart-handler";
import { LicenseViewer } from "@module/apps/license-viewer";
import { MigrationSummary } from "@module/apps/migration-summary";

export const Ready = {
    listen: (): void => {
        Hooks.once("ready", () => {
            /** Once the entire VTT framework is initialized, check to see if we should perform a data migration */
            console.log("PF2e System | Readying Pathfinder 2nd Edition System");
            console.debug(`PF2e System | Build mode: ${BUILD_MODE}`);

            // Start up the Compendium Browser
            game.pf2e.compendiumBrowser = new CompendiumBrowser();

            // Start up the License viewer
            game.pf2e.licenseViewer = new LicenseViewer();

            // Determine whether a system migration is required and feasible
            const currentVersion = game.settings.get("pf2e", "worldSchemaVersion");

            // Save the current world schema version if hasn't before.
            setWorldSchemaVersion().then(async () => {
                // User#isGM is inclusive of both gamemasters and assistant gamemasters, so check for the specific role
                if (game.user.hasRole(CONST.USER_ROLES.GAMEMASTER)) {
                    // Perform the migration
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
                }
            });

            ActionsPF2e.exposeActions(game.pf2e.actions);

            PlayerConfigPF2e.activateColorScheme();

            // update minion-type actors to trigger another prepare data cycle with the master actor already prepared and ready
            prepareMinions();
            activateSocketListener();

            // Extend drag data for things such as condition value
            extendDragData();

            // Final pass to ensure effects on actors properly consider the initiative of any active combat
            game.pf2e.effectTracker.refresh();

            // Start system sub-applications
            game.pf2e.worldClock = new WorldClock();

            // Sort item types for display in sidebar create-item dialog
            game.system.documentTypes.Item.sort((typeA, typeB) => {
                return game.i18n
                    .localize(CONFIG.Item.typeLabels[typeA] ?? "")
                    .localeCompare(game.i18n.localize(CONFIG.Item.typeLabels[typeB] ?? ""));
            });

            // Warn GMs for each active module without V9 compatibility
            if (game.user.isGM) {
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
            }

            // Announce the system is ready in case any module needs access to an application not available until now
            Hooks.callAll("pf2e.systemReady");
        });
    },
};
