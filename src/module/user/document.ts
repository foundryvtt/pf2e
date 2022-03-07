import { ActorPF2e } from "@actor/base";
import { UserDataPF2e } from "./data";
import { PlayerConfigPF2e, UserSettingsPF2e } from "./player-config";

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
                    settings: deepClone(PlayerConfigPF2e.defaultSettings),
                },
            },
            this.data.flags
        );
    }

    get settings(): Readonly<UserSettingsPF2e> {
        return this.data.flags.pf2e.settings;
    }

    /** Alternative to calling `#updateTokenTargets()` with no argument or an empty array */
    clearTargets(): void {
        this.updateTokenTargets();
    }
}

export interface UserPF2e extends User<ActorPF2e> {
    readonly data: UserDataPF2e<this>;
}
