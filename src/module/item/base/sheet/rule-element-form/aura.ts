import { userColorForActor } from "@actor/helpers.ts";
import type { ClientDocument } from "@client/documents/abstract/_module.d.mts";
import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import type { HexColorString } from "@common/constants.d.mts";
import type { SourceFromSchema } from "@common/data/fields.d.mts";
import type { ItemUUID } from "@common/documents/_module.d.mts";
import type { ItemPF2e } from "@item";
import type { AuraRuleElement, AuraRuleElementSchema } from "@module/rules/rule-element/aura.ts";
import type { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, isImageFilePath } from "@util";
import { tagify } from "@util/tags.ts";
import * as R from "remeda";
import { RuleElementForm, RuleElementFormSheetData, RuleElementFormTabData } from "./base.ts";

class AuraForm extends RuleElementForm<AuraRuleElementSource, AuraRuleElement> {
    override template = `${SYSTEM_ROOT}/templates/items/rules/aura.hbs`;

    protected override tabs: RuleElementFormTabData = {
        names: ["basics", "effects", "appearance"],
        displayStyle: "grid",
    };

    #effectsMap: Map<number, AuraEffectSource> = new Map();

    get effectsArray(): AuraEffectSource[] {
        return [...this.#effectsMap.values()];
    }

    protected override getInitialValue(): object {
        this.#effectsMap.clear();
        this.#effectsMap = new Map(
            this.object.effects.map((e, index): [number, AuraEffectSource] => [index, fu.deepClone(e)]),
        );
        return super.getInitialValue();
    }

    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);

        const traitsElement = htmlQuery<HTMLTagifyTagsElement>(html, "tagify-tags.tagify-traits");
        if (traitsElement) {
            const whitelist = { ...CONFIG.PF2E.spellTraits, ...CONFIG.PF2E.actionTraits };
            tagify(traitsElement, { whitelist, enforceWhitelist: false });
        }

        for (const eventsElement of htmlQueryAll<HTMLTagifyTagsElement>(html, "tagify-tags.tagify-events")) {
            const whitelist = [
                ["enter", game.i18n.localize("PF2E.RuleEditor.Aura.Effects.EventsOptions.Enter")],
                ["turn-start", game.i18n.localize("PF2E.RuleEditor.Aura.Effects.EventsOptions.TurnStart")],
                ["turn-end", game.i18n.localize("PF2E.RuleEditor.Aura.Effects.EventsOptions.TurnEnd")],
            ].sort((a, b) => a[1].localeCompare(b[1], game.i18n.lang));
            tagify(eventsElement, { whitelist: R.mapToObj(whitelist, (w) => [w[0], w[1]]), enforceWhitelist: true });
        }

        for (const element of htmlQueryAll(html, "a[data-action=remove-effect]")) {
            element.addEventListener("click", () => {
                this.#deleteEffect(element.dataset.effectId);
            });
        }

        for (const button of htmlQueryAll<HTMLButtonElement>(
            html,
            "div[data-rule-tab=effects] button[data-action=toggle-brackets]",
        )) {
            const fieldset = htmlClosest(button, "fieldset");
            const select = htmlQuery<HTMLSelectElement>(fieldset, "select");
            const input = htmlQuery<HTMLInputElement>(fieldset, "input");
            if (select && input && !select.value) {
                button.disabled = true;
                input.disabled = true;
            }
        }

        // Ensure only one checkbox or text input for each color input group has a `name` attribute
        for (const key of ["border", "highlight"] as const) {
            const inputName = `system.rules.${this.index}.appearance.${key}.color`;
            const colorPicker = htmlQuery<HTMLInputElement>(html, `color-picker[name="${inputName}"]`);
            const textInput = htmlQuery<HTMLInputElement>(colorPicker, "input[type=text]");
            const checkbox = htmlQuery<HTMLInputElement>(html, `input[type=checkbox][name="${inputName}"]`);
            if (!(colorPicker && textInput && checkbox)) {
                continue;
            }

            if (this.object.appearance[key]?.color === "user-color") {
                colorPicker.removeAttribute("name");
                colorPicker.disabled = true;
                textInput.disabled = true;
            } else {
                checkbox.removeAttribute("name");
            }

            checkbox.addEventListener("change", (event) => {
                event.stopPropagation();
                if (checkbox.checked) {
                    checkbox.name = inputName;
                    colorPicker.removeAttribute("name");
                    colorPicker.disabled = true;
                    textInput.disabled = true;
                    textInput.value = colorPicker.value = userColorForActor(this.object.actor);
                } else {
                    colorPicker.name = inputName;
                    checkbox.removeAttribute("name");
                    colorPicker.disabled = false;
                    textInput.disabled = false;
                    textInput.value = colorPicker.value = "#000000";
                }
            });
        }

        const translationX = htmlQuery<HTMLInputElement>(html, "input[data-translation=x]");
        const translationY = htmlQuery<HTMLInputElement>(html, "input[data-translation=y]");
        if (translationX && translationY) {
            translationX.addEventListener("change", () => {
                if (translationX.value !== "" && translationY.value === "") {
                    translationY.value = translationX.value;
                }
            });
            translationY.addEventListener("change", () => {
                if (translationY.value !== "" && translationX.value === "") {
                    translationX.value = translationY.value;
                }
            });
        }
    }

    override async getData(): Promise<AuraSheetData> {
        const data = await super.getData();
        const { border, highlight } = this.object.appearance;
        const userColor = userColorForActor(this.object.actor);
        return Object.assign(data, {
            affectsOptions: {
                all: "PF2E.RuleEditor.Aura.Effects.AffectsOptions.All",
                allies: "PF2E.RuleEditor.Aura.Effects.AffectsOptions.Allies",
                enemies: "PF2E.RuleEditor.Aura.Effects.AffectsOptions.Enemies",
            },
            effects: this.effectsArray.map((e) => ({ ...e, item: fromUuidSync(e.uuid) })),
            borderColor: border?.color === "user-color" ? userColor : (border?.color?.toString() ?? null),
            highlightColor: highlight.color === "user-color" ? userColor : highlight?.color?.toString(),
            saveTypes: CONFIG.PF2E.saves,
            isImageFile: isImageFilePath(this.rule.appearance?.texture?.src),
        });
    }

    protected override async onDrop(event: DragEvent, element: HTMLElement): Promise<ItemPF2e | null> {
        const { id } = element.dataset;
        if (id !== "aura-effect-drop") return null;
        const item = await super.onDrop(event, element);
        if (!item?.isOfType("effect") || !this.schema) return null;
        this.#addEffect(item.uuid);
        return item;
    }

    override async updateItem(updates: Partial<AuraRuleElementSource> | Record<string, unknown>): Promise<void> {
        const expanded = fu.expandObject<Partial<AuraRuleElementSource>>(updates);
        if (expanded.effects) {
            // Restore clobbered effects array and perform updates
            expanded.effects = this.#updateEffectsMap(expanded);
        }
        return super.updateItem(expanded);
    }

    override updateObject(source: AuraRuleElementSource & Partial<Record<string, JSONValue>>): void {
        // Restore clobbered effects array and perform updates
        source.effects = this.#updateEffectsMap(source);

        for (const key of ["level", "radius"]) {
            if (key in source && !source[key]) {
                delete source[key];
                continue;
            }

            const stringValue = source[key];
            const maybeIntegerValue =
                typeof stringValue === "string" && /^\d+$/.test(stringValue) ? Number(stringValue) : NaN;
            if (Number.isInteger(maybeIntegerValue)) {
                source[key] = maybeIntegerValue;
            }
        }

        // Clean up appearance data
        const appearance: DeepPartial<AuraRuleElementSource["appearance"]> = source.appearance;
        if (appearance.texture) {
            const texture = appearance.texture;
            if (texture.translation) {
                const { x, y } = texture.translation;
                if (!x && !y) {
                    texture.translation = null;
                }
            }

            if (!texture.src) {
                appearance.texture = null;
            } else if (isImageFilePath(texture.src)) {
                texture.loop = true;
                texture.playbackRate = 1;
            }
        }

        super.updateObject(source);
    }

    #addEffect(uuid: ItemUUID): void {
        const index = this.#effectsMap.size + 1;
        this.#effectsMap.set(index, { uuid } as AuraEffectSource);
        this.updateItem({ effects: this.effectsArray });
    }

    #updateEffectsMap(source: AuraRuleElementSource | Partial<AuraRuleElementSource>): AuraEffectSource[] {
        type AuraREEffectSource = AuraRuleElementSource["effects"][number];

        // Reconstruct the map with deleted defaults
        this.#effectsMap = new Map(
            Object.values(source.effects ?? {}).map((data, index): [number, AuraREEffectSource] => {
                const updatedData = fu.deepClone(data);
                const deletions: { [K in `-=${keyof AuraREEffectSource}`]?: null | undefined } = {};

                // Clean up save data
                if (updatedData.save) {
                    const type = updatedData.save.type ?? data.save?.type;
                    if (!type) {
                        deletions["-=save"] = null;
                    } else {
                        updatedData.save.dc ||= 10;
                    }
                }

                if (updatedData.affects !== "enemies" && updatedData.includesSelf) {
                    deletions["-=includesSelf"] = null;
                }
                if (updatedData.removeOnExit) {
                    deletions["-=removeOnExit"] = null;
                }
                if (updatedData.predicate) {
                    try {
                        const parsed = JSON.parse(String(updatedData.predicate));
                        updatedData.predicate = Array.isArray(parsed) ? parsed : [];
                    } catch {
                        deletions["-=predicate"] = null;
                    }
                } else {
                    deletions["-=predicate"] = null;
                }

                return [index, fu.mergeObject(updatedData, deletions, { performDeletions: true })];
            }),
        );

        return this.effectsArray;
    }

    #deleteEffect(id?: string): void {
        const index = Number(id);
        if (Number.isNaN(index)) return;
        if (this.#effectsMap.delete(index)) {
            this.updateItem({ effects: this.effectsArray });
        }
    }
}

interface AuraSheetData extends RuleElementFormSheetData<AuraRuleElementSource, AuraRuleElement> {
    affectsOptions: Record<string, string>;
    effects: AuraRuleElementSource["effects"] &
        {
            item: ClientDocument | CompendiumIndexData | null;
        }[];
    borderColor: HexColorString | null;
    highlightColor: HexColorString;
    saveTypes: ConfigPF2e["PF2E"]["saves"];
    isImageFile: boolean;
}

type AuraEffectSource = AuraRuleElementSource["effects"][number];

type AuraRuleElementSource = SourceFromSchema<AuraRuleElementSchema>;

export { AuraForm };
