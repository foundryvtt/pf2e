export const RenderCombatTrackerConfig = {
    listen: (): void => {
        Hooks.on("renderCombatTrackerConfig", async (app, $html) => {
            $("#combat-config").css({ height: "" });
            const $lastFormGroup = $html.find(".form-group").last();
            const $newFormGroup = $lastFormGroup.clone();
            $newFormGroup.find("label").text(game.i18n.localize("PF2E.SETTINGS.DeathIcon.Name"));
            $newFormGroup.find("p.notes").text(game.i18n.localize("PF2E.SETTINGS.DeathIcon.Hint"));

            // Inject an image file picker
            const replacement = await renderTemplate("systems/pf2e/templates/system/ui/combat-tracker-config.html", {
                value: game.settings.get("pf2e", "deathIcon"),
            });
            $newFormGroup.find("input").replaceWith(replacement);
            $lastFormGroup.after($newFormGroup);

            // Reactivate listeners to make the file picker work
            app.activateListeners($html);
        });
    },
};
