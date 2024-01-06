import type { NPCPF2e } from "@actor";
import { SkillAbbreviation } from "@actor/creature/data.ts";
import { CreatureSheetPF2e, type CreatureSheetData } from "@actor/creature/sheet.ts";
import { NPCSkillsEditor } from "@actor/npc/skills-editor.ts";
import { SheetClickActionHandlers } from "@actor/sheet/base.ts";
import { RecallKnowledgePopup } from "@actor/sheet/popups/recall-knowledge-popup.ts";
import { MovementType } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS, MOVEMENT_TYPES, SAVE_TYPES } from "@actor/values.ts";
import { createTagifyTraits } from "@module/sheet/helpers.ts";
import type { UserPF2e } from "@module/user/document.ts";
import { DicePF2e } from "@scripts/dice.ts";
import {
    getActionGlyph,
    getActionIcon,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    localizeList,
    setHasElement,
    tagify,
} from "@util";
import * as R from "remeda";
import { NPCConfig } from "./config.ts";
import { NPCSkillData } from "./data.ts";
import {
    NPCActionSheetData,
    NPCIdentificationSheetData,
    NPCSheetData,
    NPCSkillSheetData,
    NPCSpeedSheetData,
    NPCSpellcastingSheetData,
    NPCStrikeSheetData,
    NPCSystemSheetData,
} from "./types.ts";

abstract class AbstractNPCSheet<TActor extends NPCPF2e> extends CreatureSheetPF2e<TActor> {
    protected readonly actorConfigClass = NPCConfig;

    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        options.classes.push("pf2e", "npc");

        return {
            ...options,
            scrollY: [".sidebar", ".inventory-list"],
        };
    }

    /**
     * Prepares items in the actor for easier access during sheet rendering.
     * @param sheetData Data from the actor associated to this sheet.
     */
    override async prepareItems(sheetData: NPCSheetData<TActor>): Promise<void> {
        this.#prepareSkills(sheetData.data);
        this.#prepareSaves(sheetData.data);
    }

    override async getData(options?: Partial<ActorSheetOptions>): Promise<NPCSheetData<TActor>> {
        const sheetData = (await super.getData(options)) as PrePrepSheetData<TActor>;

        const rollData = this.actor.getRollData();
        sheetData.enrichedContent.publicNotes = await TextEditor.enrichHTML(sheetData.data.details.publicNotes, {
            rollData,
            secrets: this.actor.isOwner,
            async: true,
        });
        sheetData.enrichedContent.privateNotes = await TextEditor.enrichHTML(sheetData.data.details.privateNotes, {
            rollData,
            async: true,
        });

        sheetData.traitTagifyData = createTagifyTraits(this.actor.system.traits.value, {
            sourceTraits: this.actor._source.system.traits.value,
            record: CONFIG.PF2E.creatureTraits,
        });

        return sheetData as NPCSheetData<TActor>;
    }

    #prepareSkills(sheetSystemData: NPCSystemSheetData): void {
        // Prepare a list of skill IDs sorted by their localized name
        // This will help in displaying the skills in alphabetical order in the sheet
        const sortedSkillsIds = Object.keys(sheetSystemData.skills) as SkillAbbreviation[];

        const skills = sheetSystemData.skills;
        for (const shortForm of sortedSkillsIds) {
            const skill = skills[shortForm as SkillAbbreviation];
            skill.adjustedHigher = skill.value > Number(skill.base);
            skill.adjustedLower = skill.value < Number(skill.base);
        }

        sortedSkillsIds.sort((a: SkillAbbreviation, b: SkillAbbreviation) => {
            const skillA = skills[a];
            const skillB = skills[b];

            if (skillA.label < skillB.label) return -1;
            if (skillA.label > skillB.label) return 1;

            return 0;
        });

        const sortedSkills: Record<string, NPCSkillData> = {};

        for (const skillId of sortedSkillsIds) {
            sortedSkills[skillId] = skills[skillId];
        }

        sheetSystemData.sortedSkills = sortedSkills as Record<SkillAbbreviation, NPCSkillSheetData>;
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
        const traitsEl = htmlQuery<HTMLInputElement>(html, 'input[name="system.traits.value"]');
        tagify(traitsEl, { whitelist: CONFIG.PF2E.creatureTraits });
    }
}

