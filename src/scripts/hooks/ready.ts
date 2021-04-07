import { activateSocketListener } from '@scripts/socket';
import { PlayerConfigPF2e } from '@module/user/player-config';
import { updateMinionActors } from '@scripts/actor/update-minions';
import { MigrationRunner } from '@module/migration-runner';
import { Migrations } from '@module/migrations';
import { calculateXP } from '@scripts/macros/xp';
import { launchTravelSheet } from '@scripts/macros/travel/travel-speed-sheet';
import { rollActionMacro, rollItemMacro } from '@scripts/macros/hotbar';
import { raiseAShield } from '@scripts/macros/raise-a-shield';
import { earnIncome } from '@scripts/macros/earn-income';
import { ActionsPF2e } from '@system/actions/actions';
import { ConditionManager } from '@module/conditions';
import { StatusEffects } from '@scripts/actor/status-effects';
import { WorldClock } from '@system/world-clock';
import { EffectPanel } from '@system/effect-panel';
import { DicePF2e } from '@scripts/dice';
import {
    AbilityModifier,
    CheckModifier,
    ModifierPF2e,
    MODIFIER_TYPE,
    ProficiencyModifier,
    StatisticModifier,
} from '../../module/modifiers';
import { CheckPF2e } from '@system/rolls';
import { RuleElements } from '@module/rules/rules';

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

        // Exposed objects for macros and modules
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
            DicePF2e: DicePF2e,
            StatusEffects: StatusEffects,
            ConditionManager: ConditionManager,
            ModifierType: MODIFIER_TYPE,
            Modifier: ModifierPF2e,
            AbilityModifier: AbilityModifier,
            ProficiencyModifier: ProficiencyModifier,
            StatisticModifier: StatisticModifier,
            CheckModifier: CheckModifier,
            Check: CheckPF2e,
            RuleElements,
        };
        ActionsPF2e.exposeActions(game.pf2e.actions);

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
        ConditionManager.init().then(() => {
            StatusEffects.init();
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

        // Until it's ready, only show the Animal Companion actor type in dev mode
        if (BUILD_MODE === 'production') {
            const index = game.system.entityTypes.Actor.indexOf('animalCompanion');
            game.system.entityTypes.Actor.splice(index, 1);
        }
    });
}
