import { CreatureSheetPF2e } from "../creature/sheet";
import { DicePF2e } from "@scripts/dice";
import { ABILITY_ABBREVIATIONS, SAVE_TYPES, SKILL_DICTIONARY } from "@actor/data/values";
import { NPCSkillsEditor } from "@actor/npc/skills-editor";
import { NPCPF2e } from "@actor/index";
import { identifyCreature, IdentifyCreatureData } from "@module/recall-knowledge";
import { RecallKnowledgePopup } from "../sheet/popups/recall-knowledge-popup";
import { PhysicalItemPF2e } from "@item/physical";
import { ConditionPF2e, SpellcastingEntryPF2e } from "@item";
import { EffectData } from "@item/data";
import { ErrorPF2e, getActionGlyph, getActionIcon, objectHasKey, setHasElement } from "@util";
import { Size } from "@module/data";
import { NPCSkillData } from "./data";
import { Abilities, AbilityData, SkillAbbreviation } from "@actor/creature/data";
import { AbilityString } from "@actor/data/base";
import { eventToRollParams } from "@scripts/sheet-util";
import { NPCActionSheetData, NPCAttackSheetData, NPCSheetData, NPCSystemSheetData, NPCSheetItemData } from "./types";
import { CreatureSheetData } from "@actor/creature/types";
import { ALIGNMENT_TRAITS } from "@actor/creature/values";
import { NPCConfig } from "./config";

export class NPCSheetPF2e<TActor extends NPCPF2e> extends CreatureSheetPF2e<TActor> {
    static override get defaultOptions() {
        const options = super.defaultOptions;

        // Mix default options with new ones
        mergeObject(options, {
            classes: options.classes.concat("npc"),
            width: 650,
            height: 680,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
            scrollY: [".tab.main", ".tab.inventory", ".tab.spells", ".tab.effects", ".tab.notes"],
        });
        return options;
    }

    /** Show either the actual NPC sheet or a briefened lootable version if the NPC is dead */
    override get template(): string {
        if (this.isLootSheet) {
            return "systems/pf2e/templates/actors/npc/loot-sheet.html";
        } else if (this.actor.limited) {
            return "systems/pf2e/templates/actors/limited/npc-sheet.html";
        }
        return "systems/pf2e/templates/actors/npc/sheet.html";
    }

    /** Use the token name as the title if showing a lootable NPC sheet */
    override get title(): string {
        if (this.isLootSheet || this.actor.limited) {
            const actorName = this.token?.name ?? this.actor.name;
            if (this.actor.isDead) {
                return `${actorName} [${game.i18n.localize("PF2E.NPC.Dead")}]`; // `;
            } else {
                return actorName;
            }
        }
        return super.title;
    }

    override get isLootSheet(): boolean {
        return this.actor.isLootable && !this.actor.isOwner && this.actor.isLootableBy(game.user);
    }

    /**
     * Prepares items in the actor for easier access during sheet rendering.
     * @param sheetData Data from the actor associated to this sheet.
     */
    protected prepareItems(sheetData: NPCSheetData<TActor>): void {
        this.prepareAbilities(sheetData.data.abilities);
        this.prepareSize(sheetData.data);
        this.prepareAlignment(sheetData.data);
        this.prepareSkills(sheetData.data);
        this.prepareSpeeds(sheetData.data);
        this.prepareSaves(sheetData.data);
        this.prepareActions(sheetData);
        sheetData.attacks = this.prepareAttacks(sheetData.data);
        sheetData.conditions = game.pf2e.ConditionManager.getFlattenedConditions(this.actor.itemTypes.condition);
        sheetData.effectItems = sheetData.items.filter(
            (data): data is NPCSheetItemData<EffectData> => data.type === "effect"
        );
        this.prepareSpellcasting(sheetData);
    }

    private getIdentifyCreatureData(): IdentifyCreatureData {
        const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
        return identifyCreature(this.actor.data, { proficiencyWithoutLevel });
    }

