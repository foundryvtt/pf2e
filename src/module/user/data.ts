import { UserPF2e } from "./document";
import { UserSettingsPF2e } from "./player-config";

export interface UserDataPF2e<T extends UserPF2e> extends foundry.data.UserData<T> {
    _source: UserSourcePF2e;

    flags: UserFlagsPF2e;
}

interface UserSourcePF2e extends foundry.data.UserSource {
    flags: UserFlagsPF2e;
}

type UserFlagsPF2e = {
    [key: string]: Record<string, unknown>;
    pf2e: {
        settings: UserSettingsPF2e;
    };
};
