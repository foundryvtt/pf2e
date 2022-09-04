import { UserPF2e, UserSettingsPF2e } from "./document";

interface UserDataPF2e<T extends UserPF2e> extends foundry.data.UserData<T> {
    _source: UserSourcePF2e;
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

export { UserDataPF2e, UserFlagsPF2e };
