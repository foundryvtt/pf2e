<script lang="ts">
    import InlineIconButton from "@module/sheet/components/inline-icon-button.svelte";
    import type { SvelteAppProps } from "@module/sheet/mixin.svelte.ts";
    import { sluggify } from "@util";
    import type { Attachment } from "svelte/attachments";
    import type { NPCSkillsEditorContext } from "./app.ts";

    const { foundryApp, getState }: NPCSkillsEditorContext & SvelteAppProps<NPCSkillsEditorContext> = $props();
    const data = $derived(getState());

    // Namespaces element ids so editors opened for different NPCs don't collide
    const uid = $derived(foundryApp.id);

    let newLoreName = $state("");
    let selectedUntrained = $state("");

    // The user's pick when it's still a valid option, otherwise the first available skill
    const effectiveUntrained = $derived(
        data.untrainedSkills.find((s) => s.slug === selectedUntrained)?.slug ?? data.untrainedSkills[0]?.slug ?? "",
    );

    // Prepared skills are keyed by slug: block lore names that sluggify to an existing one
    const existingLoreSlugs = $derived(new Set(data.loreSkills.map((l) => l.slug)));
    const trimmedLoreName = $derived(newLoreName.trim());
    const isDuplicateLore = $derived(trimmedLoreName.length > 0 && existingLoreSlugs.has(sluggify(trimmedLoreName)));
    // Prevents a second Enter press from double-creating while the first is in flight
    let addingLore = $state(false);
    const canAddLore = $derived(trimmedLoreName.length > 0 && !isDuplicateLore && !addingLore);

    // Adding or removing a row destroys the focused element; `focusTarget` names its replacement
    // by element id, and `focusOnDemand` focuses it once rendered (clearing the target after use)
    let focusTarget = $state<string | null>(null);
    const focusOnDemand: Attachment<HTMLElement> = (node) => {
        if (focusTarget === node.id) {
            node.focus();
            focusTarget = null;
        }
    };

    // Predicate inputs holding unparseable text: drives `aria-invalid`
    const invalidPredicates = $state<Record<string, boolean>>({});
    async function handlePredicateChange(slug: string, idx: number, raw: string): Promise<void> {
        const key = `${slug}-${idx}`;
        if (await foundryApp.updateSpecialPredicate(slug, idx, raw)) {
            delete invalidPredicates[key];
        } else {
            invalidPredicates[key] = true;
        }
    }

    /** Drop a skill's validity flags at or above an index (its rows re-bind after a removal) */
    function dropInvalidFlags(slug: string, fromIndex = 0): void {
        for (const key of Object.keys(invalidPredicates)) {
            if (key.startsWith(`${slug}-`) && Number(key.slice(slug.length + 1)) >= fromIndex) {
                delete invalidPredicates[key];
            }
        }
    }

    /** An emptied base is stored as null, deferring to the skill's attribute modifier */
    function handleBaseChange(slug: string, value: string): void {
        foundryApp.updateSkillBase(slug, value.trim() === "" ? null : Number(value));
    }

    async function handleAddSkill(): Promise<void> {
        const slug = effectiveUntrained;
        if (!slug) return;
        focusTarget = `${uid}-skill-${slug}-note`;
        await foundryApp.addSkill(slug);
    }

    async function handleRemoveSkill(slug: string): Promise<void> {
        const skills = data.trainedSkills;
        const idx = skills.findIndex((s) => s.slug === slug);
        const neighbor = skills[idx + 1] ?? skills[idx - 1];
        focusTarget = neighbor ? `${uid}-skill-${neighbor.slug}-note` : `${uid}-add-skill`;
        dropInvalidFlags(slug);
        await foundryApp.removeSkill(slug);
    }

    async function handleAddLore(): Promise<void> {
        if (!canAddLore) return;
        addingLore = true;
        try {
            const itemId = await foundryApp.addLore(trimmedLoreName);
            if (itemId) {
                newLoreName = "";
                focusTarget = `${uid}-lore-${itemId}-modifier`;
            }
        } finally {
            addingLore = false;
        }
    }

    async function handleRemoveLore(itemId: string): Promise<void> {
        const lores = data.loreSkills;
        const idx = lores.findIndex((l) => l.itemId === itemId);
        const neighbor = lores[idx + 1] ?? lores[idx - 1];
        focusTarget = neighbor ? `${uid}-lore-${neighbor.itemId}-modifier` : `${uid}-add-lore`;
        await foundryApp.removeLore(itemId);
    }

    async function handleAddSpecial(slug: string, currentCount: number): Promise<void> {
        focusTarget = `${uid}-skill-${slug}-special-${currentCount}-label`;
        await foundryApp.addSpecial(slug);
    }

    async function handleRemoveSpecial(slug: string, idx: number, currentCount: number): Promise<void> {
        const remaining = currentCount - 1;
        focusTarget =
            remaining > 0
                ? `${uid}-skill-${slug}-special-${Math.min(idx, remaining - 1)}-label`
                : `${uid}-skill-${slug}-add-special`;
        dropInvalidFlags(slug, idx);
        await foundryApp.removeSpecial(slug, idx);
    }
