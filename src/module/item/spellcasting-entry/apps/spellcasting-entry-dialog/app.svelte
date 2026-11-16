<script lang="ts">
    import type { AttributeString } from "@actor/types.ts";
    import type { MagicTradition } from "@item/spell/types.ts";
    import type { SpellcastingCategory } from "@item/spellcasting-entry/types.ts";
    import type { OneToTen } from "@module/data.ts";
    import type { SvelteAppProps } from "@module/sheet/mixin.svelte.ts";
    import { signedInteger } from "@util";
    import type { SpellcastingEntryDialogContext, SpellcastingDraft } from "./app.ts";

    const { foundryApp, getState }: SpellcastingEntryDialogContext & SvelteAppProps<SpellcastingEntryDialogContext> =
        $props();
    const data = $derived(getState());

    const uid = $derived(foundryApp.id);
    const isEditing = $derived(data.mode === "edit");

    // Seeded once. Later renders refresh the option lists, not the draft.
    // svelte-ignore state_referenced_locally
    const draft: SpellcastingDraft = $state({ ...data.initial });

    const isPrepared = $derived(draft.type === "prepared");
    const isItems = $derived(draft.type === "items");

    const selectedStatistic = $derived(data.statistics.find((s) => s.slug === draft.proficiencySlug) ?? null);
    // A listed statistic supplies the attribute. A slug no longer in the list (source removed) leaves it editable
    const isAttributeConfigurable = $derived(!selectedStatistic);
    const displayedAttribute = $derived(selectedStatistic?.attribute ?? draft.attribute);
    const attributeHint = $derived(
        selectedStatistic
            ? _loc("PF2E.SpellcastingSettings.AttributeSetBy", { statistic: selectedStatistic.label })
            : null,
    );

    // Items entries may defer to each spell's tradition
    const traditionOptions = $derived(
        isItems
            ? [{ value: "", label: _loc("PF2E.MagicTraditionUseSpellLabel") }, ...data.magicTraditions]
            : data.magicTraditions,
    );
    const statisticOptions = $derived([
        { value: "", label: _loc("PF2E.Actor.Creature.Spellcasting.Label") },
        ...data.statistics.map((s) => ({ value: s.slug, label: s.label })),
    ]);
    // Live attack/DC readout
    const preview = $derived(
        data.isCharacter
            ? foundryApp.previewStatistic({
                  ...draft,
                  proficiencySlug: effective(statisticOptions, draft.proficiencySlug),
              })
            : null,
    );
    const validItemOptions = $derived([
        { value: "", label: _loc("PF2E.Actor.Creature.Spellcasting.ValidItemTypes.All") },
        ...data.validItemTypes,
    ]);
    const autoHeightenOptions = $derived([
        { value: "", label: _loc("PF2E.SpellcastingSettings.AutoHeightenDefault") },
        ...data.autoHeightenRanks,
    ]);

    /** A select with no matching option shows its first one, so submit that too */
    function effective(options: { value: string }[], value: string): string {
        return options.some((o) => o.value === value) ? value : (options[0]?.value ?? "");
    }

    function handleTypeChange(type: SpellcastingCategory): void {
        if (type === "innate" && draft.type !== "innate") draft.attribute = "cha";
        draft.type = type;
    }

    function handleProficiencyChange(slug: string): void {
        draft.proficiencySlug = slug;
    }

    let submitting = $state(false);
    async function handleSubmit(event: SubmitEvent): Promise<void> {
        event.preventDefault();
        if (submitting) return;
        submitting = true;
        try {
            await foundryApp.confirm({
                ...draft,
                tradition: effective(traditionOptions, draft.tradition) as MagicTradition | "",
                proficiencySlug: data.isCharacter
                    ? effective(statisticOptions, draft.proficiencySlug)
                    : draft.proficiencySlug,
                validItems: effective(validItemOptions, draft.validItems) as "scroll" | "",
            });
        } finally {
            submitting = false;
        }
    }
</script>

