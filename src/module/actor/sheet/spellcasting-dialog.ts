import { SpellcastingEntryPF2e } from "@item";

interface SpellcastingRenderOptions {
    entry?: SpellcastingEntryPF2e;
    callback: (html: JQuery) => void;
}

/** Creates a dialog to create or update spellcasting entries. */
export async function createSpellcastingDialog(event: JQuery.ClickEvent, options: SpellcastingRenderOptions) {
    const magicTradition = options.entry?.tradition || "arcane";
    const spellcastingType = options.entry?.data.data.prepared.value || "innate";

    const dialogData = {
        magicTradition,
        magicTraditions: CONFIG.PF2E.magicTraditions,
        spellcastingType,
        spellcastingTypes: CONFIG.PF2E.preparationType,
        entry: options.entry,
    };

    const path = "systems/pf2e/templates/actors/spellcasting-dialog.html";
    const content = await renderTemplate(path, dialogData);
    return new Dialog(
        {
            title: game.i18n.localize("PF2E.SpellcastingTypeLabel"),
            content,
            render: (html) => {
                // Set visibility of elements based on current values
                // Using visibility over display prevents stretching of dialog elements
                const typeField = $(html).find('[name="spellcastingType"]');
                typeField.on("change", () => {
                    const traditionGroup = $(html).find(".tradition-group");
                    const isRitual = typeField.val() === "ritual";
                    traditionGroup.css("visibility", isRitual ? "hidden" : "visible");
                });
            },
            buttons: {
                finish: {
                    label: options.entry
                        ? game.i18n.localize("PF2E.UpdateLabelUniversal")
                        : game.i18n.localize("PF2E.CreateLabelUniversal"),
                    callback: options.callback,
                },
            },
            default: "finish",
        },
        {
            width: 300,
            top: event.clientY - 80,
            left: window.innerWidth - 710,
        }
    ).render(true);
}
