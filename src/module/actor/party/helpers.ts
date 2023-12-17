import { ActorPF2e } from "@actor";

/** Create the first party actor in this (typically new) world */
async function createFirstParty(): Promise<void> {
    if (game.user !== game.users.activeGM || game.settings.get("pf2e", "createdFirstParty")) {
        return;
    }

    if (!game.actors.some((a) => a.isOfType("party"))) {
        await ActorPF2e.create(
            {
                _id: CONFIG.PF2E.defaultPartyId,
                type: "party",
                name: game.i18n.localize("PF2E.Actor.Party.DefaultName"),
            },
            { keepId: true },
        );
        await game.settings.set("pf2e", "activeParty", CONFIG.PF2E.defaultPartyId);
    }

    await game.settings.set("pf2e", "createdFirstParty", true);
}

export { createFirstParty };
