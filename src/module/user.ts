import { ActorPF2e } from '@actor/base';

export class UserPF2e extends User<ActorPF2e> {}

export interface UserPF2e extends User<ActorPF2e> {
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
