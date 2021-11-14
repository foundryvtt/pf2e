import { ProficiencyModifier } from "@module/modifiers";
import { ActorSheetPF2e } from "../sheet/base";
import { LocalizePF2e } from "@module/system/localize";
import { ConsumablePF2e, SpellPF2e, SpellcastingEntryPF2e, WeaponPF2e } from "@item";
import { CreaturePF2e } from "@actor";
import { ErrorPF2e, objectHasKey } from "@util";
import { BaseWeaponType, WeaponGroup } from "@item/weapon/data";
import { ZeroToFour } from "@module/data";
import { SkillData } from "./data";
import { ABILITY_ABBREVIATIONS, SKILL_DICTIONARY } from "@actor/data/values";
import { Rollable } from "@actor/data/base";
import { CreatureSheetItemRenderer } from "@actor/sheet/item-summary-renderer";
import { CharacterStrike } from "@actor/character/data";
import { NPCStrike } from "@actor/npc/data";

/**
 * Base class for NPC and character sheets
 * @category Actor
 */
export abstract class CreatureSheetPF2e<ActorType extends CreaturePF2e> extends ActorSheetPF2e<ActorType> {
    override itemRenderer = new CreatureSheetItemRenderer(this);

    override getData(options?: ActorSheetOptions) {
        const sheetData: any = super.getData(options);
        // Update martial-proficiency labels
        if (sheetData.data.martial) {
            const proficiencies = Object.entries(sheetData.data.martial as Record<string, SkillData>);
            for (const [key, proficiency] of proficiencies) {
                const groupMatch = /^weapon-group-([-\w]+)$/.exec(key);
                const baseWeaponMatch = /^weapon-base-([-\w]+)$/.exec(key);
                const label = ((): string => {
                    if (objectHasKey(CONFIG.PF2E.martialSkills, key)) {
                        return CONFIG.PF2E.martialSkills[key];
                    }
                    if (objectHasKey(CONFIG.PF2E.weaponCategories, key)) {
                        return CONFIG.PF2E.weaponCategories[key];
                    }
                    if (Array.isArray(groupMatch)) {
                        const weaponGroup = groupMatch[1] as WeaponGroup;
                        return CONFIG.PF2E.weaponGroups[weaponGroup];
                    }
                    if (Array.isArray(baseWeaponMatch)) {
                        const baseWeapon = baseWeaponMatch[1] as BaseWeaponType;
                        return LocalizePF2e.translations.PF2E.Weapon.Base[baseWeapon];
                    }
                    return key;
                })();

                proficiency.icon = this.getProficiencyIcon(proficiency.rank);
                proficiency.hover = CONFIG.PF2E.proficiencyLevels[proficiency.rank];
                proficiency.label = game.i18n.localize(label);
                proficiency.value = ProficiencyModifier.fromLevelAndRank(
                    sheetData.data.details.level.value,
                    proficiency.rank || 0
                ).modifier;
            }
        }

        // Update save labels
        if (sheetData.data.saves) {
            for (const key of ["fortitude", "reflex", "will"] as const) {
                const save = sheetData.data.saves[key];
                save.icon = this.getProficiencyIcon(save.rank);
                save.hover = CONFIG.PF2E.proficiencyLevels[save.rank];
                save.label = CONFIG.PF2E.saves[key];
            }
        }

        // Update proficiency label
        if (sheetData.data.attributes !== undefined) {
            sheetData.data.attributes.perception.icon = this.getProficiencyIcon(
                sheetData.data.attributes.perception.rank
            );
            sheetData.data.attributes.perception.hover =
                CONFIG.PF2E.proficiencyLevels[sheetData.data.attributes.perception.rank];
        }

        // Ability Scores
        if (sheetData.data.abilities) {
            for (const key of ABILITY_ABBREVIATIONS) {
                sheetData.data.abilities[key].label = CONFIG.PF2E.abilities[key];
            }
        }

        // Update skill labels
        if (sheetData.data.skills) {
            const skills: Record<string, SkillData & Record<string, string>> = sheetData.data.skills;
            const mainSkills: Record<string, string> = CONFIG.PF2E.skills;
            for (const key in skills) {
                const skill = skills[key];
                skill.icon = this.getProficiencyIcon(skill.rank);
                skill.hover = CONFIG.PF2E.proficiencyLevels[skill.rank];
                skill.label = skill.label ?? mainSkills[key];
            }
        }

        // Update traits
        sheetData.abilities = CONFIG.PF2E.abilities;
        sheetData.skills = CONFIG.PF2E.skills;
        sheetData.actorSizes = CONFIG.PF2E.actorSizes;
        sheetData.alignments = CONFIG.PF2E.alignments;
        sheetData.rarity = CONFIG.PF2E.rarityTraits;
        sheetData.attitude = CONFIG.PF2E.attitude;
        sheetData.pfsFactions = CONFIG.PF2E.pfsFactions;

        return sheetData;
    }