<form autocomplete="off" onsubmit={handleSubmit}>
    <fieldset>
        <legend>{_loc("PF2E.SpellcastingSettings.Groups.Preparation")}</legend>
        <div class="form-group">
            <label for="{uid}-type">{_loc("PF2E.SpellcastingTypeLabel")}</label>
            <div class="form-fields">
                <!-- Core focuses the [autofocus] element on first render -->
                <!-- svelte-ignore a11y_autofocus -->
                <select
                    id="{uid}-type"
                    value={draft.type}
                    disabled={isEditing}
                    autofocus={!isEditing}
                    onchange={(e) => handleTypeChange(e.currentTarget.value as SpellcastingCategory)}
                >
                    {#each data.spellcastingTypes as option (option.value)}
                        <option value={option.value}>{option.label}</option>
                    {/each}
                </select>
            </div>
        </div>
        {#if isPrepared}
            <div class="form-group">
                <label for="{uid}-flexible">{_loc("PF2E.SpellFlexibleLabel")}</label>
                <div class="form-fields">
                    <input id="{uid}-flexible" type="checkbox" bind:checked={draft.flexible} />
                </div>
            </div>
        {/if}
        {#if isItems}
            <div class="form-group">
                <label for="{uid}-valid-items">{_loc("PF2E.Actor.Creature.Spellcasting.MagicItemTypesLabel")}</label>
                <div class="form-fields">
                    <select id="{uid}-valid-items" bind:value={draft.validItems}>
                        {#each validItemOptions as option (option.value)}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
            </div>
        {/if}
    </fieldset>

    <fieldset>
        <legend>{_loc("PF2E.SpellcastingSettings.Groups.Casting")}</legend>
        {#if data.isCharacter}
            <div class="form-group">
                <label for="{uid}-proficiency">{_loc("PF2E.ProficiencyLabel")}</label>
                <div class="form-fields">
                    <!-- svelte-ignore a11y_autofocus -->
                    <select
                        id="{uid}-proficiency"
                        value={draft.proficiencySlug}
                        autofocus={isEditing}
                        aria-describedby="{uid}-proficiency-hint"
                        onchange={(e) => handleProficiencyChange(e.currentTarget.value)}
                    >
                        {#each statisticOptions as option (option.value)}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
                <p class="hint" id="{uid}-proficiency-hint">{_loc("PF2E.SpellcastingSettings.ProficiencyHint")}</p>
            </div>
        {/if}
        <div class="form-group">
            <label for="{uid}-tradition">{_loc("PF2E.MagicTraditionLabel")}</label>
            <div class="form-fields">
                <!-- svelte-ignore a11y_autofocus -->
                <select id="{uid}-tradition" bind:value={draft.tradition} autofocus={isEditing && !data.isCharacter}>
                    {#each traditionOptions as option (option.value)}
                        <option value={option.value}>{option.label}</option>
                    {/each}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label for="{uid}-attribute">{_loc("PF2E.Actor.Character.Attribute.Key")}</label>
            <div class="form-fields">
                <select
                    id="{uid}-attribute"
                    value={displayedAttribute}
                    disabled={!isAttributeConfigurable}
                    aria-describedby={attributeHint ? `${uid}-attribute-hint` : undefined}
                    onchange={(e) => (draft.attribute = e.currentTarget.value as AttributeString)}
                >
                    {#each data.attributes as option (option.value)}
                        <option value={option.value}>{option.label}</option>
                    {/each}
                </select>
            </div>
            {#if attributeHint}
                <p class="hint" id="{uid}-attribute-hint">{attributeHint}</p>
            {/if}
        </div>
        {#if preview}
            <div class="form-group">
                <label for="{uid}-preview">{_loc("PF2E.SpellcastingSettings.Preview.Label")}</label>
                <output id="{uid}-preview" aria-live="polite">
                    {_loc("PF2E.SpellcastingSettings.Preview.Value", {
                        attack: signedInteger(preview.attack),
                        dc: preview.dc,
                    })}
                </output>
            </div>
        {/if}
        {#if data.isNPC}
            <div class="form-group">
                <label for="{uid}-auto-heighten">{_loc("PF2E.SpellcastingSettings.AutoHeightenLabel")}</label>
                <div class="form-fields">
                    <select
                        id="{uid}-auto-heighten"
                        value={draft.autoHeightenLevel?.toString() ?? ""}
                        onchange={(e) => {
                            const raw = e.currentTarget.value;
                            draft.autoHeightenLevel = data.autoHeightenRanks.some((o) => o.value === raw)
                                ? (Number(raw) as OneToTen)
                                : null;
                        }}
                    >
                        {#each autoHeightenOptions as option (option.value)}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
            </div>
        {/if}
    </fieldset>

    <footer class="form-footer">
        <button type="submit" disabled={submitting} aria-busy={submitting}>
            {_loc(isEditing ? "PF2E.UpdateLabelUniversal" : "PF2E.CreateLabelUniversal")}
        </button>
    </footer>
</form>

<style lang="scss">
    /* Core's standard-form gap only spaces the window content's direct children, so repeat it */
    form {
        display: flex;
        flex-direction: column;
        gap: var(--spacer-16);
    }

    /* Size the label column to its text: core's fixed-ratio label wraps at this width */
    fieldset {
        display: grid;
        grid-template-columns: max-content 1fr;
        align-items: center;
        gap: var(--space-8) var(--space-15);

        .form-group {
            display: contents;
        }

        label {
            line-height: normal;
        }

        .hint {
            grid-column: 1 / -1;
            margin: 0;
        }
    }
</style>
