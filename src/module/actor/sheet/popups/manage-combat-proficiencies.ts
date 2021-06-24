import { CharacterPF2e } from '@actor/character';
import { BaseWeaponProficiencyKey, WeaponGroupProficiencyKey } from '@actor/character/data';
import { BaseWeaponType, WeaponGroup } from '@item/weapon/data';
import { LocalizePF2e } from '@module/system/localize';

async function add(actor: CharacterPF2e, event: JQuery.ClickEvent): Promise<void> {
    const translations = LocalizePF2e.translations.PF2E;
    const weaponGroups = CONFIG.PF2E.weaponGroups;
    const baseWeapons = translations.Weapon.Base;
    const template = await renderTemplate('systems/pf2e/templates/actors/add-combat-proficiency-dialog.html', {
        message: translations.AddCombatProficiency.Message,
        weaponGroups,
        baseWeapons,
    });

    const dialog = new Dialog({
        title: LocalizePF2e.translations.PF2E.AddCombatProficiency.Title,
        content: template,
        buttons: {
            add: {
                icon: '<i class="fas fa-check"></i>',
                label: LocalizePF2e.translations.PF2E.AddShortLabel,
                callback: async ($dialog) => {
                    const selection = $dialog.find('select[name="proficiency"]').val();
                    if (typeof selection === 'string' && selection != '') {
                        const proficiencyKey =
                            selection in weaponGroups
                                ? (`weapon-group-${selection}` as WeaponGroupProficiencyKey)
                                : (`weapon-base-${selection}` as BaseWeaponProficiencyKey);
                        await actor.addCombatProficiency(proficiencyKey);
                        const $tab = $(event.currentTarget).closest('.tab.skills');
                        $tab.animate({ scrollTop: $tab.height() }, 'slow');
                    }
                },
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize('Cancel'),
            },
        },
        default: 'cancel',
    });
    dialog.render(true);
}

function remove(actor: CharacterPF2e, event: JQuery.ClickEvent) {
    const weaponGroups = CONFIG.PF2E.weaponGroups;
    const baseWeapons = LocalizePF2e.translations.PF2E.Weapon.Base;
    const key = $(event.currentTarget).closest('li.skill.custom').data('skill');
    const translationKey = key.replace(/^weapon-(?:base|group)-/, '');
    const name =
        translationKey in weaponGroups
            ? game.i18n.localize(weaponGroups[translationKey as WeaponGroup])
            : baseWeapons[translationKey as BaseWeaponType];

    const dialogText = LocalizePF2e.translations.PF2E.RemoveCombatProficiency;
    const message = game.i18n.format(dialogText.Message, { proficiency: name });
    Dialog.confirm({
        title: dialogText.Title,
        content: `<p>${message}</p>`,
        defaultYes: false,
        yes: () => {
            if (key in actor.data.data.martial) {
                actor.removeCombatProficiency(key);
            }
        },
    });
}

export const ManageCombatProficiencies = { add, remove };
