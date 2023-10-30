import { PartyPF2e } from "@actor";
import { resetActors } from "@actor/helpers.ts";
import { createFirstParty } from "@actor/party/helpers.ts";
import { MigrationSummary } from "@module/apps/migration-summary.ts";
import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster.ts";
import { SetAsInitiative } from "@module/chat-message/listeners/set-as-initiative.ts";
import { MigrationList } from "@module/migration/index.ts";
import { MigrationRunner } from "@module/migration/runner/index.ts";
import { SetGamePF2e } from "@scripts/set-game-pf2e.ts";
import { activateSocketListener } from "@scripts/socket.ts";
import { storeInitialWorldVersions } from "@scripts/store-versions.ts";
import { extendDragData } from "@scripts/system/dragstart-handler.ts";
import { htmlQueryAll } from "@util";
import * as R from "remeda";

export const Ready = {
    listen: (): void => {
        Hooks.once("ready", () => {
            /** Once the entire VTT framework is initialized, check to see if we should perform a data migration */
            console.log("PF2e System | Starting Pathfinder 2nd Edition System");
            console.debug(`PF2e System | Build mode: ${BUILD_MODE}`);

            // Some of game.pf2e must wait until the ready phase
            SetGamePF2e.onReady();

            // Add Scene Darkness Adjuster to `Scenes` apps list so that it will re-render on scene update
            game.scenes.apps.push(SceneDarknessAdjuster.instance);

            // Determine whether a system migration is required and feasible
            const currentVersion = game.settings.get("pf2e", "worldSchemaVersion");

            // Save the current world schema version if hasn't before.
            storeInitialWorldVersions().then(async () => {
                // Ensure only a single GM will run migrations if multiple are logged in
                if (game.user !== game.users.activeGM) return;

                // 🎉
                await createFirstParty();

                // Perform migrations, if any
                const migrationRunner = new MigrationRunner(MigrationList.constructFromVersion(currentVersion));
                if (migrationRunner.needsMigration()) {
                    if (currentVersion && currentVersion < MigrationRunner.MINIMUM_SAFE_VERSION) {
                        ui.notifications.error(
                            `Your PF2E system data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`,
                            { permanent: true },
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
                const abandonedModules = new Set([
                    "dragupload",
                    "foundry_community_macros",
                    "pf2e-lootgen",
                    "pf2e-toolbox",
                ]);

                // Nag the GM for running unmaintained modules
                const subV10Modules = game.modules.filter(
                    (m) =>
                        m.active &&
                        (m.esmodules.size > 0 || m.scripts.size > 0) &&
                        // Foundry does not enforce the presence of `Module#compatibility.verified`, but modules
                        // without it will also not be listed in the package manager. Skip warning those without it in
                        // case they were made for private use.
                        !!m.compatibility.verified &&
                        (abandonedModules.has(m.id) ||
                            !foundry.utils.isNewerVersion(m.compatibility.verified, "9.280")),
                );

                for (const badModule of subV10Modules) {
                    const message = game.i18n.format("PF2E.ErrorMessage.SubV9Module", { module: badModule.title });
                    ui.notifications.warn(message);
                    console.warn(message);
                }
            });

            // Update chat messages to add set-as-initiative buttons to skill checks
            for (const li of htmlQueryAll(document.body, "#chat-log > li.message")) {
                SetAsInitiative.listen(li);
            }

            activateSocketListener();

            // Extend drag data for things such as condition value
            extendDragData();

            // Set darkness color according to GM Vision setting
            if (
                canvas.ready &&
                game.user.isGM &&
                !game.modules.get("gm-vision")?.active &&
                !game.modules.get("perfect-vision")?.active &&
                game.settings.get("pf2e", "gmVision")
            ) {
                CONFIG.Canvas.darknessColor = CONFIG.PF2E.Canvas.darkness.gmVision;
                canvas.colorManager.initialize();
            }

            // Sort item types for display in sidebar create-item dialog
            game.system.documentTypes.Item.sort((typeA, typeB) => {
                return game.i18n
                    .localize(CONFIG.Item.typeLabels[typeA] ?? "")
                    .localeCompare(game.i18n.localize(CONFIG.Item.typeLabels[typeB] ?? ""));
            });

            game.pf2e.system.moduleArt.refresh().then(() => {
                ui.compendium.compileSearchIndex();
            });

            // Now that all game data is available, Determine what actors we need to reprepare.
            // Add actors currently in an encounter, a party, and all familiars (last)
            const actorsToReprepare = R.compact([
                ...game.combats.contents.flatMap((e) => e.combatants.contents).map((c) => c.actor),
                ...game.actors
                    .filter((a): a is PartyPF2e<null> => a.isOfType("party"))
                    .flatMap((p) => p.members)
                    .filter((a) => !a.isOfType("familiar")),
                ...game.actors.filter((a) => a.type === "familiar"),
            ]);
            resetActors(new Set(actorsToReprepare));

            // Show the GM the Remaster changes journal entry if they haven't seen it already.
            if (game.user.isGM && !game.settings.get("pf2e", "seenRemasterJournalEntry")) {
                fromUuid("Compendium.pf2e.journals.JournalEntry.6L2eweJuM8W7OCf2").then((entry) => {
                    entry?.sheet.render(true);
                });
                game.settings.set("pf2e", "seenRemasterJournalEntry", true);
            }

            // Reset all encounter data and re-render the tracker if an encounter is running
            if (game.combat) {
                for (const encounter of game.combats) {
                    encounter.reset();
                }
                ui.combat.render();
            }

            // Announce the system is ready in case any module needs access to an application not available until now
            Hooks.callAll("pf2e.systemReady");
        });
    },
};
