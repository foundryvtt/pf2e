import { PersistentDialog } from "@item/condition/persistent-damage-dialog.ts";
import { ActionDefaultOptions } from "@system/action-macros/index.ts";

export async function editPersistent(options: ActionDefaultOptions): Promise<void> {
    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    if (!actors?.length) {
        ui.notifications.error(game.i18n.localize("PF2E.ErrorMessage.NoTokenSelected"));
        return;
    }

    for (const actor of actors) {
        if (!actor) continue;
        new PersistentDialog(actor).render(true);
    }
}
