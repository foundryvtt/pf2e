import { PersistentDialog } from "@item/condition/persistent-damage-dialog.ts";
import { ActionDefaultOptions } from "@system/action-macros/index.ts";
import * as R from "remeda";

export async function editPersistent(options: ActionDefaultOptions): Promise<void> {
    const actors = R.compact([options.actors].flat());
    if (actors.length === 0) {
        ui.notifications.error(game.i18n.localize("PF2E.ErrorMessage.NoTokenSelected"));
        return;
    }

    for (const actor of actors) {
        new PersistentDialog(actor).render(true);
    }
}
