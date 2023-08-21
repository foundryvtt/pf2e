import { PartyPF2e } from "./document.ts";

/** Create the first party actor in this (typically new) world */
async function createFirstParty(): Promise<void> {
    if (game.user !== game.users.activeGM || game.settings.get("pf2e", "createdFirstParty")) {
        return;
    }

    if (!game.actors.some((a) => a.isOfType("party"))) {
        await PartyPF2e.create({ type: "party", name: game.i18n.localize("PF2E.Actor.Party.DefaultName") });
    }

    await game.settings.set("pf2e", "createdFirstParty", true);
}

export { createFirstParty };
