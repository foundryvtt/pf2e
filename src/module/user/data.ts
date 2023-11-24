import { UserSettingsPF2e } from "./document.ts";

type UserSourcePF2e = Omit<foundry.documents.UserSource, "flags"> & {
    flags: DeepPartial<UserFlagsPF2e>;
};

type UserFlagsPF2e = DocumentFlags & {
    pf2e: {
        settings: UserSettingsPF2e;
    };
};

export type { UserFlagsPF2e, UserSourcePF2e };
