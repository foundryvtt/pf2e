import { ActorPF2e, PartyPF2e } from "@actor";
import { resetActors } from "@actor/helpers.ts";
import { createFirstParty } from "@actor/party/helpers.ts";
import { MigrationSummary } from "@module/apps/migration-summary.ts";
import { SceneDarknessAdjuster } from "@module/apps/scene-darkness-adjuster.ts";
import { MigrationList } from "@module/migration/index.ts";
import { MigrationRunner } from "@module/migration/runner/index.ts";
import { SetGamePF2e } from "@scripts/set-game-pf2e.ts";
import { activateSocketListener } from "@scripts/socket.ts";
import { storeInitialWorldVersions } from "@scripts/store-versions.ts";
import { extendDragData } from "@scripts/system/dragstart-handler.ts";
import * as R from "remeda";

export const Ready = {
    listen: (): void => {
        Hooks.once("ready", () => {
            // Proceed no further if blacklisted modules are enabled
            const blacklistedModules = ["pf2e-action-support-engine", "pf2e-action-support-engine-macros"];
            const blacklistedId = blacklistedModules.find((id) => game.modules.get(id)?.active);
            if (blacklistedId) {
                const message = `PF2E System halted: module "${blacklistedId}" is not supported.`;
                ui.notifications.error(message, { permanent: true });
                CONFIG.PF2E = {} as typeof CONFIG.PF2E;
                game.pf2e = {} as typeof game.pf2e;
                return;
            }

            /** Once the entire VTT framework is initialized, check to see if we should perform a data migration */
            console.log("PF2e System | Starting Pathfinder 2nd Edition System");
            console.debug(`PF2e System | Build mode: ${BUILD_MODE}`);

            // Enforce certain grid settings. These should be handled by our defaults, but a user may have changed them.
            // Changing a setting to the default still triggers onChange, and in V12.322 can trigger console errors
            // The actual manipulation of the setting is locked down by the renderSettingsConfig hook.
            const defaultGridSettings = {
                gridTemplates: false,
                coneTemplateType: "round",
            };
            for (const [key, value] of Object.entries(defaultGridSettings)) {
                if (game.settings.get("core", key) !== value) {
                    game.settings.set("core", key, value);
                }
            }

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
                if (fu.isNewerVersion(current, previous)) {
                    await game.settings.set("pf2e", "worldSystemVersion", current);
                }

                // These modules claim compatibility with V11 but are abandoned
                const abandonedModules = new Set(["pf2e-rules-based-npc-vision", "foundryvtt-drag-ruler"]);

                // Nag the GM for running unmaintained modules
                const subV10Modules = game.modules.filter(
                    (m) =>
                        m.active &&
                        (m.esmodules.size > 0 || m.scripts.size > 0) &&
                        // Foundry does not enforce the presence of `Module#compatibility.verified`, but modules
                        // without it will also not be listed in the package manager. Skip warning those without it in
                        // case they were made for private use.
                        !!m.compatibility.verified &&
                        (abandonedModules.has(m.id) || !fu.isNewerVersion(m.compatibility.verified, "11.315")),
                );

                for (const badModule of subV10Modules) {
                    const message = game.i18n.format("PF2E.ErrorMessage.SubV9Module", { module: badModule.title });
                    ui.notifications.warn(message);
                }
            });

            game.settings.get("pf2e", "homebrew.languageRarities").onReady();

            activateSocketListener();

            // Extend drag data for things such as condition value
            extendDragData();

            // Set darkness color according to GM Vision setting
            if (
                canvas.ready &&
                game.user.isGM &&
                !game.modules.get("gm-vision")?.active &&
                game.pf2e.settings.gmVision
            ) {
                CONFIG.Canvas.darknessColor = CONFIG.PF2E.Canvas.darkness.gmVision;
                canvas.environment.initialize();
            }

            game.pf2e.system.moduleArt.refresh().then(() => {
                if (game.modules.get("babele")?.active && game.i18n.lang !== "en") {
                    // For some reason, Babele calls its own "ready" hook twice, and only the second one is genuine.
                    Hooks.once("babele.ready", () => {
                        Hooks.once("babele.ready", () => {
                            ui.compendium.compileSearchIndex();
                        });
                    });
                } else {
                    ui.compendium.compileSearchIndex();
                }
            });

            // Now that all game data is available, Determine what actors we need to reprepare.
            // Add actors currently in an encounter, then in a party, then all familiars, then parties, then in terrains
            const inTerrains: ActorPF2e[] = [];
            const hasSceneTerrains = !!game.scenes.viewed?.flags.pf2e.environmentTypes?.length;
            for (const token of game.scenes.viewed?.tokens ?? []) {
                if (!token.actor) continue;
                if (hasSceneTerrains) {
                    inTerrains.push(token.actor);
                } else if ((token.regions ?? []).some((r) => r.behaviors.some((b) => b.type === "environment"))) {
                    inTerrains.push(token.actor);
                }
            }
            const parties = game.actors.filter((a): a is PartyPF2e<null> => a.isOfType("party"));
            const actorsToReprepare = new Set(
                [
                    ...game.combats.contents.flatMap((e) => e.combatants.contents).map((c) => c.actor),
                    ...parties.flatMap((p) => p.members).filter((a) => !a.isOfType("familiar")),
                    ...inTerrains.filter((a) => !a.isOfType("familiar", "hazard", "loot", "party")),
                    ...game.actors.filter((a) => a.type === "familiar"),
                    ...parties,
                ].filter(R.isTruthy),
            );
            resetActors(actorsToReprepare, { sheets: false, tokens: inTerrains.length > 0 });
            ui.actors.render();

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
