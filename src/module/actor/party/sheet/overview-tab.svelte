<script lang="ts">
    import type { ActorPF2e } from "@actor/base.ts";
    import type { MemberBreakdown, PartySheetState, SkillSheetData } from "./index.ts";
    import { signedInteger } from "@util";
    import * as R from "remeda";
    import type { PartyPF2e } from "../document.ts";
    import { eventToRollParams } from "@module/sheet/helpers.ts";

    interface OverviewProps {
        document: PartyPF2e;
        state: PartySheetState;
    }

    const { state: data, document }: OverviewProps = $props();
    const summaryType = $derived(data.tabGroups.summary);
    const user = $derived(data.user);
    const localize = game.i18n.localize.bind(game.i18n);

    function updateResource(member: MemberBreakdown, delta: number) {
        const actor = fromUuidSync<ActorPF2e>(member.actor.uuid);
        if (actor && member.resource) {
            actor?.updateResource(member.resource.slug, member.resource.value + delta);
        }
    }

    async function openMemberSheet(uuid: string) {
        document.members.find((m) => m.uuid === uuid)?.sheet?.render(true);
    }

    async function removeMember(uuid: string, event: MouseEvent) {
        const actor = document.members.find((m) => m.uuid === uuid);
        if (!game.user.isGM || !actor) return;

        const confirmed = event.ctrlKey
            ? true
            : await Dialog.confirm({
                    title: game.i18n.localize("PF2E.Actor.Party.RemoveMember.Title"),
                    content: game.i18n.localize("PF2E.Actor.Party.RemoveMember.Content"),
                });
        if (confirmed) {
            document.removeMembers(actor);
        }
    }
</script>

