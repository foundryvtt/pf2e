import type { NPCPF2e } from "@actor";
import { CreatureSheetPF2e, type CreatureSheetData } from "@actor/creature/sheet.ts";
import { Modifier } from "@actor/modifiers.ts";
import { NPCSkillsEditor } from "@actor/npc/skills-editor.ts";
import { SheetClickActionHandlers } from "@actor/sheet/base.ts";
import { createAbilityViewData } from "@actor/sheet/helpers.ts";
import { RecallKnowledgePopup } from "@actor/sheet/popups/recall-knowledge-popup.ts";
import { ATTRIBUTE_ABBREVIATIONS, SAVE_TYPES } from "@actor/values.ts";
import type { ActorSheetOptions } from "@client/appv1/sheets/actor-sheet.d.mts";
import { createNPCAttackTraitsAndTags, createTagifyTraits, eventToRollParams } from "@module/sheet/helpers.ts";
import type { UserPF2e } from "@module/user/document.ts";
import { DicePF2e } from "@scripts/dice.ts";
import type { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import type { StatisticRollParameters } from "@system/statistic/index.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, localizeList, setHasElement, sortLabeledRecord } from "@util";
import { tagify } from "@util/tags.ts";
import * as R from "remeda";
import { NPCConfig } from "./config.ts";
import {
    NPCActionSheetData,
    NPCIdentificationSheetData,
    NPCSheetData,
    NPCSpellcastingSheetData,
    NPCStrikeSheetData,
    NPCSystemSheetData,
} from "./types.ts";

abstract class AbstractNPCSheet extends CreatureSheetPF2e<NPCPF2e> {
    protected readonly actorConfigClass = NPCConfig;

    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        options.classes.push("pf2e", "npc");

        return {
            ...options,
            scrollY: [".sidebar"],
        };
    }

    /**
     * Prepares items in the actor for easier access during sheet rendering.
     * @param sheetData Data from the actor associated to this sheet.
     */
    override async prepareItems(sheetData: NPCSheetData): Promise<void> {
        this.#prepareSkills(sheetData.data);
        this.#prepareSaves(sheetData.data);
    }

    override async getData(options?: Partial<ActorSheetOptions>): Promise<NPCSheetData> {
        const sheetData = (await super.getData(options)) as PrePrepSheetData;

        const rollData = this.actor.getRollData();
        sheetData.enrichedContent.publicNotes = await TextEditorPF2e.enrichHTML(sheetData.data.details.publicNotes, {
            rollData,
            secrets: this.actor.isOwner,
        });
        sheetData.enrichedContent.privateNotes = await TextEditorPF2e.enrichHTML(sheetData.data.details.privateNotes, {
            rollData,
        });

        sheetData.traitTagifyData = createTagifyTraits(this.actor.system.traits.value, {
            sourceTraits: this.actor._source.system.traits.value,
            record: CONFIG.PF2E.creatureTraits,
        });

        const mythicResource = this.actor.getResource("mythic-points");
        if (mythicResource?.max) {
            sheetData.specialResources.unshift(mythicResource);
        }

        return sheetData as NPCSheetData;
    }

    #prepareSkills(sheetSystemData: NPCSystemSheetData): void {
        for (const skill of Object.values(sheetSystemData.skills)) {
            skill.adjustedHigher = skill.value > Number(skill.base);
            skill.adjustedLower = skill.value < Number(skill.base);
        }
        sheetSystemData.skills = sortLabeledRecord(sheetSystemData.skills);
    }

    #prepareSaves(systemData: NPCSystemSheetData): void {
        for (const saveType of SAVE_TYPES) {
            const save = systemData.saves[saveType];
            save.labelShort = game.i18n.localize(`PF2E.Saves${saveType.titleCase()}Short`);
            save.adjustedHigher = save.totalModifier > Number(save.base);
            save.adjustedLower = save.totalModifier < Number(save.base);
        }
    }

    /** Players can view the sheets of lootable NPCs. */
    protected override _canUserView(user: UserPF2e): boolean {
        return super._canUserView(user) || this.isLootSheet;
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Tagify the traits selection
        const traitsEl = htmlQuery<HTMLTagifyTagsElement>(html, 'tagify-tags[name="system.traits.value"]');
        tagify(traitsEl, { whitelist: CONFIG.PF2E.creatureTraits });
    }

    protected override activateClickListener(html: HTMLElement): SheetClickActionHandlers {
        const handlers = super.activateClickListener(html);

        const baseRollCheck = handlers["roll-check"]!;
        handlers["roll-check"] = (event, anchor) => {
            const variantIdx = "variant" in anchor.dataset ? Number(anchor.dataset.variant) : null;
            if (variantIdx === null) return baseRollCheck(event, anchor);

            const statisticSlug = htmlClosest(anchor, "[data-statistic]")?.dataset.statistic ?? "";
            const skill = this.actor.system.skills[statisticSlug];
            const variant = skill?.special?.at(variantIdx);
            if (!variant) return baseRollCheck(event, anchor);

            const statistic = this.actor.getStatistic(statisticSlug);
            const args: StatisticRollParameters = {
                ...eventToRollParams(event, { type: "check" }),
                modifiers: [
                    new Modifier({
                        slug: "variant",
                        label: variant.label,
                        modifier: variant.base - skill.base,
                    }),
                ],
            };
            if (anchor.dataset.secret !== undefined) {
                args.rollMode = game.user.isGM ? "gmroll" : "blindroll";
            }
            return statistic?.roll(args);
        };

        handlers["edit-skills"] = () => {
            new NPCSkillsEditor(this.actor).render(true);
        };

        return handlers;
    }
}

