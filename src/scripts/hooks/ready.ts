import { activateSocketListener } from '../socket';
import { PlayerConfigPF2e } from '../../module/user/player-config';
import { WorldClock } from '../../module/system/world-clock';
import { updateMinionActors } from '../actor/update-minions';
import { MigrationRunner } from '../..//module/migration-runner';
import { Migrations } from '../../module/migrations';
import { EffectPanel } from '../../module/system/effect-panel';
import { calculateXP } from '../macros/xp';
import { launchTravelSheet } from '../../module/gm/travel/travel-speed-sheet';
import { rollActionMacro, rollItemMacro } from '../init';
import { raiseAShield } from '../macros/raise-a-shield';
import { earnIncome } from '../macros/earn-income';
import { PF2Actions } from '../../module/system/actions/actions';
import { PF2eConditionManager } from '../../module/conditions';
import { PF2eStatusEffects } from '../actor/status-effects';

export function listen(): void {
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

        game.pf2e = {
            actions: {
                earnIncome,
                raiseAShield,
            },
            rollItemMacro,
            rollActionMacro,
            gm: {
                calculateXP,
                launchTravelSheet,
            },
            effectPanel: new EffectPanel(),
            worldClock: new WorldClock(),
        };
        PF2Actions.exposeActions(game.pf2e.actions);

        // Effect Panel singleton application
        if (game.pf2e.effectPanel && (game.user.getFlag(game.system.id, 'showEffectPanel') ?? true)) {
            game.pf2e.effectPanel.render(true);
        }

        PlayerConfigPF2e.init();
        PlayerConfigPF2e.activateColorScheme();

        // update minion-type actors to trigger another prepare data cycle with the master actor already prepared and ready
        updateMinionActors();
        activateSocketListener();

        // Requires ConditionManager to be fully loaded.
        PF2eConditionManager.init().then(() => {
            PF2eStatusEffects.init();
        });

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
    });
}
