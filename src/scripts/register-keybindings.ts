export function registerKeybindings(): void {
    game.keybindings.register("pf2e", "cycle-token-stack", {
        name: "PF2E.Keybinding.CycleTokenStack.Label",
        hint: "PF2E.Keybinding.CycleTokenStack.Hint",
        editable: [{ key: "KeyZ", modifiers: [] }],
        onUp: (): boolean => canvas.tokens.cycleStack(),
    });

    // Defer to the Perfect Vision module if enabled
    if (!game.modules.get("perfect-vision")?.active) {
        game.keybindings.register("pf2e", "gm-vision", {
            name: "PF2E.Keybinding.GMVision.Label",
            hint: "PF2E.Keybinding.GMVision.Hint",
            editable: [{ key: "KeyG", modifiers: ["Control"] }],
            restricted: true,
            onUp: (): boolean => {
                game.settings.set("pf2e", "gmVision", !game.settings.get("pf2e", "gmVision"));
                return true;
            },
        });
    }
}