class NPCSheetPF2e extends AbstractNPCSheet {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        options.scrollY.push(".inventory-list", ".tab:not(.inventory)");

        return {
            ...options,
            width: 650,
            height: 680,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
        };
    }

    /** Show either the actual NPC sheet or a briefened lootable version if the NPC is dead */
    override get template(): string {
        if (this.isLootSheet) {
            return "systems/pf2e/templates/actors/npc/loot-sheet.hbs";
        } else if (this.actor.limited) {
            return "systems/pf2e/templates/actors/limited/npc-sheet.hbs";
        }
        return "systems/pf2e/templates/actors/npc/sheet.hbs";
    }

    /** Use the token name as the title if showing a lootable NPC sheet */
    override get title(): string {
        if (this.isLootSheet || this.actor.limited) {
            const tokenSetsNameVisibility = game.pf2e.settings.tokens.nameVisibility;
            const canSeeName = !tokenSetsNameVisibility || !this.token || this.token.playersCanSeeName;
            const actorName = canSeeName ? (this.token?.name ?? this.actor.name) : "";

            if (this.actor.isDead) {
                return `${actorName} [${game.i18n.localize("PF2E.NPC.Dead")}]`;
            } else {
                return actorName;
            }
        }
        return super.title;
    }

    override async getData(options?: Partial<ActorSheetOptions>): Promise<NPCSheetData> {
        const sheetData = (await super.getData(options)) as PrePrepSheetData;
        const { actor, token } = this;
        if (this.isLootSheet || actor.limited) {
            const tokenSetsNameVisibility = game.pf2e.settings.tokens.nameVisibility;
            const canSeeName = !tokenSetsNameVisibility || !token || token.playersCanSeeName;
            const actorName = canSeeName ? (token?.name ?? actor.name) : "";
            sheetData.actor.name = actorName;
        }

        // Identification DCs
        sheetData.identificationDCs = ((): NPCIdentificationSheetData => {
            const data = actor.identificationDCs;
            const skills =
                data.skills.length > 0
                    ? localizeList(data.skills.map((s) => game.i18n.localize(CONFIG.PF2E.skills[s].label)))
                    : null;
            return {
                standard: skills
                    ? game.i18n.format("PF2E.Actor.NPC.Identification.Skills.Label", {
                          skills,
                          dc: data.standard.dc,
                          adjustment: game.i18n.localize(CONFIG.PF2E.dcAdjustments[data.standard.start]),
                      })
                    : null,
                lore: game.i18n.format("PF2E.Actor.NPC.Identification.Lore.Label", {
                    dc1: data.lore[0].dc,
                    adjustment1: game.i18n.localize(CONFIG.PF2E.dcAdjustments[data.lore[0].start]),
                    dc2: data.lore[1].dc,
                    adjustment2: game.i18n.localize(CONFIG.PF2E.dcAdjustments[data.lore[1].start]),
                }),
            };
        })();

        // Shield
        const heldShield = actor.heldShield;
        const actorShieldData = sheetData.data.attributes.shield;
        sheetData.hasShield = !!heldShield || actorShieldData.hp.max > 0;

        const { isElite, isWeak } = actor;
        sheetData.isElite = isElite;
        sheetData.isWeak = isWeak;
        sheetData.notAdjusted = !isElite && !isWeak;

        if (isElite) {
            sheetData.eliteState = "active";
            sheetData.weakState = "inactive";
        } else if (isWeak) {
            sheetData.eliteState = "inactive";
            sheetData.weakState = "active";
        } else {
            sheetData.eliteState = "inactive";
            sheetData.weakState = "inactive";
        }

        const actorSource = actor._source;
        const level = sheetData.data.details.level;
        level.adjustedHigher = level.value > Number(level.base);
        level.adjustedLower = level.value < Number(level.base);

        const { ac, hp, hardness } = sheetData.data.attributes;
        const perception = sheetData.data.perception;
        const sourceAttributes = actorSource.system.attributes;
        ac.adjustedHigher = ac.value > sourceAttributes.ac.value;
        ac.adjustedLower = ac.value < sourceAttributes.ac.value;
        hp.adjustedHigher = hp.max > sourceAttributes.hp.max;
        hp.adjustedLower = hp.max < sourceAttributes.hp.max;
        perception.adjustedHigher = perception.totalModifier > actorSource.system.perception.mod;
        perception.adjustedLower = perception.totalModifier < actorSource.system.perception.mod;
        const speeds = sheetData.data.movement.speeds;
        const noLandTravel = R.omit(speeds, ["land", "travel"]);
        sheetData.speeds = {
            land: {
                label: speeds.land.label,
                value: speeds.land.value,
                details: sourceAttributes.speed.details,
                adjustedHigher: speeds.land.value > sourceAttributes.speed.value,
                adjustedLower: sourceAttributes.speed.value < speeds.land.value,
            },
            ...R.mapValues(noLandTravel, (speed, type) => {
                if (!speed) return null;
                const legacyValue = sourceAttributes.speed.otherSpeeds.find((s) => s.type === type)?.value ?? NaN;
                const adjustedHigher = speed.value > legacyValue;
                const adjustedLower = speed.value < legacyValue;
                return { label: speed.label, value: speed.value, adjustedHigher, adjustedLower };
            }),
        };
        const traits = actor.system.traits.value;
        sheetData.hasHardness = traits.includes("construct") || (Number(hardness?.value) || 0) > 0;
        sheetData.configLootableNpc = game.settings.get("pf2e", "automation.lootableNPCs");

        return sheetData as NPCSheetData;
    }

    override async prepareItems(sheetData: NPCSheetData): Promise<void> {
        super.prepareItems(sheetData);
        await this.#prepareActions(sheetData);
        sheetData.spellcastingEntries = await this.prepareSpellcasting();
    }

    protected override async prepareSpellcasting(): Promise<NPCSpellcastingSheetData[]> {
        const entries: NPCSpellcastingSheetData[] = await super.prepareSpellcasting();
        for (const entry of entries) {
            const entryItem = this.actor.items.get(entry.id);
            if (!entryItem?.isOfType("spellcastingEntry")) continue;
            entry.adjustedHigher = entry.statistic
                ? {
                      dc: entry.statistic.dc.value > entryItem._source.system.spelldc.dc,
                      mod: entry.statistic.check.mod > entryItem._source.system.spelldc.value,
                  }
                : { dc: false, mod: false };
            entry.adjustedLower = entry.statistic
                ? {
                      dc: entry.statistic.dc.value < entryItem._source.system.spelldc.dc,
                      mod: entry.statistic.check.mod < entryItem._source.system.spelldc.value,
                  }
                : { dc: false, mod: false };
        }

        return entries;
    }

    /**
     * Prepares the actions list to be accessible from the sheet.
     * @param sheetData Data of the actor to be shown in the sheet.
     */
    async #prepareActions(sheetData: NPCSheetData): Promise<void> {
        const listFormatter = game.i18n.getListFormatter({ style: "long", type: "conjunction" });
        const attacks: NPCStrikeSheetData[] = await Promise.all(
            sheetData.data.actions.map(async (attack) => {
                const item = attack.item;
                const rollData = item.getRollData();
                const description = await TextEditorPF2e.enrichHTML(item.description, { rollData });
                const breakdown = attack.type === "strike" ? attack.breakdown : attack.statistic.dc.breakdown;
                const damageFormula = item.dealsDamage ? String(await attack.damage?.({ getFormula: true })) : null;
                const effects = ((): string => {
                    const list = attack.additionalEffects.map((e) => game.i18n.localize(e.label));
                    return listFormatter.format(list);
                })();

                return {
                    ...R.pick(item, ["id", "name", "sort"]),
                    attackType: attack.attackRollType,
                    glyph: attack.glyph,
                    variants: attack.variants.map((v, idx) => ({
                        label: v.label,
                        breakdown: idx === 0 ? breakdown : null,
                    })),
                    traitsAndTags: createNPCAttackTraitsAndTags(item),
                    effects,
                    description,
                    damageFormula,
                };
            }),
        );
        const actions: NPCActionSheetData = {
            passive: { label: game.i18n.localize("PF2E.ActionTypePassive"), actions: [] },
            active: { label: game.i18n.localize("PF2E.ActionTypeAction"), actions: [] },
        };

        // By default when sort is tied, free comes before reaction which comes before action
        const baseOrder = ["free", "reaction", "action"];
        const abilities = R.sortBy(
            this.actor.itemTypes.action,
            (a) => a.sort,
            (a) => baseOrder.indexOf(a.actionCost?.type ?? "action"),
        );
        for (const item of abilities) {
            const actionGroup = item.actionCost ? "active" : "passive";
            actions[actionGroup].actions.push(createAbilityViewData(item));
        }
        sheetData.attacks = attacks;
        sheetData.actions = actions;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];
        // Don't subscribe to edit buttons it the sheet is NOT editable
        if (!this.isEditable) return;

        // Handle spellcastingEntry attack and DC updates
        const selector = [".attack-input", ".dc-input", ".key-attribute select"]
            .map((s) => `li[data-spellcasting-entry] ${s}`)
            .join(", ");
        for (const element of htmlQueryAll<HTMLInputElement | HTMLSelectElement>(html, selector)) {
            element.addEventListener("change", (event) => {
                event.preventDefault();
                this.#onChangeSpellcastingEntry(element);
            });
        }
    }

    protected override activateClickListener(html: HTMLElement): SheetClickActionHandlers {
        const handlers = super.activateClickListener(html);

        handlers["adjust-elite-weak"] = (event): Promise<unknown> | void => {
            const adjustment = htmlClosest(event.target, "[data-adjustment]")?.dataset.adjustment;
            if (adjustment === "elite" || adjustment === "weak") {
                const alreadyHasAdjustment = adjustment === this.actor.system.attributes.adjustment;
                return this.actor.applyAdjustment(alreadyHasAdjustment ? null : adjustment);
            }
        };

        handlers["open-recall-breakdown"] = () => {
            return new RecallKnowledgePopup({}, this.actor.identificationDCs).render(true);
        };

        handlers["roll-attribute"] = (event, anchor) => {
            const attribute = anchor?.parentElement?.dataset.attribute;
            if (!setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute)) return;
            const modifier = this.actor.system.abilities[attribute].mod;
            const parts = ["@modifier"];
            const title = game.i18n.localize(`PF2E.AbilityCheck.${attribute}`);
            const data = { modifier };
            const speaker = ChatMessage.getSpeaker({ token: this.token, actor: this.actor });

            return DicePF2e.d20Roll({ event, parts, data, title, speaker });
        };

        if (this.isEditable) {
            handlers["generate-attack"] = async (event) => {
                const actor = this.actor;
                const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId ?? "";
                const item = actor.items.get(itemId, { strict: true });
                if (!item.isOfType("weapon")) return;

                // Get confirmation from the user before replacing existing generated attacks
                const existing = actor.itemTypes.melee
                    .filter((m) => m.flags.pf2e.linkedWeapon === itemId)
                    .map((m) => m.id);
                if (existing.length > 0) {
                    const proceed = await foundry.applications.api.DialogV2.confirm({
                        window: { title: "PF2E.Actor.NPC.GenerateAttack.Confirm.Title", icon: "fa-solid hammer-crash" },
                        content: game.i18n.localize("PF2E.Actor.NPC.GenerateAttack.Confirm.Content"),
                        no: { default: true },
                    });
                    if (proceed) {
                        await actor.deleteEmbeddedDocuments("Item", existing, { render: false });
                    } else {
                        return;
                    }
                }

                const attacks = item.toNPCAttacks().map((a) => a.toObject());
                await actor.createEmbeddedDocuments("Item", attacks);
                ui.notifications.info(
                    game.i18n.format("PF2E.Actor.NPC.GenerateAttack.Notification", {
                        attack: attacks.at(0)?.name ?? "",
                    }),
                );
            };
        }

        return handlers;
    }

    async #onChangeSpellcastingEntry(element: HTMLInputElement | HTMLSelectElement): Promise<void> {
        const itemId = htmlClosest(element, "li[data-spellcasting-entry]")?.dataset.itemId;
        const spellcastingEntry = this.actor.items.get(itemId, { strict: true });
        const key = element.dataset.baseProperty?.replace(/data\.items\.\d+\./, "") ?? "";
        const value =
            element.classList.contains("focus-points") || element.classList.contains("focus-pool")
                ? Math.min(Number(element.value) || 0, 3)
                : element.nodeName === "SELECT"
                  ? element.value
                  : Number(element.value) || 0;
        await spellcastingEntry.update({ [key]: value });
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // do not update max health if the value has not actually changed
        if (this.actor.isElite || this.actor.isWeak) {
            const { max } = this.actor.system.attributes.hp;
            if (formData["system.attributes.hp.max"] === max) {
                delete formData["system.attributes.hp.max"];
            }
        }

        // update shield hp
        const shield = this.actor.heldShield;
        if (shield && Number.isInteger(formData["system.attributes.shield.value"])) {
            await shield.update({
                "system.hp.value": formData["system.attributes.shield.value"],
            });
        }

        return super._updateObject(event, formData);
    }
}

class SimpleNPCSheet extends AbstractNPCSheet {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        options.classes.push("simple");

        return {
            ...options,
            width: 650,
            height: 420,
            scrollY: [".sheet-body"],
            template: "systems/pf2e/templates/actors/npc/simple-sheet.hbs",
        };
    }
}

type PrePrepSheetData = Partial<NPCSheetData> & CreatureSheetData<NPCPF2e>;

export { AbstractNPCSheet, NPCSheetPF2e, SimpleNPCSheet };