class NPCSheetPF2e extends AbstractNPCSheet<NPCPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;

        return {
            ...options,
            width: 650,
            height: 680,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
            scrollY: [...options.scrollY, ".tab.main", ".tab.inventory", ".tab.spells", ".tab.effects", ".tab.notes"],
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
            const actorName = canSeeName ? this.token?.name ?? this.actor.name : "";

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

        // Show the token's name as the actor's name if the user has limited permission or this NPC is dead and lootable
        if (this.actor.limited || this.isLootSheet) {
            sheetData.actor.name = this.actor.token?.name ?? sheetData.actor.name;
        }

        // Identification DCs
        sheetData.identificationDCs = ((): NPCIdentificationSheetData => {
            const data = this.actor.identificationDCs;
            const skills =
                data.skills.length > 0
                    ? localizeList(data.skills.map((s) => game.i18n.localize(CONFIG.PF2E.skillList[s])))
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
        const { heldShield } = this.actor;
        const actorShieldData = sheetData.data.attributes.shield;
        sheetData.hasShield = !!heldShield || actorShieldData.hp.max > 0;

        const isElite = this.actor.isElite;
        const isWeak = this.actor.isWeak;
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

        // Data for lootable token-actor sheets
        if (this.isLootSheet) {
            sheetData.actor.name = this.token?.name ?? this.actor.name;
        }

        const actorSource = this.actor._source;
        const level = sheetData.data.details.level;
        level.adjustedHigher = level.value > Number(level.base);
        level.adjustedLower = level.value < Number(level.base);

        const { ac, hp, hardness } = sheetData.data.attributes;
        const perception = sheetData.data.perception;
        const speedData = sheetData.data.attributes.speed;
        const sourceAttributes = actorSource.system.attributes;
        ac.adjustedHigher = ac.value > sourceAttributes.ac.value;
        ac.adjustedLower = ac.value < sourceAttributes.ac.value;
        hp.adjustedHigher = hp.max > sourceAttributes.hp.max;
        hp.adjustedLower = hp.max < sourceAttributes.hp.max;
        perception.adjustedHigher = perception.totalModifier > actorSource.system.perception.mod;
        perception.adjustedLower = perception.totalModifier < actorSource.system.perception.mod;
        sheetData.speeds = {
            land: {
                label: speedData.label ?? "",
                value: speedData.total,
                details: speedData.details,
                adjustedHigher: speedData.total > speedData.value,
                adjustedLower: speedData.total < speedData.value,
            },
            ...MOVEMENT_TYPES.filter((t): t is Exclude<MovementType, "land"> => t !== "land").reduce(
                (speeds, type) => {
                    const speed = speedData.otherSpeeds.find((s) => s.type === type);
                    return {
                        ...speeds,
                        [type]: speed
                            ? {
                                  label: speed.label,
                                  value: speed.total,
                                  adjustedHigher: typeof speed.total === "number" && speed.total > speed.value,
                                  adjustedLower: typeof speed.total === "number" && speed.total < speed.value,
                              }
                            : null,
                    };
                },
                {} as Record<Exclude<MovementType, "land">, NPCSpeedSheetData | null>,
            ),
        };

        sheetData.hasHardness = this.actor.traits.has("construct") || (Number(hardness?.value) || 0) > 0;
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
        // Enrich strike descriptions
        const attacks: NPCStrikeSheetData[] = sheetData.data.actions;
        const actorRollData = this.actor.getRollData();
        for (const attack of attacks) {
            if (attack.description.length > 0) {
                const itemRollData = attack.item.getRollData();
                attack.description = await TextEditor.enrichHTML(attack.description, {
                    rollData: { ...actorRollData, ...itemRollData },
                    async: true,
                });
            }
            attack.damageFormula = String(await attack.damage?.({ getFormula: true }));
        }

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
            const itemData = item.toObject(false);
            const chatData = await item.getChatData();
            const traits = chatData.traits ?? [];

            const actionGroup = !item.actionCost ? "passive" : "active";

            const hasAura =
                actionGroup === "passive" &&
                (item.system.traits.value.includes("aura") || !!item.system.rules.find((r) => r.key === "Aura"));

            actions[actionGroup].actions.push({
                ...itemData,
                glyph: getActionGlyph(item.actionCost),
                imageUrl: getActionIcon(item.actionCost),
                chatData,
                traits,
                hasAura,
            });
        }

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

        handlers["adjust-elite-weak"] = (event) => {
            const adjustment = htmlClosest(event.target, "[data-adjustment]")?.dataset.adjustment;
            if (adjustment === "elite" || adjustment === "weak") {
                const alreadyHasAdjustment = adjustment === this.actor.system.attributes.adjustment;
                this.actor.applyAdjustment(alreadyHasAdjustment ? null : adjustment);
            }
        };

        handlers["open-recall-breakdown"] = () => {
            new RecallKnowledgePopup({}, this.actor.identificationDCs).render(true);
        };

        handlers["roll-attribute"] = async (event, anchor) => {
            const attribute = anchor?.parentElement?.dataset.attribute;
            if (!setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute)) return;
            const modifier = this.actor.system.abilities[attribute].mod;
            const parts = ["@modifier"];
            const title = game.i18n.localize(`PF2E.AbilityCheck.${attribute}`);
            const data = { modifier };
            const speaker = ChatMessage.getSpeaker({ token: this.token, actor: this.actor });

            await DicePF2e.d20Roll({ event, parts, data, title, speaker });
        };

        if (this.isEditable) {
            handlers["edit-skills"] = () => {
                new NPCSkillsEditor(this.actor).render(true);
            };

            handlers["generate-attack"] = async (event) => {
                const { actor } = this;
                const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId ?? "";
                const item = actor.items.get(itemId, { strict: true });
                if (!item.isOfType("weapon")) return;

                // Get confirmation from the user before replacing existing generated attacks
                const existing = actor.itemTypes.melee
                    .filter((m) => m.flags.pf2e.linkedWeapon === itemId)
                    .map((m) => m.id);
                if (existing.length > 0) {
                    const proceed = await Dialog.confirm({
                        title: game.i18n.localize("PF2E.Actor.NPC.GenerateAttack.Confirm.Title"),
                        content: game.i18n.localize("PF2E.Actor.NPC.GenerateAttack.Confirm.Content"),
                        defaultYes: false,
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

class SimpleNPCSheet extends AbstractNPCSheet<NPCPF2e> {
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

type PrePrepSheetData<TActor extends NPCPF2e = NPCPF2e> = Partial<NPCSheetData> & CreatureSheetData<TActor>;

export { AbstractNPCSheet, NPCSheetPF2e, SimpleNPCSheet };
