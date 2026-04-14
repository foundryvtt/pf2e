import { ActorPF2e } from "@actor";
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
import { NoJQueryPlugin } from "@util/destroyables.ts";
import Sortable from "sortablejs";

export const Ready = {
    listen: (): void => {
        Hooks.once("ready", () => {
            // Proceed no further if forbidden modules are enabled
            const forbiddenModules = ["pf2e-token-pack", "pf2e-token-pack-character-gallery"];
            const blanketBanned = game.modules.some(
                (m) => m.id.startsWith("pf2e-ts-adv") || m.authors.some((a) => a.name === "TaleSale"),
            );
            if (blanketBanned || forbiddenModules.some((id) => game.modules.has(id))) {
                const message = `PF2E system halted: one or more of your modules are not supported.`;
                ui.notifications.error(message, { permanent: true });
                CONFIG.PF2E = {} as typeof CONFIG.PF2E;
                game.pf2e = {} as typeof game.pf2e;
                return;
            }

            // Once the entire VTT framework is initialized, check to see if we should perform a data migration
            console.log("PF2e System | Starting Pathfinder 2nd Edition System");
            console.debug(`PF2e System | Build mode: ${BUILD_MODE}`);

            // Some of game.pf2e must wait until the ready phase
            SetGamePF2e.onReady();

            // Add Scene Darkness Adjuster to `Scenes` apps list so that it will re-render on scene update
            game.scenes.apps.push(SceneDarknessAdjuster.instance);

            // Determine whether a system migration is required and feasible
            const currentVersion = game.settings.get(SYSTEM_ID, "worldSchemaVersion");

            // Save the current world schema version if hasn't before.
            storeInitialWorldVersions().then(async () => {
                // Ensure only a single GM will run migrations if multiple are logged in
                if (!game.user.isActiveGM) return;

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
                const previous = game.settings.get(SYSTEM_ID, "worldSystemVersion");
                const current = game.system.version;
                if (fu.isNewerVersion(current, previous)) {
                    await game.settings.set(SYSTEM_ID, "worldSystemVersion", current);
                }

                // Nag the GM for running unmaintained modules
                const subV11Modules = game.modules.filter(
                    (m) =>
                        m.active &&
                        (m.esmodules.size > 0 || m.scripts.size > 0) &&
                        // Foundry does not enforce the presence of `Module#compatibility.verified`, but modules
                        // without it will also not be listed in the package manager. Skip warning those without it in
                        // case they were made for private use.
                        !!m.compatibility.verified &&
                        fu.isNewerVersion("13", m.compatibility.verified),
                );

                for (const badModule of subV11Modules) {
                    const message = _loc("PF2E.ErrorMessage.ModuleTooOld", { module: badModule.title });
                    ui.notifications.warn(message);
                }
            });

            game.settings.get(SYSTEM_ID, "homebrew.languageRarities").onReady();

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

            // Now that all game data is available, Determine what actors we need to reprepare.
            // Add actors currently in an encounter, then in a party, then all familiars, then parties, then in terrains
            const inEnvironments: ActorPF2e[] = [];
            const hasSceneEnvironments = !!game.scenes.viewed?.flags[SYSTEM_ID].environmentTypes?.length;
            for (const token of game.scenes.active?.tokens ?? []) {
                const inEnvironmentRegion = !!token.regions?.some((r) =>
                    r.behaviors.some((b) => !b.disabled && ["environment", "environmentFeature"].includes(b.type)),
                );
                if (token.actor && (hasSceneEnvironments || inEnvironmentRegion)) {
                    inEnvironments.push(token.actor);
                }
            }
            const actorsToReprepare: Set<ActorPF2e> = new Set([
                ...game.combats.contents.flatMap((e) => e.combatants.contents).flatMap((c) => c.actor ?? []),
                ...inEnvironments.filter((a) => !a.isOfType("familiar", "hazard", "loot", "party")),
            ]);
            resetActors(actorsToReprepare, { sheets: false, tokens: inEnvironments.length > 0 });
            ui.actors.render({ parts: ["directory", "parties"] });

            // Reset all encounter data and re-render the tracker if an encounter is running
            if (game.combat) {
                for (const encounter of game.combats) {
                    encounter.reset();
                }
                ui.combat.render();
            }

            // Preload Font Awesome Duotone
            // Check for presence of `find`: Firefox's iterator objects aren't always iterator objects.
            const faDuotone = document.fonts.values().find?.((f) => f.family === "Font Awesome 6 Duotone");
            if (faDuotone?.status === "unloaded") faDuotone.load();

            // Prevent sortable from using jQuery when cloning elements.
            Sortable.mount(NoJQueryPlugin);

            // Announce the system is ready in case any module needs access to an application not available until now
            Hooks.callAll("pf2e.systemReady");
        });
    },
};
