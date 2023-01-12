import { resetAndRerenderActors } from "@actor/helpers";
import { MigrationSummary } from "@module/apps/migration-summary";
import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster";
import { SetAsInitiative } from "@module/chat-message/listeners/set-as-initiative";
import { MigrationList } from "@module/migration";
import { MigrationRunner } from "@module/migration/runner";
import { SetGamePF2e } from "@scripts/set-game-pf2e";
import { activateSocketListener } from "@scripts/socket";
import { storeInitialWorldVersions } from "@scripts/store-versions";
import { extendDragData } from "@scripts/system/dragstart-handler";

export const Ready = {
    listen: (): void => {
        Hooks.once("ready", () => {
            /** Once the entire VTT framework is initialized, check to see if we should perform a data migration */
            console.log("PF2e System | Starting Pathfinder 2nd Edition System");
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
                const current = game.system.version;
                if (foundry.utils.isNewerVersion(current, previous)) {
                    await game.settings.set("pf2e", "worldSystemVersion", current);
                }

                // These modules claim compatibility with all of V9 but are abandoned
                const abandonedModules = new Set(["foundry_community_macros", "pf2e-lootgen", "pf2e-toolbox"]);

                // Nag the GM for running unmaintained modules
                const subV9Modules = Array.from(game.modules.values()).filter(
                    (m) =>
                        m.active &&
                        (m.esmodules.size > 0 || m.scripts.size > 0) &&
                        // Foundry does not enforce the presence of `Module#compatibility.verified`, but modules
                        // without it will also not be listed in the package manager. Skip warning those without it in
                        // case they were made for private use.
                        !!m.compatibility.verified &&
                        (abandonedModules.has(m.id) || !foundry.utils.isNewerVersion(m.compatibility.verified, "0.8.9"))
                );

                for (const badModule of subV9Modules) {
                    const message = game.i18n.format("PF2E.ErrorMessage.SubV9Module", { module: badModule.title });
                    ui.notifications.warn(message);
                    console.warn(message);
                }
            });

            // Update chat messages to add set-as-initiative buttons to skill checks
            for (const li of document.querySelectorAll<HTMLLIElement>("#chat-log > li")) {
                SetAsInitiative.listen($(li));
            }

            activateSocketListener();

            // Extend drag data for things such as condition value
            extendDragData();

            // Some of game.pf2e must wait until the ready phase
            SetGamePF2e.onReady();

            // Set darkness color according to GM Vision setting
            if (
                canvas.ready &&
                game.user.isGM &&
                !game.modules.get("perfect-vision")?.active &&
                game.settings.get("pf2e", "gmVision")
            ) {
                CONFIG.Canvas.darknessColor = CONFIG.PF2E.Canvas.darkness.gmVision;
                canvas.colorManager.initialize();
            }

            // In case there's no canvas, run Condition Manager initialization from this hook as well
            game.pf2e.ConditionManager.initialize();

            // Add Scene Darkness Adjuster to `Scenes` apps list so that it will re-render on scene update
            game.scenes.apps.push(SceneDarknessAdjuster.instance);

            // Sort item types for display in sidebar create-item dialog
            game.system.documentTypes.Item.sort((typeA, typeB) => {
                return game.i18n
                    .localize(CONFIG.Item.typeLabels[typeA] ?? "")
                    .localeCompare(game.i18n.localize(CONFIG.Item.typeLabels[typeB] ?? ""));
            });

            game.pf2e.system.moduleArt.refresh();

            // Now that all game data is available, reprepare actor data among those actors currently in an encounter
            const participants = game.combats.contents.flatMap((e) => e.combatants.contents);
            const fightyActors = new Set(participants.flatMap((c) => c.actor ?? []));
            resetAndRerenderActors(fightyActors);

            // Prepare familiars now that all actors are initialized
            for (const familiar of game.actors.filter((a) => a.type === "familiar")) {
                familiar.reset();
            }

            // Announce the system is ready in case any module needs access to an application not available until now
            Hooks.callAll("pf2e.systemReady");
        });
    },
};