    override async getData(): Promise<NPCSheetData<TActor>> {
        const sheetData: PrePrepSheetData<TActor> = await super.getData();

        // Show the token's name as the actor's name if the user has limited permission or this NPC is dead and lootable
        if (this.actor.limited || this.isLootSheet) {
            sheetData.actor.name = this.actor.token?.name ?? sheetData.actor.name;
        }

        // Filter out alignment traits for sheet presentation purposes
        const alignmentTraits: Set<string> = ALIGNMENT_TRAITS;
        const actorTraits = sheetData.data.traits.traits;
        actorTraits.value = actorTraits.value.filter((t: string) => !alignmentTraits.has(t));

        // recall knowledge DCs
        const identifyCreatureData = (sheetData.identifyCreatureData = this.getIdentifyCreatureData());
        sheetData.identifySkillDC = identifyCreatureData.skill.dc;
        sheetData.identifySkillAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.skill.start];
        sheetData.identifySkillProgression = identifyCreatureData.skill.progression.join("/");
        sheetData.identificationSkills = Array.from(sheetData.identifyCreatureData.skills)
            .sort()
            .map((skillAcronym) => CONFIG.PF2E.skills[skillAcronym as SkillAbbreviation]);

        sheetData.specificLoreDC = identifyCreatureData.specificLoreDC.dc;
        sheetData.specificLoreAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.specificLoreDC.start];
        sheetData.specificLoreProgression = identifyCreatureData.specificLoreDC.progression.join("/");

        sheetData.unspecificLoreDC = identifyCreatureData.unspecificLoreDC.dc;
        sheetData.unspecificLoreAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.unspecificLoreDC.start];
        sheetData.unspecificLoreProgression = identifyCreatureData.unspecificLoreDC.progression.join("/");

        sheetData.isNotCommon = sheetData.data.traits.rarity !== "common";
        sheetData.actorSize = CONFIG.PF2E.actorSizes[sheetData.data.traits.size.value as Size];

        // Shield
        const { heldShield } = this.actor;
        const actorShieldData = sheetData.data.attributes.shield;
        sheetData.hasShield = !!heldShield || actorShieldData.hp.max > 0;

        const isElite = this.isElite;
        const isWeak = this.isWeak;
        sheetData.isElite = isElite;
        sheetData.isWeak = isWeak;
        sheetData.notAdjusted = !isElite && !isWeak;

        if (isElite && isWeak) {
            throw ErrorPF2e("NPC is both, Elite and Weak at the same time.");
        } else if (isElite) {
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
        ac.adjustedHigher = ac.value > Number(ac.base);
        ac.adjustedLower = ac.value < Number(ac.base);
        hp.adjustedHigher = hp.max > Number(hp.base);
        hp.adjustedLower = hp.max < Number(hp.base);
        perception.adjustedHigher = perception.totalModifier > Number(perception.base);
        perception.adjustedLower = perception.totalModifier < Number(perception.base);

        sheetData.hasHardness = this.actor.traits.has("construct") || (Number(hardness?.value) || 0) > 0;

        sheetData.configLootableNpc = game.settings.get("pf2e", "automation.lootableNPCs");
        sheetData.npcAttacksFromWeapons = game.settings.get("pf2e", "npcAttacksFromWeapons");

        // Return data for rendering
        return sheetData as NPCSheetData<TActor>;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Set the inventory tab as active on a loot-sheet rendering.
        if (this.isLootSheet) {
            $html.find(".tab.inventory").addClass("active");
        }

        // Subscribe to roll events
        const rollables = ["a.rollable", ".rollable a", ".item-icon.rollable"].join(", ");
        $html.find(rollables).on("click", (event) => this.onClickRollable(event));
        $html.find("a.chat, .spell-icon.rollable").on("click", (event) => this.onClickToChat(event));

        // Don't subscribe to edit buttons it the sheet is NOT editable
        if (!this.options.editable) return;

        $html.find(".trait-edit").on("click", (event) => this.onTraitSelector(event));
        $html.find(".skills-edit").on("click", () => {
            new NPCSkillsEditor(this.actor).render(true);
        });

        // Adjustments
        $html.find(".npc-elite-adjustment").on("click", () => this.onClickMakeElite());
        $html.find(".npc-weak-adjustment").on("click", () => this.onClickMakeWeak());

        // Handle spellcastingEntry attack and DC updates
        $html
            .find(".spellcasting-entry")
            .find<HTMLInputElement | HTMLSelectElement>(".attack-input, .dc-input, .ability-score select")
            .on("change", (event) => this.onChangeSpellcastingEntry(event));

        $html.find(".effects-list > .effect > .item-image").on("contextmenu", (event) => this.onClickDeleteItem(event));

        $html.find(".recall-knowledge button.breakdown").on("click", (event) => {
            event.preventDefault();
            const identifyCreatureData = this.getIdentifyCreatureData();
            new RecallKnowledgePopup({}, identifyCreatureData).render(true);
        });

        $html.find(".decrement").on("click", async (event) => {
            const actor = this.actor;
            const target = $(event.currentTarget);
            const parent = target.parents(".item");
            const effect = actor.items.get(parent.attr("data-item-id") ?? "");
            if (effect instanceof ConditionPF2e) {
                await actor.decreaseCondition(effect);
            }
        });

        $html.find(".increment").on("click", async (event) => {
            const actor = this.actor;
            const $target = $(event.currentTarget);
            const parent = $target.parents(".item");
            const effect = actor.items.get(parent.attr("data-item-id") ?? "");
            if (effect instanceof ConditionPF2e) {
                await actor.increaseCondition(effect);
            }
        });

        $html.find(".item-control.generate-attack").on("click", async (event) => {
            const { actor } = this;
            const itemId = event.currentTarget.closest("li")?.dataset.itemId ?? "";
            const item = actor.items.get(itemId, { strict: true });
            if (item.isOfType("weapon")) {
                const attacks = item.toNPCAttacks().map((a) => a.toObject());
                await actor.createEmbeddedDocuments("Item", attacks);
                ui.notifications.info(`Generated NPC attack: ${attacks.at(0)?.name}`);
            }
        });
    }

    /** Replace sheet config with a special NPC config form application */
    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();

        if (this.isEditable) {
            const index = buttons.findIndex((b) => b.class === "close");
            buttons.splice(index, 0, {
                label: "Configure", // Top-level foundry localization key
                class: "configure-npc",
                icon: "fas fa-cog",
                onclick: (event) => this._onConfigureSheet(event),
            });
        }

        return buttons;
    }

    /**
     * Shim for {@link DocumentSheet#_onConfigureSheet} that will be replaced in v10 when this class subclasses it.
     */
    protected override _onConfigureSheet(event: Event): void {
        event.preventDefault();
        const [top, left, width] = [this.position.top ?? 0, this.position.left ?? 0, this.position.width ?? 0];
        new NPCConfig(this.actor, {
            top: top + 40,
            left: (left + (width - Number(TokenConfig.defaultOptions.width ?? 0))) / 2,
        }).render(true);
    }

    private prepareAbilities(abilities: Abilities): void {
        for (const key of ABILITY_ABBREVIATIONS) {
            interface SheetAbilityData extends AbilityData {
                localizedCode?: string;
                localizedName?: string;
            }
            const data: SheetAbilityData = abilities[key];
            const localizedCode = game.i18n.localize(`PF2E.AbilityId.${key}`);
            const nameKey = this.getAbilityNameKey(key);
            const localizedName = game.i18n.localize(nameKey);

            data.localizedCode = localizedCode;
            data.localizedName = localizedName;
        }
    }

    private prepareSize(sheetSystemData: NPCSystemSheetData): void {
        const size = sheetSystemData.traits.size.value;
        const localizationKey = this.getSizeLocalizedKey(size);
        const localizedName = game.i18n.localize(localizationKey);

        sheetSystemData.traits.size.localizedName = localizedName;
    }

    private prepareAlignment(sheetSystemData: NPCSystemSheetData): void {
        const alignmentCode = sheetSystemData.details.alignment.value;
        const localizedName = game.i18n.localize(`PF2E.Alignment${alignmentCode}`);

        sheetSystemData.details.alignment.localizedName = localizedName;
    }

    private prepareSkills(sheetSystemData: NPCSystemSheetData): void {
        // Prepare a list of skill IDs sorted by their localized name
        // This will help in displaying the skills in alphabetical order in the sheet
        const sortedSkillsIds = Object.keys(sheetSystemData.skills);

        const skills = sheetSystemData.skills;
        for (const skillId of sortedSkillsIds) {
            const skill = skills[skillId];
            skill.label = objectHasKey(CONFIG.PF2E.skillList, skill.expanded)
                ? game.i18n.localize(CONFIG.PF2E.skillList[skill.expanded])
                : skill.label ?? skill.name;
            skill.adjustedHigher = skill.value > Number(skill.base);
            skill.adjustedLower = skill.value < Number(skill.base);
        }

        sortedSkillsIds.sort((a: string, b: string) => {
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

        sheetSystemData.sortedSkills = sortedSkills;
    }

    private prepareSpeeds(sheetData: NPCSystemSheetData): void {
        const configSpeedTypes = CONFIG.PF2E.speedTypes;
        sheetData.attributes.speed.otherSpeeds.forEach((speed) => {
            // Try to convert it to a recognizable speed name
            // This is done to recognize speed types for NPCs from the compendium
            const speedName: string = speed.type.trim().toLowerCase().replace(/\s+/g, "-");
            let value = speed.value;
            if (typeof value === "string" && value.includes("feet")) {
                value = value.replace("feet", "").trim(); // Remove `feet` at the end, wi will localize it later
            }
            speed.label = objectHasKey(configSpeedTypes, speedName) ? configSpeedTypes[speedName] : "";
        });
        // Make sure regular speed has no `feet` at the end, we will add it localized later on
        // This is usally the case for NPCs from the compendium
        if (typeof sheetData.attributes.speed.value === "string") {
            sheetData.attributes.speed.value = sheetData.attributes.speed.value.replace("feet", "").trim();
        }
    }

    private prepareSaves(systemData: NPCSystemSheetData): void {
        for (const saveType of SAVE_TYPES) {
            const save = systemData.saves[saveType];
            save.labelShort = game.i18n.localize(`PF2E.Saves${saveType.titleCase()}Short`);
            save.adjustedHigher = save.totalModifier > Number(save.base);
            save.adjustedLower = save.totalModifier < Number(save.base);
        }
    }

    /**
     * Prepares the actions list to be accessible from the sheet.
     * @param sheetData Data of the actor to be shown in the sheet.
     */
    private prepareActions(sheetData: NPCSheetData<TActor>): void {
        const actions: NPCActionSheetData = {
            passive: { label: game.i18n.localize("PF2E.ActionTypePassive"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionTypeFree"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionTypeReaction"), actions: [] },
            action: { label: game.i18n.localize("PF2E.ActionTypeAction"), actions: [] },
        };

        for (const item of this.actor.itemTypes.action) {
            const itemData = item.toObject(false);
            const chatData = item.getChatData();
            const traits = chatData.traits;

            // Create trait with the type of action
            const systemData = itemData.data;
            const hasType = systemData.actionType && systemData.actionType.value;

            if (hasType) {
                const configTraitDescriptions = CONFIG.PF2E.traitsDescriptions;
                const configAttackTraits = CONFIG.PF2E.npcAttackTraits;

                const actionTrait = systemData.actionType.value;
                const label = objectHasKey(configAttackTraits, actionTrait)
                    ? configAttackTraits[actionTrait]
                    : actionTrait.charAt(0).toUpperCase() + actionTrait.slice(1);
                const description = objectHasKey(configTraitDescriptions, actionTrait)
                    ? configTraitDescriptions[actionTrait]
                    : "";

                const trait = {
                    label,
                    description,
                    value: "",
                };

                traits.splice(0, 0, trait);
            }

            const actionType = item.actionCost?.type || "passive";
            if (objectHasKey(actions, actionType)) {
                actions[actionType].actions.push({
                    ...itemData,
                    glyph: getActionGlyph(item.actionCost),
                    imageUrl: getActionIcon(item.actionCost),
                    chatData,
                    traits,
                });
            }
        }

        sheetData.actions = actions;
    }

    private prepareAttacks(sheetData: NPCSystemSheetData): NPCAttackSheetData {
        const attackTraits: Record<string, string | undefined> = CONFIG.PF2E.npcAttackTraits;
        const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;

        return sheetData.actions.map((attack) => {
            const traits = attack.traits
                .map((strikeTrait) => ({
                    label: attackTraits[strikeTrait.label] ?? strikeTrait.label,
                    description: traitDescriptions[strikeTrait.name] ?? "",
                }))
                .sort((a, b) => {
                    if (a.label < b.label) return -1;
                    if (a.label > b.label) return 1;
                    return 0;
                });
            return { attack, traits };
        });
    }

    /**
     * Prepare spells and spell entries
     * @param sheetData Data of the actor to show in the sheet.
     */
    private prepareSpellcasting(sheetData: NPCSheetData<TActor>): void {
        sheetData.spellcastingEntries = [];

        for (const item of sheetData.items) {
            if (item.type === "spellcastingEntry") {
                const entry = this.actor.spellcasting.get(item._id);
                if (!(entry instanceof SpellcastingEntryPF2e)) continue;
                sheetData.spellcastingEntries.push(mergeObject(item, entry.getSpellData()));
            }
        }
    }

    private get isWeak(): boolean {
        return this.actor.traits.has("weak");
    }

    private get isElite(): boolean {
        return this.actor.traits.has("elite");
    }

    private getSizeLocalizedKey(size: string): string {
        const actorSizes = CONFIG.PF2E.actorSizes;
        return objectHasKey(actorSizes, size) ? actorSizes[size] : "";
    }

    private getAbilityNameKey(abilityCode: AbilityString): string {
        return CONFIG.PF2E.abilities[abilityCode];
    }

    // ROLLS

    private async rollPerception(event: JQuery.ClickEvent): Promise<void> {
        const options = this.actor.getRollOptions(["all", "perception-check"]);
        await this.actor.attributes.perception.roll({ event, options });
    }

    private async rollAbility(event: JQuery.ClickEvent, abilityId: AbilityString): Promise<void> {
        const bonus = this.actor.data.data.abilities[abilityId].mod;
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

    private async onClickRollable(event: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement>): Promise<void> {
        event.preventDefault();
        const label = event.currentTarget.closest<HTMLElement>(".rollable");
        const { attribute, save, skill } = label?.parentElement?.dataset ?? {};
        const rollParams = eventToRollParams(event);

        if (attribute) {
            if (attribute === "perception") {
                await this.rollPerception(event);
            } else if (setHasElement(ABILITY_ABBREVIATIONS, attribute)) {
                this.rollAbility(event, attribute);
            }
        } else if (skill) {
            const extraRollOptions = event.currentTarget.dataset.options
                ?.split(",")
                .map((o) => o.trim())
                .filter((o) => !!o);

            const key = objectHasKey(SKILL_DICTIONARY, skill) ? SKILL_DICTIONARY[skill] : skill;
            await this.actor.skills[key]?.check.roll({ ...rollParams, extraRollOptions });
        } else if (objectHasKey(this.actor.saves, save)) {
            await this.actor.saves[save].check.roll(rollParams);
        }
    }

    private async onClickToChat(event: JQuery.ClickEvent): Promise<void> {
        event.preventDefault();

        const itemId = $(event.currentTarget).parents(".item").attr("data-item-id") ?? "";
        const item = this.actor.items.get(itemId, { strict: true });
        if (item instanceof PhysicalItemPF2e && !item.isIdentified) return;
        await item.toChat(event);
    }

    private onClickMakeWeak(): Promise<void> {
        return this.actor.applyAdjustment(this.actor.isWeak ? "normal" : "weak");
    }

    private onClickMakeElite(): Promise<void> {
        return this.actor.applyAdjustment(this.actor.isElite ? "normal" : "elite");
    }

    private async onChangeSpellcastingEntry(
        event: JQuery.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ): Promise<void> {
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
        if (this.isElite || this.isWeak) {
            const { max } = this.actor.data.data.attributes.hp;
            if (formData["data.attributes.hp.max"] === max) {
                delete formData["data.attributes.hp.max"];
            }
        }

        // update shield hp
        const shield = this.actor.heldShield;
        if (shield && Number.isInteger(formData["data.attributes.shield.value"])) {
            await shield.update({
                "data.hp.value": formData["data.attributes.shield.value"],
            });
        }

        return super._updateObject(event, formData);
    }
}

type PrePrepSheetData<T extends NPCPF2e> = Partial<NPCSheetData<T>> & CreatureSheetData<T>;
