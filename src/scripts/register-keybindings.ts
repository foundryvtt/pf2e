import type { ActorPF2e } from "@actor";

export function registerKeybindings(): void {
    game.keybindings.register("pf2e", "cycle-token-stack", {
        name: "PF2E.Keybinding.CycleTokenStack.Label",
        hint: "PF2E.Keybinding.CycleTokenStack.Hint",
        editable: [{ key: "KeyZ", modifiers: [] }],
        onUp: (): boolean => canvas.tokens.cycleStack(),
    });

    game.keybindings.register("pf2e", "toggle-party-sheet", {
        name: "PF2E.Keybinding.TogglePartySheet.Label",
        hint: "PF2E.Keybinding.TogglePartySheet.Hint",
        editable: [{ key: "KeyP", modifiers: [] }],
        onDown: (): boolean | null => {
            const activePartyId = game.settings.get("pf2e", "activeParty");
            const party = ((): ActorPF2e | null => {
                if (game.user.isGM) {
                    const token =
                        canvas.ready && canvas.tokens.controlled.length === 1 ? canvas.tokens.controlled[0] : null;
                    if (token?.actor?.isOfType("party")) {
                        // Controlled token is a party
                        return token.actor;
                    } else {
                        // Active party
                        return game.actors.get(activePartyId) ?? null;
                    }
                } else if (game.user.character?.isOfType("character")) {
                    // User has an assigned character with an assigned party
                    const parties = Array.from(game.user.character.parties);
                    return parties.find((p) => p.active) ?? parties.at(0) ?? null;
                } else {
                    // Active party and has a member the player owns
                    const activeParty = game.actors.get(activePartyId);
                    return activeParty?.isOfType("party") && activeParty.members.some((m) => m.isOwner)
                        ? activeParty
                        : null;
                }
            })();
            if (!party) return false;

            const { sheet } = party;
            if (sheet.rendered) {
                if (sheet._minimized) {
                    sheet.maximize();
                } else {
                    sheet.close();
                }
            } else {
                sheet.render(true);
            }

            return true;
        },
    });

    // Defer to the Perfect Vision module if enabled
    if (!game.modules.get("gm-vision")?.active && !game.modules.get("perfect-vision")?.active) {
        game.keybindings.register("pf2e", "gm-vision", {
            name: "PF2E.Keybinding.GMVision.Label",
            hint: "PF2E.Keybinding.GMVision.Hint",
            editable: [{ key: "KeyG", modifiers: ["Control"] }],
            restricted: true,
            onDown: (context: KeyboardEventContext): boolean => {
                context.event.preventDefault();
                return true;
            },
            onUp: (): boolean => {
                if (ui.controls.control?.name === "lighting") {
                    // Ensure the toggle in lighting controls continues to reflect the current status
                    const toggle = ui.controls.control.tools.find((t) => t.name === "gm-vision");
                    toggle?.onClick?.(); // Does the same as below
                } else {
                    game.settings.set("pf2e", "gmVision", !game.settings.get("pf2e", "gmVision"));
                }
                return true;
            },
        });
    }
}
