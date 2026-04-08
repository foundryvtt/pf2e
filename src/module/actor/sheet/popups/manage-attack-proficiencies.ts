import { BaseWeaponProficiencyKey, WeaponGroupProficiencyKey } from "@actor/character/data.ts";
import type { CharacterPF2e } from "@actor/character/document.ts";
import { fontAwesomeIcon, htmlClosest, localizer, objectHasKey } from "@util";

async function add(actor: CharacterPF2e): Promise<void> {
    const message = _loc("PF2E.AddCombatProficiency.Message");
    const weaponGroups = CONFIG.PF2E.weaponGroups;
    const baseWeapons = CONFIG.PF2E.baseWeaponTypes;
    const template = await fa.handlebars.renderTemplate(
        `systems/${SYSTEM_ID}/templates/actors/add-combat-proficiency-dialog.hbs`,
        { message, weaponGroups, baseWeapons },
    );

    const proficiency = await foundry.applications.api.DialogV2.input({
        window: {
            title: _loc("PF2E.AddCombatProficiency.Title"),
        },
        content: template,
        ok: {
            icon: fontAwesomeIcon("check").outerHTML,
            label: _loc("PF2E.AddShortLabel"),
            callback: async (_, button) => {
                const element = button.form?.elements.namedItem("proficiency");
                const selection = element instanceof HTMLSelectElement ? element.value : null;
                if (selection) {
                    return selection in weaponGroups
                        ? (`weapon-group-${selection}` as WeaponGroupProficiencyKey)
                        : (`weapon-base-${selection}` as BaseWeaponProficiencyKey);
                }
                return ""; // If we return null, the input returns "ok"
            },
        },
    });
    if (proficiency) await actor.addAttackProficiency(proficiency);
}

function remove(actor: CharacterPF2e, event: PointerEvent): void {
    const weaponGroups = CONFIG.PF2E.weaponGroups;
    const baseWeapons: Record<string, string | undefined> = CONFIG.PF2E.baseWeaponTypes;
    const baseShields: Record<string, string | undefined> = CONFIG.PF2E.baseShieldTypes;
    const key = htmlClosest(event.target, "[data-slug]")?.dataset.slug ?? "";
    const translationKey = key?.replace(/^weapon-(?:base|group)-/, "") ?? "";
    const name = objectHasKey(weaponGroups, translationKey)
        ? _loc(weaponGroups[translationKey])
        : (baseWeapons[translationKey] ?? baseShields[translationKey] ?? translationKey);

    const localize = localizer("PF2E.RemoveCombatProficiency");
    const message = localize("Message", { proficiency: name });
    foundry.applications.api.DialogV2.confirm({
        window: { title: localize("Title") },
        content: `<p>${message}</p>`,
        yes: {
            callback: () => {
                if (!(key in (actor._source.system.proficiencies?.attacks ?? {}))) return;
                actor.update({ [`system.proficiencies.attacks.${key}`]: _del });
            },
            default: false,
        },
    });
}

export const ManageAttackProficiencies = { add, remove };
