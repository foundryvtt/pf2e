import { BaseWeaponProficiencyKey, WeaponGroupProficiencyKey } from "@actor/character/data.ts";
import type { CharacterPF2e } from "@actor/character/document.ts";
import { fontAwesomeIcon, htmlClosest, htmlQuery, localizer, objectHasKey } from "@util";

async function add(actor: CharacterPF2e): Promise<void> {
    const weaponGroups = CONFIG.PF2E.weaponGroups;
    const baseWeapons = CONFIG.PF2E.baseWeaponTypes;
    const template = await renderTemplate("systems/pf2e/templates/actors/add-combat-proficiency-dialog.hbs", {
        message: game.i18n.localize("PF2E.AddCombatProficiency.Message"),
        weaponGroups,
        baseWeapons,
    });

    const dialog = new Dialog({
        title: game.i18n.localize("PF2E.AddCombatProficiency.Title"),
        content: template,
        buttons: {
            add: {
                icon: fontAwesomeIcon("check").outerHTML,
                label: game.i18n.localize("PF2E.AddShortLabel"),
                callback: async ($dialog) => {
                    const dialog = $dialog[0];
                    const selection = htmlQuery<HTMLSelectElement>(dialog, "select[name=proficiency]")?.value;
                    if (selection) {
                        const proficiencyKey =
                            selection in weaponGroups
                                ? (`weapon-group-${selection}` as WeaponGroupProficiencyKey)
                                : (`weapon-base-${selection}` as BaseWeaponProficiencyKey);
                        await actor.addAttackProficiency(proficiencyKey);
                    }
                },
            },
            cancel: {
                icon: fontAwesomeIcon("times").outerHTML,
                label: game.i18n.localize("Cancel"),
            },
        },
        default: "cancel",
    });
    dialog.render(true);
}

function remove(actor: CharacterPF2e, event: MouseEvent): void {
    const weaponGroups = CONFIG.PF2E.weaponGroups;
    const baseWeapons: Record<string, string | undefined> = CONFIG.PF2E.baseWeaponTypes;
    const baseShields: Record<string, string | undefined> = CONFIG.PF2E.baseShieldTypes;
    const key = htmlClosest(event.target, "[data-slug]")?.dataset.slug ?? "";
    const translationKey = key?.replace(/^weapon-(?:base|group)-/, "") ?? "";
    const name = objectHasKey(weaponGroups, translationKey)
        ? game.i18n.localize(weaponGroups[translationKey])
        : (baseWeapons[translationKey] ?? baseShields[translationKey] ?? translationKey);

    const localize = localizer("PF2E.RemoveCombatProficiency");
    const message = localize("Message", { proficiency: name });
    Dialog.confirm({
        title: localize("Title"),
        content: `<p>${message}</p>`,
        defaultYes: false,
        yes: () => {
            if (!(key in (actor._source.system.proficiencies?.attacks ?? {}))) return;
            actor.update({ [`system.proficiencies.attacks.-=${key}`]: null });
        },
    });
}

export const ManageAttackProficiencies = { add, remove };
