import { UserPF2e } from './document';
import { UserSettingsPF2e } from './player-config';

export interface UserDataPF2e<T extends UserPF2e> extends foundry.data.UserData<T> {
    flags: {
        pf2e: {
            [key: string]: unknown;
            settings: UserSettingsPF2e;
            syncDarkness: 'enabled' | 'disabled' | 'default';
        };
        [key: string]: Record<string, unknown>;
    };
}
