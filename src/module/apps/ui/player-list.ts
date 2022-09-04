import { UserConfigPF2e } from "@module/user/sheet";
import { fontAwesomeIcon } from "@util";

export class PlayerListPF2e extends PlayerList {
    /** Workaround for upstream bug in which core sheet class is hard-coded in callback */
    protected override _getUserContextOptions(): ContextMenuEntry[] {
        const options = super._getUserContextOptions();
        const configOption = options.find((o) => o.icon === '<i class="fas fa-male"></i>'); // what in tarnation
        if (configOption) {
            configOption.callback = ($li: JQuery) => {
                const user = game.users.get($li[0]?.dataset.userId ?? "", { strict: true });
                new UserConfigPF2e(user).render(true);
            };

            configOption.icon = fontAwesomeIcon("female").outerHTML;
        }

        return options;
    }
}
