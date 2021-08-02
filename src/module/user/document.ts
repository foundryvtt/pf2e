import { ActorPF2e } from '@actor/base';
import { UserDataPF2e } from './data';
import { PlayerConfigPF2e, UserSettingsPF2e } from './player-config';

export class UserPF2e extends User<ActorPF2e> {
    override prepareData(): void {
        super.prepareData();
        if (canvas.ready && canvas.tokens.controlled.length > 0) {
            game.pf2e.effectPanel.refresh();
        }
    }

    /** Set user settings defaults */
    override prepareBaseData(): void {
        super.prepareBaseData();
        this.data.flags = mergeObject(
            {
                pf2e: {
                    settings: PlayerConfigPF2e.defaultSettings,
                },
            },
            this.data.flags,
        );
    }

    get settings(): UserSettingsPF2e {
        return deepClone(this.data.flags.pf2e.settings);
    }
}

export interface UserPF2e extends User<ActorPF2e> {
    readonly data: UserDataPF2e<this>;

    getFlag(
        scope: 'pf2e',
        key: 'settings',
    ): {
        uiTheme: 'blue' | 'red' | 'original' | 'ui';
        showEffectPanel: boolean;
        showRollDialogs: boolean;
    };
    getFlag(scope: 'pf2e', key: 'settings.uiTheme'): 'blue' | 'red' | 'original' | 'ui';
    getFlag(scope: 'pf2e', key: 'settings.showEffectPanel'): boolean;
    getFlag(scope: 'pf2e', key: 'settings.showRollDialogs'): boolean;
    getFlag(scope: 'pf2e', key: `compendiumFolders.${string}.expanded`): boolean | undefined;
}
