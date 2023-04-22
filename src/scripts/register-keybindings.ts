export function registerKeybindings(): void {
    game.keybindings.register("pf2e", "cycle-token-stack", {
        name: "PF2E.Keybinding.CycleTokenStack.Label",
        hint: "PF2E.Keybinding.CycleTokenStack.Hint",
        editable: [{ key: "KeyZ", modifiers: [] }],
        onUp: (): boolean => canvas.tokens.cycleStack(),
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
