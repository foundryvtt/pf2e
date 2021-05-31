import { activateSocketListener } from '@scripts/socket';
import { PlayerConfigPF2e } from '@module/user/player-config';
import { prepareMinions } from '@scripts/actor/prepare-minions';
import { MigrationRunner } from '@module/migration-runner';
import { Migrations } from '@module/migrations';
import { ActionsPF2e } from '@system/actions/actions';
import { HomebrewElements } from '@module/settings/homebrew';
import { setWorldSchemaVersion } from '@module/migrations/set-world-schema-version';
import { WorldClock } from '@module/system/world-clock';
import { CompendiumBrowser } from '@module/apps/compendium-browser';

export function listen(): void {
    Hooks.once('ready', () => {
        /** Once the entire VTT framework is initialized, check to see if we should perform a data migration */
        console.log('PF2e System | Readying Pathfinder 2nd Edition System');
        console.debug(`PF2e System | Build mode: ${BUILD_MODE}`);

        // Save the current world schema version if hasn't before.
        setWorldSchemaVersion();

        // Determine whether a system migration is required and feasible
        const currentVersion = game.settings.get('pf2e', 'worldSchemaVersion');
        const COMPATIBLE_MIGRATION_VERSION = 0.411;

        if (game.user.isGM && game.user.role !== CONST.USER_ROLES.ASSISTANT) {
            // Perform the migration
            const migrationRunner = new MigrationRunner(Migrations.constructForWorld(currentVersion));
            if (migrationRunner.needsMigration()) {
                if (currentVersion && currentVersion < COMPATIBLE_MIGRATION_VERSION) {
                    ui.notifications.error(
                        `Your PF2E system data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`,
                        { permanent: true },
                    );
                }
                migrationRunner.runMigration();
            }
        }

        ActionsPF2e.exposeActions(game.pf2e.actions);

        PlayerConfigPF2e.init();
        PlayerConfigPF2e.activateColorScheme();

        // update minion-type actors to trigger another prepare data cycle with the master actor already prepared and ready
        prepareMinions();
        activateSocketListener();

        // Apply ActiveEffects modifying the actor's token(s)
        for (const actor of game.actors) {
            if (actor.overrides.token) {
                for (const token of actor.getActiveTokens()) {
                    token.applyActiveEffects(actor.overrides.token);
                }
            }
        }

        // Add value field to TextEditor#_onDragEntityLink data. This is mainly used for conditions.
        $('body').on('dragstart', 'a.entity-link', (event: JQuery.DragStartEvent) => {
            const name = event?.currentTarget?.innerText?.trim() ?? '';
            const match = name.match(/[0-9]+/);
            if (match !== null) {
                const value = Number(match[0]);
                const dataTransfer = event?.originalEvent?.dataTransfer;
                if (dataTransfer) {
                    const data = JSON.parse(dataTransfer.getData('text/plain'));
                    data.value = value;
                    dataTransfer.setData('text/plain', JSON.stringify(data));
                }
            }
        });

        // Start up the Compendium Browser
        game.pf2e.compendiumBrowser = new CompendiumBrowser();

        // Assign the homebrew elements to their respective `CONFIG.PF2E` objects
        HomebrewElements.refreshTags();

        // Final pass to ensure effects on actors properly consider the initiative of any active combat
        game.pf2e.effectTracker.refresh();

        // Start system sub-applications
        game.pf2e.worldClock = new WorldClock();
    });
}