<div class="overview">
    {#if !data.members}
        <div class="summary">
            {game.i18n.localize("PF2E.Actor.Party.BlankSlate")}
        </div>
    {/if}

    {#if data.overviewSummary}
        <section class="summary elegant-frame">
            <nav class="tabs">
                <button
                    type="button"
                    data-action="tab"
                    data-group="summary"
                    data-tab="languages"
                    class:active={summaryType === "languages"}
                >
                    {game.i18n.localize("PF2E.Actor.Party.Languages")}
                </button>
                <button
                    type="button"
                    data-action="tab"
                    data-group="summary"
                    data-tab="skills"
                    class:active={summaryType === "skills"}
                >
                    {game.i18n.localize("PF2E.Actor.Party.Skills")}
                </button>
                <button
                    type="button"
                    data-action="tab"
                    data-group="summary"
                    data-tab="rk"
                    class:active={summaryType === "rk"}
                >
                    {game.i18n.localize("PF2E.RecallKnowledge.Label")}
                </button>
            </nav>
            <div class="content">
                <div
                    class="tab fade tags"
                    data-group="summary"
                    data-tab="languages"
                    class:active={summaryType === "languages"}
                >
                    {#if !data.overviewSummary.languages}
                        {game.i18n.localize("PF2E.NoneOption")}
                    {/if}
                    {#each data.overviewSummary.languages as language}
                        <span class="tag tag_alt" data-language={language.slug}>
                            {language.label}{#if language.actors.length > 1}
                                ({language.actors.length}){/if}
                        </span>
                    {/each}
                </div>
                <div
                    class="tab fade skills tags"
                    data-group="summary"
                    data-tab="skills"
                    class:active={summaryType === "skills"}
                >
                    {#each data.overviewSummary.skills as skill}
                        {@render skillTag(skill)}
                    {/each}
                </div>
                <div class="tab fade" data-group="summary" data-tab="rk" class:active={summaryType === "rk"}>
                    <div class="skills tags">
                        {#each data.overviewSummary.knowledge.regular as skill}
                            {@render skillTag(skill)}
                        {/each}
                    </div>
                    <div class="skills tags">
                        {#each data.overviewSummary.knowledge.lore as skill}
                            {@render skillTag(skill)}
                        {/each}
                    </div>
                </div>
            </div>
        </section>
    {/if}

    {#each data.members.entries() as [index, member] (member.actor.uuid)}
        <section class="member" class:readonly={!member.limited} data-actor-uuid={member.actor.uuid}>
            <div class="portrait">
                <button class="flat" onclick={() => openMemberSheet(member.actor.uuid)}>
                    <img src={member.actor.img} alt={member.actor.name}/>
                </button>
                {#if member.hp}
                    <div class="health-bar">
                        {#if member.hp.temp}
                            <div class="temp bar" style="width: {(member.hp.temp * 100) / member.hp.max}%;"></div>
                        {/if}
                        <div class="bar" style="width: {(member.hp.value * 100) / member.hp.max}%;"></div>
                        <span>
                            <i class="fa-solid fa-heart"></i>
                            {member.hp.value} / {member.hp.max}
                        </span>
                    </div>
                {/if}
            </div>
            <div class="data">
                <header>
                    <div class="name">
                        <button class="flat" onclick={() => openMemberSheet(member.actor.uuid)}>{member.actor.name}</button>
                        {#if user.isGM}
                            <button class="flat" onclick={(event) => removeMember(member.actor.uuid, event)} data-tooltip={localize("PF2E.Actor.Party.RemoveMember")} aria-describedby="tooltip">
                                <i class="fa-solid fa-fw fa-times"></i>
                            </button>
                        {/if}
                    </div>
                    {#if member.blurb}
                        <div class="blurb">
                            <span class="level-ancestry-class">{member.blurb}</span>
                            {#if member.genderPronouns}
                                <hr class="vr" />
                                <span class="gender-pronouns">{member.genderPronouns}</span>
                            {/if}
                        </div>
                    {/if}
                    {#if member.resource}
                        {@const resource = member.resource}
                        <button
                            type="button"
                            class="flat resource"
                            class:readonly={!member.owner}
                            onclick={() => updateResource(member, 1)}
                            oncontextmenu={() => updateResource(member, -1)}
                        >
                            {#each R.range(0, resource.max) as idx}
                                {#if resource.value > idx}
                                    <img src="systems/pf2e/dice/basic/heads.webp" alt="H" />
                                {:else}
                                    <span class="empty"></span>
                                {/if}
                            {/each}
                        </button>
                    {/if}
                </header>

                <div class="main-stats">
                    <section class="ac score">
                        <span class="label">{game.i18n.localize("PF2E.ArmorClassShortLabel")}</span>
                        <span class="value">{member.ac}</span>
                    </section>
                    {#if member.saves}
                        <section class="saving-throws">
                            <span class="score">
                                <span class="label">{game.i18n.localize("PF2E.SavesFortitudeShort")}</span>
                                {signedInteger(member.saves.fortitude)}
                            </span>
                            <span class="score">
                                <span class="label">{game.i18n.localize("PF2E.SavesReflexShort")}</span>
                                {signedInteger(member.saves.reflex)}
                            </span>
                            <span class="score">
                                <span class="label">{game.i18n.localize("PF2E.SavesWillShort")}</span>
                                {signedInteger(member.saves.will)}
                            </span>
                        </section>
                    {/if}

                    <section class="score senses">
                        <span class="label">{game.i18n.localize("PF2E.Senses")}</span>
                        <div class="value tags">
                            {#each member.senses as sense}
                                <span class="tag light" data-acuity={sense.acuity} data-tooltip={sense.labelFull}>
                                    {game.i18n.localize(sense.label)}
                                </span>
                            {/each}
                            {#if !member.senses}
                                <span class="blank">{game.i18n.localize("PF2E.Actor.Party.NoSpecialSenses")}</span>
                            {/if}
                        </div>
                    </section>
                </div>

                <div class="skills tags">
                    {#if member.perception}
                        <button
                            type="button"
                            class="perception tag light rollable"
                            class:readonly={!user.isGM}
                            data-rank={member.perception.rank || null}
                            onclick={(event) => document.members[index]?.getStatistic("perception").roll(eventToRollParams(event, { type: "check" }), game.user.isGM ? "gmroll" : "blindroll")}
                        >
                            {member.perception.label}
                            {signedInteger(member.perception.mod)}
                        </button>
                    {/if}
                    {#each member.bestSkills as skill}
                        {@render skillTag(skill)}
                    {/each}
                </div>
            </div>
        </section>
    {/each}
</div>

{#snippet skillTag(skill: SkillSheetData)}
    <span class="tag light" data-slug={skill.slug} data-rank={skill.rank}>
        {game.i18n.localize(skill.label)}
        {signedInteger(skill.mod)}
    </span>
{/snippet}

<style lang="scss">
    @use "../../../../styles/mixins/_frames.scss" as mixins;

    .overview {
        display: flex;
        flex-direction: column;
        overflow: hidden scroll;
        padding-top: 0.5rem;
        padding-bottom: 0.25rem;
        width: 100%;

        .summary {
            display: flex;
            flex-direction: column;
            padding: 0.375rem 0.5rem;
            margin: 0.25rem 1rem 0.25rem 12px;

            /** unset foundry styling */
            .active {
                text-shadow: none;
                outline: none;
                box-shadow: none;
            }

            nav {
                color: var(--alt-dark);
                display: flex;
                gap: 0.25rem;
                line-height: 1.25em;
                margin-bottom: 0.375rem;
                align-items: center;
                justify-content: start;

                button {
                    border: none;
                    font-size: var(--font-size-14);
                    font-weight: 500;
                    padding: 0 0.5rem;
                    white-space: nowrap;
                    width: auto;
                    &.active {
                        background: var(--secondary);
                        color: var(--text-light);

                        /** unset foundry styling */
                        text-shadow: none;
                        outline: none;
                        box-shadow: none;
                    }
                }

                .label {
                    margin-left: auto;
                    margin-right: 0.25rem;
                }
            }

            .content {
                position: relative;
                overflow: hidden;
                .tab {
                    display: flex;
                    flex: 1;
                    flex-direction: column;
                    justify-content: start;
                    align-items: start;
                    gap: 0.25rem;
                }
                .tags,
                .skills {
                    margin: 0;
                    flex-direction: row;
                }
                .skills {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.25rem;
                }
            }
        }

        button.tag.light {
            color: var(--text-light);
            background-color: var(--tag-color);
            &:hover,
            &:focus {
                box-shadow: 0 0 5px var(--color-shadow-primary);
            }
        }

        .member {
            display: flex;
            flex-direction: row;
            font-family: var(--sans-serif);
            padding: 0.5rem 1rem;
            position: relative;
            height: 7.375rem;

            &:not(:last-child):after {
                content: "";
                background-color: rgba(68, 55, 48, 0.1);
                width: 100%;
                height: 1px;
                position: absolute;
                bottom: 0;
            }

            > .portrait {
                margin-right: 8px;
                min-width: 5.5rem;
                position: relative;

                img {
                    position: absolute;
                    border: none;
                    height: 100%;
                    width: 100%;
                    top: 0;
                    object-fit: contain;
                }

                .health-bar {
                    background-color: var(--sub);
                    bottom: 0;
                    color: var(--text-light);
                    font-size: var(--font-size-12);
                    font-weight: 500;
                    height: 1.25rem;
                    line-height: 1.25rem;
                    position: absolute;
                    width: 100%;

                    .bar {
                        position: absolute;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        background-color: var(--primary);
                        box-shadow: 0px 3px 4px rgba(0, 0, 0, 0.2);
                    }

                    .temp {
                        background-color: var(--secondary);
                        top: -0.25rem;
                        height: 0.25rem;
                    }

                    span {
                        padding-left: 0.25rem;
                        position: relative; /* lets it render over the bar */
                    }
                }
            }

            > .data {
                width: 100%;

                header {
                    border-left: 1px solid #c9bfa9;
                    display: grid;
                    grid:
                        "name resource" 1fr
                        "blurb resource" min-content
                        / auto max-content;
                    margin-bottom: 0.25rem;
                    padding-left: 0.5rem;

                    .name {
                        align-items: center;
                        display: flex;
                        font: 600 var(--font-size-18) / 1 var(--serif);
                        grid-area: name;

                        i {
                            font-size: 0.8em;
                            margin-left: 0.125rem;
                        }
                    }

                    .blurb {
                        align-items: center;
                        color: var(--alt-dark);
                        display: flex;
                        font: 500 var(--font-size-14) / var(--font-size-14) var(--sans-serif);
                        font-variant: all-small-caps;
                        gap: 0.25rem;
                        grid-area: blurb;
                        position: relative;

                        hr.vr {
                            border: 1px solid var(--color-border);
                            height: 0.5rem;
                            position: relative;
                            top: 1px;
                        }
                    }

                    .resource {
                        align-items: end;
                        display: flex;
                        gap: 3px;
                        grid-area: resource;
                        width: fit-content;

                        > * {
                            width: 1.5rem;
                            height: 1.5rem;
                        }

                        .empty {
                            border: 2px dashed rgba(0, 0, 0, 0.5);
                            border-radius: 50%;
                        }

                        img {
                            border: none;
                        }
                    }
                }

                .main-stats {
                    display: flex;
                    gap: 0.5rem;
                    margin: 0.125rem 0 0.25rem 0;

                    & > section {
                        border: 1px solid var(--color-border);
                        border-radius: 2px;
                        height: 2.625rem;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        flex: 1 1 0;
                    }

                    .score {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        font-size: var(--font-size-18);

                        .label {
                            font-size: var(--font-size-10);
                            font-weight: 500;
                        }
                    }

                    .ac {
                        border: none;
                        position: relative;
                        flex: 0 0 2.25rem;

                        &::before {
                            content: " ";
                            position: absolute;
                            inset: 0;
                            background: url("/assets/sheet/shield-clear.svg") no-repeat center center;
                            background-size: contain;
                        }

                        .value {
                            color: var(--color-proficiency-trained);
                            font-weight: 700;
                        }
                    }

                    .saving-throws {
                        flex: 0 0 9.5rem;
                        .score {
                            flex: 1;
                            font-weight: 500;
                        }
                    }

                    .senses {
                        align-items: center;
                        flex: 1.4;
                        overflow: hidden;

                        .value {
                            align-items: center;
                            display: flex;
                            font-size: var(--font-size-12);
                            gap: 0.125rem;
                            overflow-x: auto;
                            max-width: 100%;

                            padding: 0 0.5rem;

                            /* if a scrollbar spawns, give it some space */
                            padding-bottom: 7px;
                            margin-bottom: -7px;

                            [data-acuity="imprecise"],
                            [data-acuity="vague"] {
                                border-style: dashed;
                            }
                        }
                    }
                }
            }
        }
    }
</style>
