import { UserPF2e } from "./document";
import { UserSettingsPF2e } from "./player-config";

export interface UserDataPF2e<T extends UserPF2e> extends foundry.data.UserData<T> {
    _source: UserSourcePF2e;

    flags: {
        pf2e: {
            [key: string]: unknown;
            settings: UserSettingsPF2e;
        };
        [key: string]: Record<string, unknown>;
    };
}

interface UserSourcePF2e extends foundry.data.UserSource {
    flags: {
        pf2e: {
            [key: string]: unknown;
            settings: UserSettingsPF2e;
        };
        [key: string]: Record<string, unknown>;
    };
}
