import { UserPF2e } from "./document.ts";

/** Player-specific settings, stored as flags on each User */
export class UserConfigPF2e<TUser extends UserPF2e> extends UserConfig<TUser> {
    override get template(): string {
        return "systems/pf2e/templates/user/sheet.hbs";
    }
}
