import { NPCPF2e } from "@actor";
import { Abilities, AbilityData, SkillAbbreviation } from "@actor/creature/data.ts";
import { CreatureSheetPF2e } from "@actor/creature/sheet.ts";
import { CreatureSheetData } from "@actor/creature/types.ts";
import { ALIGNMENT_TRAITS } from "@actor/creature/values.ts";
import { NPCSkillsEditor } from "@actor/npc/skills-editor.ts";
import { RecallKnowledgePopup } from "@actor/sheet/popups/recall-knowledge-popup.ts";
import { AbilityString, MovementType } from "@actor/types.ts";
import { ABILITY_ABBREVIATIONS, MOVEMENT_TYPES, SAVE_TYPES, SKILL_DICTIONARY } from "@actor/values.ts";
import { createTagifyTraits } from "@module/sheet/helpers.ts";
import { DicePF2e } from "@scripts/dice.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import {
    getActionGlyph,
    getActionIcon,
    htmlQuery,
    htmlQueryAll,
    localizeList,
    objectHasKey,
    setHasElement,
    tagify,
} from "@util";
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
        return {
            ...options,
            classes: [...options.classes, "pf2e", "npc"],
            scrollY: [".side-bar"],
        };
    }

    /**
     * Prepares items in the actor for easier access during sheet rendering.
     * @param sheetData Data from the actor associated to this sheet.
     */
    override async prepareItems(sheetData: NPCSheetData<TActor>): Promise<void> {
        this.#prepareAbilities(sheetData.data.abilities);
        this.#prepareAlignment(sheetData.data);
        this.#prepareSkills(sheetData.data);
        this.#prepareSaves(sheetData.data);
        sheetData.effectItems = this.actor.itemTypes.effect;
    }

    override async getData(): Promise<NPCSheetData<TActor>> {
        const sheetData = (await super.getData()) as PrePrepSheetData<TActor>;

        // Filter out alignment traits for sheet presentation purposes
        const alignmentTraits: Set<string> = ALIGNMENT_TRAITS;
        const actorTraits = sheetData.data.traits;
        actorTraits.value = actorTraits.value.filter((t: string) => !alignmentTraits.has(t));

        const rollData = this.actor.getRollData();
        sheetData.enrichedContent.publicNotes = await TextEditor.enrichHTML(sheetData.data.details.publicNotes, {
            rollData,
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

    #prepareAbilities(abilities: Abilities): void {
        for (const key of ABILITY_ABBREVIATIONS) {
            interface SheetAbilityData extends AbilityData {
                localizedCode?: string;
                localizedName?: string;
            }
            const data: SheetAbilityData = abilities[key];
            const localizedCode = game.i18n.localize(`PF2E.AbilityId.${key}`);
            const nameKey = CONFIG.PF2E.abilities[key];
            const localizedName = game.i18n.localize(nameKey);

            data.localizedCode = localizedCode;
            data.localizedName = localizedName;
        }
    }

    #prepareAlignment(sheetSystemData: NPCSystemSheetData): void {
        const alignmentCode = sheetSystemData.details.alignment.value;
        const localizedName = game.i18n.localize(`PF2E.Alignment${alignmentCode}`);

        sheetSystemData.details.alignment.localizedName = localizedName;
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

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        // Tagify the traits selection
        const traitsEl = htmlQuery<HTMLInputElement>(html, 'input[name="system.traits.value"]');
        tagify(traitsEl, { whitelist: CONFIG.PF2E.monsterTraits });

        // Subscribe to roll events
        const rollables = ["a.rollable", ".item-icon.rollable"].join(", ");
        for (const rollable of htmlQueryAll(html, rollables)) {
            rollable.addEventListener("click", (event) => {
                this.#onClickRollable(rollable, event);
            });
        }

        if (this.isEditable) {
            htmlQuery(html, ".skills-edit")?.addEventListener("click", () => {
                new NPCSkillsEditor(this.actor).render(true);
            });
        }
    }

    async #onClickRollable(link: HTMLElement, event: MouseEvent): Promise<void> {
        const { attribute, save, skill } = link?.parentElement?.dataset ?? {};
        const rollParams = eventToRollParams(event);

        if (attribute) {
            if (attribute === "perception") {
                await this.actor.perception.roll(eventToRollParams(event));
            } else if (setHasElement(ABILITY_ABBREVIATIONS, attribute)) {
                this.#rollAbility(event, attribute);
            }
        } else if (skill) {
            const extraRollOptions = link.dataset.options
                ?.split(",")
                .map((o) => o.trim())
                .filter((o) => !!o);

            const key = objectHasKey(SKILL_DICTIONARY, skill) ? SKILL_DICTIONARY[skill] : skill;
            await this.actor.skills[key]?.check.roll({ ...rollParams, extraRollOptions });
        } else if (objectHasKey(this.actor.saves, save)) {
            await this.actor.saves[save].check.roll(rollParams);
        }
    }

    async #rollAbility(event: MouseEvent, abilityId: AbilityString): Promise<void> {
        const bonus = this.actor.system.abilities[abilityId].mod;
        const parts = ["@bonus"];
        const title = game.i18n.localize(`PF2E.AbilityCheck.${abilityId}`);
        const data = { bonus };
        const speaker = ChatMessage.getSpeaker({ token: this.token, actor: this.actor });

        await DicePF2e.d20Roll({
            event,
            parts,
            data,
            title,
            speaker,
        });
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
            const tokenSetsNameVisibility = game.settings.get("pf2e", "metagame_tokenSetsNameVisibility");
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

    override get isLootSheet(): boolean {
        return this.actor.isLootable && !this.actor.isOwner && this.actor.isLootableBy(game.user);
    }

    override async getData(): Promise<NPCSheetData> {
        const sheetData = (await super.getData()) as PrePrepSheetData;

        // Show the token's name as the actor's name if the user has limited permission or this NPC is dead and lootable
        if (this.actor.limited || this.isLootSheet) {
            sheetData.actor.name = this.actor.token?.name ?? sheetData.actor.name;
        }

        // Filter out alignment traits for sheet presentation purposes
        const alignmentTraits: Set<string> = ALIGNMENT_TRAITS;
        const actorTraits = sheetData.data.traits;
        actorTraits.value = actorTraits.value.filter((t: string) => !alignmentTraits.has(t));

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

        const { level } = sheetData.data.details;
        level.adjustedHigher = level.value > Number(level.base);
        level.adjustedLower = level.value < Number(level.base);
        const { ac, hp, perception, hardness } = sheetData.data.attributes;
        const speedData = sheetData.data.attributes.speed;
        ac.adjustedHigher = ac.value > Number(this.actor._source.system.attributes.ac.value);
        ac.adjustedLower = ac.value < Number(this.actor._source.system.attributes.ac.value);
        hp.adjustedHigher = hp.max > Number(hp.base);
        hp.adjustedLower = hp.max < Number(hp.base);
        perception.adjustedHigher = perception.totalModifier > Number(perception.base);
        perception.adjustedLower = perception.totalModifier < Number(perception.base);
        sheetData.speeds = {
            land: {
                label: speedData.label ?? "",
                value: speedData.total,
                details: speedData.details,
                adjustedHigher: speedData.total > speedData.value,
                adjustedLower: speedData.total < speedData.value,
            },
            ...MOVEMENT_TYPES.filter((t): t is Exclude<MovementType, "land"> => t !== "land").reduce((speeds, type) => {
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
            }, {} as Record<Exclude<MovementType, "land">, NPCSpeedSheetData | null>),
        };

        sheetData.hasHardness = this.actor.traits.has("construct") || (Number(hardness?.value) || 0) > 0;
        sheetData.configLootableNpc = game.settings.get("pf2e", "automation.lootableNPCs");
        sheetData.languageDetails = this.actor.system.traits.languages.custom.trim();

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
            free: { label: game.i18n.localize("PF2E.ActionTypeFree"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionTypeReaction"), actions: [] },
            action: { label: game.i18n.localize("PF2E.ActionTypeAction"), actions: [] },
        };

        for (const item of this.actor.itemTypes.action) {
            const itemData = item.toObject(false);
            const chatData = await item.getChatData();
            const traits = chatData.traits ?? [];

            const actionType = item.actionCost?.type || "passive";

            const hasAura =
                actionType === "passive" &&
                (item.system.traits.value.includes("aura") || !!item.system.rules.find((r) => r.key === "Aura"));

            if (objectHasKey(actions, actionType)) {
                actions[actionType].actions.push({
                    ...itemData,
                    glyph: getActionGlyph(item.actionCost),
                    imageUrl: getActionIcon(item.actionCost),
                    chatData,
                    traits,
                    hasAura,
                });
            }
        }

        sheetData.actions = actions;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html.get(0)!;

        // Set the inventory tab as active on a loot-sheet rendering.
        if (this.isLootSheet) {
            $html.find(".tab.inventory").addClass("active");
        }

        // Add events for recall knowledge. Does not exist for limited and loot sheets
        const mainPanel = htmlQuery(html, ".tab[data-tab=main]");
        if (mainPanel) {
            // Creature identification
            for (const identificationDC of htmlQueryAll(mainPanel, ".recall-knowledge .identification-skills")) {
                $(identificationDC).tooltipster({ position: "bottom", maxWidth: 350, theme: "crb-hover" });
            }

            htmlQuery(mainPanel, ".recall-knowledge button.breakdown")?.addEventListener("click", () => {
                new RecallKnowledgePopup({}, this.actor.identificationDCs).render(true);
            });
        }

        // Don't subscribe to edit buttons it the sheet is NOT editable
        if (!this.isEditable) return;

        // Adjustments
        $html.find(".adjustment").on("click", (event) => {
            const adjustment = String(event.target.dataset.adjustment);
            if (adjustment === "elite" || adjustment === "weak") {
                const alreadyHasAdjustment = adjustment === this.actor.system.attributes.adjustment;
                this.actor.applyAdjustment(alreadyHasAdjustment ? null : adjustment);
            }
        });

        // Handle spellcastingEntry attack and DC updates
        $html
            .find(".spellcasting-entry")
            .find<HTMLInputElement | HTMLSelectElement>(".attack-input, .dc-input, .ability-score select")
            .on("change", (event) => this.#onChangeSpellcastingEntry(event));

        $html.find(".item-control[data-action=generate-attack]").on("click", async (event) => {
            const { actor } = this;
            const itemId = event.currentTarget.closest<HTMLElement>(".item")?.dataset.itemId ?? "";
            const item = actor.items.get(itemId, { strict: true });
            if (!item.isOfType("weapon")) return;

            // Get confirmation from the user before replacing existing generated attacks
            const existing = actor.itemTypes.melee.filter((m) => m.flags.pf2e.linkedWeapon === itemId).map((m) => m.id);
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
                game.i18n.format("PF2E.Actor.NPC.GenerateAttack.Notification", { attack: attacks.at(0)?.name ?? "" })
            );
        });
    }

    async #onChangeSpellcastingEntry(event: JQuery.ChangeEvent<HTMLInputElement | HTMLSelectElement>): Promise<void> {
        event.preventDefault();

        const $input: JQuery<HTMLInputElement | HTMLSelectElement> = $(event.currentTarget);
        const itemId = $input.closest(".spellcasting-entry").attr("data-container-id") ?? "";
        const key = $input.attr("data-base-property")?.replace(/data\.items\.\d+\./, "") ?? "";
        const value =
            $input.hasClass("focus-points") || $input.hasClass("focus-pool")
                ? Math.min(Number($input.val()), 3)
                : $input.is("select")
                ? String($input.val())
                : Number($input.val());
        await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, [key]: value }]);
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