</script>

<form class="scrollable" autocomplete="off" data-tooltip-class="pf2e">
    <fieldset>
        <legend>{_loc("PF2E.SkillsLabel")}</legend>
        <div class="skills-list">
            <div class="skill header">
                <div class="name">{_loc("PF2E.SkillLabel")}</div>
                <div>{_loc("PF2E.Actor.NPC.SkillsEditor.Note")}</div>
                <div>{_loc("PF2E.ModifierTitle")}</div>
            </div>
            {#each data.trainedSkills as skill (skill.slug)}
                <div class="skill">
                    <label class="name" for="{uid}-skill-{skill.slug}-modifier">{skill.label}</label>
                    <input
                        type="text"
                        id="{uid}-skill-{skill.slug}-note"
                        aria-label="{skill.label}: {_loc('PF2E.Actor.NPC.SkillsEditor.Note')}"
                        value={skill.note}
                        {@attach focusOnDemand}
                        onchange={(e) => foundryApp.updateSkillNote(skill.slug, e.currentTarget.value)}
                    />
                    <input
                        class="modifier"
                        type="number"
                        id="{uid}-skill-{skill.slug}-modifier"
                        value={skill.base}
                        placeholder="0"
                        onchange={(e) => handleBaseChange(skill.slug, e.currentTarget.value)}
                        onfocus={(e) => e.currentTarget.select()}
                    />
                    <InlineIconButton
                        icon="fa-solid fa-trash"
                        aria-label="{_loc('PF2E.DeleteShortLabel')}: {skill.label}"
                        data-tooltip="PF2E.DeleteShortLabel"
                        onclick={() => handleRemoveSkill(skill.slug)}
                    />
                    {#if skill.special.length > 0}
                        <div class="specials">
                            <div class="special-row header">
                                <span>{_loc("PF2E.Actor.NPC.SkillsEditor.Special")}</span>
                                <span>{_loc("PF2E.Actor.NPC.SkillsEditor.Predicate")}</span>
                                <span>{_loc("PF2E.ModifierTitle")}</span>
                                <InlineIconButton
                                    icon="fa-solid fa-plus"
                                    aria-label="{_loc('PF2E.Actor.NPC.SkillsEditor.AddSpecial')}: {skill.label}"
                                    data-tooltip="PF2E.Actor.NPC.SkillsEditor.AddSpecial"
                                    onclick={() => handleAddSpecial(skill.slug, skill.special.length)}
                                />
                            </div>
                            {#each skill.special as special, idx (idx)}
                                <div class="special-row">
                                    <input
                                        type="text"
                                        id="{uid}-skill-{skill.slug}-special-{idx}-label"
                                        aria-label="{skill.label}: {_loc('PF2E.Actor.NPC.SkillsEditor.Special')}"
                                        value={special.label}
                                        {@attach focusOnDemand}
                                        onchange={(e) =>
                                            foundryApp.updateSpecialLabel(skill.slug, idx, e.currentTarget.value)}
                                    />
                                    <input
                                        type="text"
                                        id="{uid}-skill-{skill.slug}-special-{idx}-predicate"
                                        aria-label="{skill.label}: {_loc('PF2E.Actor.NPC.SkillsEditor.Predicate')}"
                                        aria-invalid={!!invalidPredicates[`${skill.slug}-${idx}`]}
                                        value={special.predicate}
                                        onchange={(e) => handlePredicateChange(skill.slug, idx, e.currentTarget.value)}
                                    />
                                    <input
                                        type="number"
                                        id="{uid}-skill-{skill.slug}-special-{idx}-modifier"
                                        aria-label="{skill.label}: {_loc('PF2E.ModifierTitle')}"
                                        value={special.base}
                                        onchange={(e) =>
                                            foundryApp.updateSpecialBase(
                                                skill.slug,
                                                idx,
                                                Number(e.currentTarget.value),
                                            )}
                                    />
                                    <InlineIconButton
                                        icon="fa-solid fa-trash"
                                        aria-label="{_loc('PF2E.Actor.NPC.SkillsEditor.RemoveSpecial')}: {skill.label}"
                                        data-tooltip="PF2E.Actor.NPC.SkillsEditor.RemoveSpecial"
                                        onclick={() => handleRemoveSpecial(skill.slug, idx, skill.special.length)}
                                    />
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <button
                            type="button"
                            id="{uid}-skill-{skill.slug}-add-special"
                            class="inline-control add-special"
                            aria-label="{_loc('PF2E.Actor.NPC.SkillsEditor.AddSpecial')}: {skill.label}"
                            {@attach focusOnDemand}
                            onclick={() => handleAddSpecial(skill.slug, skill.special.length)}
                        >
                            <i class="fa-solid fa-plus" aria-hidden="true"></i>
                            {_loc("PF2E.Actor.NPC.SkillsEditor.AddSpecial")}
                        </button>
                    {/if}
                </div>
                <hr />
            {/each}

            {#if data.untrainedSkills.length > 0}
                <div class="skill-selector">
                    <select
                        class="name"
                        id="{uid}-add-skill"
                        aria-label={_loc("PF2E.SkillLabel")}
                        value={effectiveUntrained}
                        {@attach focusOnDemand}
                        onchange={(e) => (selectedUntrained = e.currentTarget.value)}
                    >
                        {#each data.untrainedSkills as skill (skill.slug)}
                            <option value={skill.slug}>{skill.label}</option>
                        {/each}
                    </select>
                    <button type="button" onclick={handleAddSkill}>
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        {_loc("PF2E.NPC.AddSkill")}
                    </button>
                </div>
            {/if}
        </div>
    </fieldset>

    <fieldset>
        <legend>{_loc("PF2E.LoreSkillsHeader")}</legend>
        <div class="skills-list">
            <div class="skill header lore">
                <div class="name">{_loc("PF2E.Lore")}</div>
                <div class="modifier-header">{_loc("PF2E.ModifierTitle")}</div>
            </div>

            {#each data.loreSkills as skill (skill.itemId)}
                <div class="skill lore">
                    <label class="name" for="{uid}-lore-{skill.itemId}-modifier">{skill.label}</label>
                    <input
                        class="modifier"
                        type="number"
                        id="{uid}-lore-{skill.itemId}-modifier"
                        value={skill.base}
                        placeholder="0"
                        {@attach focusOnDemand}
                        onchange={(e) => foundryApp.updateLoreMod(skill.itemId, Number(e.currentTarget.value))}
                        onfocus={(e) => e.currentTarget.select()}
                    />
                    <div class="item-controls">
                        <InlineIconButton
                            icon="fa-solid fa-pen-to-square"
                            aria-label="{_loc('PF2E.Edit')}: {skill.label}"
                            data-tooltip="PF2E.Edit"
                            onclick={() => foundryApp.editLore(skill.itemId)}
                        />
                        <InlineIconButton
                            icon="fa-solid fa-trash"
                            aria-label="{_loc('PF2E.DeleteShortLabel')}: {skill.label}"
                            data-tooltip="PF2E.DeleteShortLabel"
                            onclick={() => handleRemoveLore(skill.itemId)}
                        />
                    </div>
                </div>
                <hr />
            {/each}

            <div class="lore-skill-creator">
                <input
                    class="name"
                    type="text"
                    id="{uid}-add-lore"
                    aria-label={_loc("DOCUMENT.FIELDS.name.label")}
                    aria-describedby="{uid}-add-lore-status"
                    aria-invalid={isDuplicateLore}
                    placeholder={_loc("PF2E.Actor.NPC.SkillsEditor.LorePlaceholder")}
                    bind:value={newLoreName}
                    {@attach focusOnDemand}
                    onkeydown={(e) => e.key === "Enter" && handleAddLore()}
                />
                <button type="button" disabled={!canAddLore} onclick={handleAddLore}>
                    <i class="fa-solid fa-plus" aria-hidden="true"></i>
                    {_loc("PF2E.Actor.NPC.SkillsEditor.AddLore")}
                </button>
                <p id="{uid}-add-lore-status" class="lore-status" role="status">
                    {isDuplicateLore ? _loc("PF2E.Actor.NPC.SkillsEditor.LoreAlreadyExists") : ""}
                </p>
            </div>
        </div>
    </fieldset>
</form>

<style lang="scss">
    @mixin subgrid-row {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
    }

    fieldset + fieldset {
        margin-block-start: var(--space-8);
    }

    input[aria-invalid="true"] {
        border-color: var(--color-level-error);
        outline: 1px solid var(--color-level-error);
    }

    .skills-list {
        display: grid;
        gap: var(--space-4) var(--space-10);
        grid-template-columns: 6rem 1fr 4.5rem auto;

        hr {
            grid-column: 1 / -1;
            margin-block: var(--space-4);

            /* When the add-row is absent (e.g. all skills trained), drop the trailing rule. */
            &:last-child {
                display: none;
            }
        }

        > div {
            @include subgrid-row;
            align-items: center;
            padding-block: var(--space-2);
            padding-inline: var(--space-4);
            row-gap: var(--space-4);

            &.skill {
                label.name {
                    color: var(--color-form-label);
                    font-weight: bold;
                }

                &.header {
                    background-color: var(--table-header-bg-color);
                    font-weight: bold;
                    letter-spacing: 0.04em;
                    padding-block: var(--space-4);
                }

                :global(button.inline-control.icon) {
                    justify-self: end;
                }

                > button.add-special {
                    grid-column: 1 / -1;
                    justify-self: start;
                }

                .specials {
                    @include subgrid-row;
                    row-gap: var(--space-6);

                    .special-row {
                        @include subgrid-row;
                        align-items: center;

                        &.header {
                            color: var(--color-form-label);
                            font-weight: bold;
                            text-align: center;
                        }
                    }
                }
            }

            &.lore {
                .name {
                    grid-column: 1 / 3;
                }

                .item-controls {
                    display: flex;
                    gap: var(--space-2);
                }
            }

            &.skill-selector,
            &.lore-skill-creator {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-4) var(--space-10);

                > .name {
                    flex: 1 1 0;
                }
            }

            &.lore-skill-creator .lore-status {
                color: var(--color-level-error);
                flex: 1 1 100%;
                font-size: var(--font-size-12);
                margin-block: var(--space-4) 0;

                &:empty {
                    display: none;
                }
            }
        }
    }
</style>
