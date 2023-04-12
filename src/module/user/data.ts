import { UserSettingsPF2e } from "./document.ts";

interface UserSourcePF2e extends foundry.documents.UserSource {
    flags: DeepPartial<UserFlagsPF2e>;
}

type UserFlagsPF2e = DocumentFlags & {
    pf2e: {
        settings: UserSettingsPF2e;
    };
};

export { UserFlagsPF2e, UserSourcePF2e };
