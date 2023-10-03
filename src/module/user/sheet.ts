import type { UserPF2e } from "./document.ts";

/** Player-specific settings, stored as flags on each User */
export class UserConfigPF2e<TUser extends UserPF2e> extends UserConfig<TUser> {
    override async getData(options: DocumentSheetOptions): Promise<UserConfigData<TUser>> {
        const data = await super.getData(options);
        data.actors = data.actors.filter((a) => a.type !== "party");
        return data;
    }

    override get template(): string {
        return "systems/pf2e/templates/user/sheet.hbs";
    }
}
