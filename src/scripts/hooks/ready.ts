import { activateSocketListener } from '../socket';
import { PlayerConfigPF2e } from '../../module/user/player-config';
import { WorldClock } from '../../module/system/world-clock';
import { updateMinionActors } from '../actor/update-minions';
import { MigrationRunner } from '../../module/migration-runner';
import { Migrations } from '../migrations';
import { EffectPanel } from '../../module/system/effect-panel';

export function listen() {
    Hooks.once('ready', () => {
        /** Once the entire VTT framework is initialized, check to see if we should perform a data migration */
        console.log('PF2e System | Readying Pathfinder 2nd Edition System');
        console.debug(`PF2e System | Build mode: ${BUILD_MODE}`);

        // Determine whether a system migration is required and feasible
        const currentVersion = game.settings.get('pf2e', 'worldSchemaVersion');
        const COMPATIBLE_MIGRATION_VERSION = 0.411;

        if (game.user.isGM) {
            // Perform the migration
            const migrationRunner = new MigrationRunner(Migrations.constructAll());
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

        // Effect Panel singleton application
        game[game.system.id].effectPanel = new EffectPanel();
        if (game.pf2e.effectPanel && (game.user.getFlag(game.system.id, 'showEffectPanel') ?? true)) {
            game.pf2e.effectPanel.render(true);
        }

        game.pf2e.worldClock = new WorldClock();

        PlayerConfigPF2e.init();
        PlayerConfigPF2e.activateColorScheme();

        // update minion-type actors to trigger another prepare data cycle with the master actor already prepared and ready
        updateMinionActors();
        activateSocketListener();
    });
}