    /**
     * Get the font-awesome icon used to display a certain level of skill proficiency
     */
    protected getProficiencyIcon(level: ZeroToFour): string {
        const icons = {
            0: "",
            1: '<i class="fas fa-check-circle"></i>',
            2: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>',
            3: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>',
            4: '<i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i><i class="fas fa-check-circle"></i>',
        };
        return icons[level];
    }

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);

        // Handlers for number inputs of properties subject to modification by AE-like rules elements
        html.find<HTMLInputElement>("input[data-property]").on("focus", (event) => {
            const $input = $(event.target);
            const propertyPath = $input.attr("data-property") ?? "";
            const baseValue = getProperty(this.actor.data._source, propertyPath);
            $input.val(baseValue).attr({ name: propertyPath });
            event.target.select();
        });

        html.find<HTMLInputElement>("input[data-property]").on("blur", (event) => {
            const $input = $(event.target);
            $input.removeAttr("name").removeAttr("style").attr({ type: "text" });
            const propertyPath = $input.attr("data-property") ?? "";
            const preparedValue = getProperty(this.actor.data, propertyPath);
            $input.val(preparedValue);
        });

        // General handler for embedded item updates
        const selectors = "input[data-item-id][data-item-property], select[data-item-id][data-item-property]";
        html.find(selectors).on("change", (event) => {
            const $target = $(event.target);

            const { itemId, itemProperty } = event.target.dataset;
            if (!itemId || !itemProperty) return;

            const value = (() => {
                const value = $(event.target).val();
                if (typeof value === "undefined" || value === null) {
                    return value;
                }

                const dataType =
                    $target.attr("data-dtype") ??
                    ($target.attr("type") === "checkbox"
                        ? "Boolean"
                        : ["number", "range"].includes($target.attr("type") ?? "")
                        ? "Number"
                        : "String");

                switch (dataType) {
                    case "Boolean":
                        return typeof value === "boolean" ? value : value === "true";
                    case "Number":
                        return Number(value);
                    case "String":
                        return String(value);
                    default:
                        return value;
                }
            })();

            this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, [itemProperty]: value }]);
        });

        // Roll skill checks
        html.find(".skill-name.rollable, .skill-score.rollable").on("click", (event) => {
            const skills: Record<string, Rollable | undefined> = this.actor.data.data.skills;
            const key = event.currentTarget.parentElement?.getAttribute("data-skill") ?? "";
            const skill = skills[key];
            if (skill) {
                const longForms: Record<string, string | undefined> = SKILL_DICTIONARY;
                const options = this.actor.getRollOptions(["all", "skill-check", longForms[key] ?? key]);
                skill.roll({ event, options });
            }
        });

        // Roll recovery flat check when Dying
        html.find(".recoveryCheck.rollable").on("click", (event) => {
            this.actor.rollRecovery(event);
        });

        // strikes
        const $strikesList = html.find("ol.strikes-list");

        $strikesList.find('button[data-action="strike-damage"]').on("click", (event) => {
            if (!["character", "npc"].includes(this.actor.data.type)) {
                throw ErrorPF2e("This sheet only works for characters and NPCs");
            }
            this.getStrikeFromDOM(event.currentTarget)?.damage?.({ event });
        });

        $strikesList.find('button[data-action="strike-critical"]').on("click", (event) => {
            if (!["character", "npc"].includes(this.actor.data.type)) {
                throw Error("This sheet only works for characters and NPCs");
            }
            this.getStrikeFromDOM(event.currentTarget)?.critical?.({ event });
        });

        html.find(".spell-attack").on("click", (event) => {
            if (!["character"].includes(this.actor.data.type)) {
                throw ErrorPF2e("This sheet only works for characters");
            }
            const index = $(event.currentTarget).closest("[data-container-id]").data("containerId");
            const entry = this.actor.spellcasting.get(index);
            if (entry) {
                entry.statistic.check.roll({ event, modifiers: [] });
            }
        });

        // for spellcasting checks
        html.find(".spellcasting.rollable").on("click", (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).parents(".item-container").attr("data-container-id") ?? "";
            const item = this.actor.items.get(itemId);
            if (item) {
                item.rollSpellcastingEntryCheck(event);
            }
        });

        // Casting spells and consuming slots
        html.find(".cast-spell-button").on("click", (event) => {
            const $spellEl = $(event.currentTarget).closest(".item");
            const { itemId, spellLvl, slotId, entryId } = $spellEl.data();
            const entry = this.actor.spellcasting.get(entryId);
            if (!entry) {
                console.warn("PF2E System | Failed to load spellcasting entry");
                return;
            }

            const spell = entry.spells.get(itemId);
            if (!spell) {
                console.warn("PF2E System | Failed to load spell");
                return;
            }

            entry.cast(spell, { slot: slotId, level: spellLvl });
        });

        const attackSelectors = '.item-image[data-action="strike-attack"], button[data-action="strike-attack"]';
        $strikesList.find(attackSelectors).on("click", (event) => {
            if (!("actions" in this.actor.data.data)) throw Error("Strikes are not supported on this actor");
            const strike = this.getStrikeFromDOM(event.currentTarget);
            if (!strike) return;
            const variantIndex = $(event.currentTarget).attr("data-variant-index");

            const ammo = (() => {
                const fromMeleeWeapon = strike.weapon instanceof WeaponPF2e && strike.weapon.isMelee;
                if (!strike.selectedAmmoId || fromMeleeWeapon) return null;
                const ammo = this.actor.items.get(strike.selectedAmmoId ?? "");
                return ammo instanceof ConsumablePF2e ? ammo : null;
            })();
            if (ammo && ammo.quantity < 1) {
                ui.notifications.error(game.i18n.localize("PF2E.ErrorMessage.NotEnoughAmmo"));
                return;
            }

            strike.variants[Number(variantIndex)]?.roll({ event, callback: () => ammo?.consume() });
        });

        // We can't use form submission for these updates since duplicates force array updates.
        // We'll have to move focus points to the top of the sheet to remove this
        html.find(".focus-pool").on("change", (evt) =>
            this.actor.update({ "data.resources.focus.max": $(evt.target).val() })
        );

        html.find(".spell-list .focus-points").on("click contextmenu", (event) => {
            if (!(this.actor.data.type === "character" || this.actor.data.type === "npc")) return;

            const change = event.type === "click" ? 1 : -1;
            const focusPool = this.actor.data.data.resources.focus;
            const points = Math.clamped((focusPool?.value ?? 0) + change, 0, focusPool?.max ?? 0);
            this.actor.update({ "data.resources.focus.value": points });
        });

        html.find(".toggle-signature-spell").on("click", (event) => {
            this.onToggleSignatureSpell(event);
        });
    }

    protected getStrikeFromDOM(target: HTMLElement): CharacterStrike | NPCStrike | null {
        const $target = $(target);
        const actionIndex = $target.closest("[data-action-index]").attr("data-action-index");
        const rootAction = this.actor.data.data.actions?.[Number(actionIndex)];
        if (!rootAction) return null;

        const isMeleeUsage = $target.closest('div[data-action="melee-usage"]').length === 1;
        return isMeleeUsage && rootAction?.meleeUsage ? rootAction.meleeUsage : rootAction;
    }

    private onToggleSignatureSpell(event: JQuery.ClickEvent): void {
        const { containerId } = event.target.closest(".item-container").dataset;
        const { itemId } = event.target.closest(".item").dataset;

        if (!containerId || !itemId) {
            return;
        }

        const spellcastingEntry = this.actor.items.get(containerId);
        const spell = this.actor.items.get(itemId);

        if (!(spellcastingEntry instanceof SpellcastingEntryPF2e) || !(spell instanceof SpellPF2e)) {
            return;
        }

        const signatureSpells = spellcastingEntry.data.data.signatureSpells?.value ?? [];

        if (!signatureSpells.includes(spell.id)) {
            if (spell.isCantrip || spell.isFocusSpell || spell.isRitual) {
                return;
            }

            const updatedSignatureSpells = signatureSpells.concat([spell.id]);
            spellcastingEntry.update({ "data.signatureSpells.value": updatedSignatureSpells });
        } else {
            const updatedSignatureSpells = signatureSpells.filter((id) => id !== spell.id);
            spellcastingEntry.update({ "data.signatureSpells.value": updatedSignatureSpells });
        }
    }

    // Ensure a minimum of zero hit points and a maximum of the current max
    protected override async _onSubmit(
        event: Event,
        options: OnSubmitFormOptions = {}
    ): Promise<Record<string, unknown>> {
        // Limit HP value to data.attributes.hp.max value
        if (!(event.currentTarget instanceof HTMLInputElement)) {
            return super._onSubmit(event, options);
        }

        const target = event.currentTarget;
        if (target.name === "data.attributes.hp.value") {
            const inputted = Number(target.value) || 0;
            target.value = Math.floor(Math.clamped(inputted, 0, this.actor.hitPoints.max)).toString();
        }

        return super._onSubmit(event, options);
    }
}
