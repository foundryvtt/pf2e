import type { ItemPF2e } from "@item";
import type { AuraRuleElement, AuraRuleElementSchema } from "@module/rules/rule-element/aura.ts";
import { htmlClosest, htmlQuery, htmlQueryAll, isImageFilePath, tagify } from "@util";
import * as R from "remeda";
import { RuleElementForm, RuleElementFormSheetData, RuleElementFormTabData } from "./base.ts";
import { userColorForActor } from "@actor/helpers.ts";

class AuraForm extends RuleElementForm<AuraRuleElementSource, AuraRuleElement> {
    override template = "systems/pf2e/templates/items/rules/aura.hbs";
    protected override tabs: RuleElementFormTabData = {
        names: ["basic", "effects", "appearance"],
        displayStyle: "grid",
    };

    #effectsMap: Map<number, AuraEffectSource> = new Map();

    get effectsArray(): AuraEffectSource[] {
        return [...this.#effectsMap.values()];
    }

    protected override getInitialValue(): object {
        this.#effectsMap.clear();
        this.#effectsMap = new Map(
            this.object.effects.map((e, index): [number, AuraEffectSource] => [index, deepClone(e)]),
        );

        return super.getInitialValue();
    }

    override activateListeners(html: HTMLElement): void {
        super.activateListeners(html);

        const traitsElement = htmlQuery<HTMLInputElement>(html, ".tagify-traits");
        if (traitsElement) {
            const whitelist = { ...CONFIG.PF2E.spellTraits, ...CONFIG.PF2E.actionTraits };
            tagify(traitsElement, { whitelist, enforceWhitelist: false });
        }

        for (const eventsElement of htmlQueryAll<HTMLInputElement>(html, ".tagify-events")) {
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
            const textInput = htmlQuery<HTMLInputElement>(html, `input[type=text][name="${inputName}"]`);
            const colorInput = htmlQuery<HTMLInputElement>(html, `input[type=color][data-edit="${inputName}"]`);
            const checkbox = htmlQuery<HTMLInputElement>(html, `input[type=checkbox][name="${inputName}"]`);
            if (!(textInput && colorInput && checkbox)) {
                continue;
            }

            if (this.object.appearance[key]?.color === "user-color") {
                textInput.removeAttribute("name");
                textInput.disabled = true;
                colorInput.disabled = true;
            } else {
                checkbox.removeAttribute("name");
            }

            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    checkbox.name = textInput.name;
                    textInput.removeAttribute("name");
                    textInput.disabled = true;
                    colorInput.disabled = true;
                    textInput.value = colorInput.value = userColorForActor(this.object.actor);
                } else {
                    textInput.name = checkbox.name;
                    checkbox.removeAttribute("name");
                    textInput.disabled = false;
                    colorInput.disabled = false;
                    textInput.value = colorInput.value = "#000000";
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
        const { border, highlight } = this.object.appearance;
        const userColor = userColorForActor(this.object.actor);

        return {
            ...(await super.getData()),
            affectsOptions: {
                all: "PF2E.RuleEditor.Aura.Effects.AffectsOptions.All",
                allies: "PF2E.RuleEditor.Aura.Effects.AffectsOptions.Allies",
                enemies: "PF2E.RuleEditor.Aura.Effects.AffectsOptions.Enemies",
            },
            effects: this.effectsArray.map((e) => ({
                ...e,
                item: fromUuidSync(e.uuid),
            })),
            borderColor: border?.color === "user-color" ? userColor : border?.color ?? null,
            highlightColor: highlight.color === "user-color" ? userColor : highlight?.color,
            saveTypes: CONFIG.PF2E.saves,
            isImageFile: isImageFilePath(this.rule.appearance?.texture?.src),
        };
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
        const expanded = expandObject<Partial<AuraRuleElementSource>>(updates);
        if (expanded.effects) {
            // Restore clobbered effects array and perform updates
            expanded.effects = this.#updateEffectsMap(expanded);
        }
        return super.updateItem(expanded);
    }

    override updateObject(source: AuraRuleElementSource & Record<string, unknown>): void {
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

        // Treat 0 opacity as null
        if (appearance?.border?.alpha === 0) {
            appearance.border = null;
        }

        // A color value will be `null` if a checkbox has be unchecked
        if (appearance?.border?.color === null) {
            appearance.border.color = "#000000";
        }
        if (appearance?.highlight?.color === null) {
            appearance.highlight.color = "#000000";
        }

        const texture = appearance?.texture;
        if (texture) {
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
                const updatedData = deepClone(data);
                const deletions: { [K in `-=${keyof AuraREEffectSource}`]?: null | undefined } = {};

                // Clean up save data
                if (updatedData.save) {
                    const type = updatedData.save.type ?? data.save?.type;
                    if (!type) {
                        deletions["-=save"] = null;
                    } else {
                        updatedData.save.dc ||= null;
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

                return [index, mergeObject(updatedData, deletions, { performDeletions: true })];
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
