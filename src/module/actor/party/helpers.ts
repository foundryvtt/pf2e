import { CharacterPF2e, FamiliarPF2e } from "@actor";
import { PartyPF2e } from "./document.ts";

/** Create the first party actor in this (typically new) world */
async function createFirstParty(): Promise<void> {
    if (game.user !== game.users.activeGM || game.settings.get("pf2e", "createdFirstParty")) {
        return;
    }
    if (game.actors.some((a) => a.isOfType("party"))) {
        await game.settings.set("pf2e", "createdFirstParty", true);
        return;
    }

    const party = await PartyPF2e.create({ type: "party", name: game.i18n.localize("PF2E.Actor.Party.DefaultName") });
    const members = game.actors.filter(
        (a): a is CharacterPF2e<null> | FamiliarPF2e<null> => a.hasPlayerOwner && a.isOfType("character", "familiar")
    );
    await party?.addMembers(...members);
    await game.settings.set("pf2e", "createdFirstParty", true);
}

export { createFirstParty };
