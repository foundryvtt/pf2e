<script lang="ts">
    interface ExplorationProps {
        state: PartySheetState;
    }
    const { state: data }: ExplorationProps = $props();
</script>

<section class="exploration">
    <aside class="sidebar">
        {#if data.members}
            <ol class="box-list exploration-members">
                <li class="box summary">
                    <header>{game.i18n.localize("PF2E.Actor.Party.TravelHeader")}</header>
                    <div class="summary-data">
                        <div>
                            <span class="label">{game.i18n.localize("PF2E.TravelSpeed.Label")}</span>
                            <span class="value">{data.travel.speed} {game.i18n.localize("PF2E.Foot.Plural")}</span>
                        </div>
                        <hr />
                        <div>
                            <span class="label">{game.i18n.localize("PF2E.TravelSpeed.FeetPerMinute")}</span>
                            <span class="value">{data.travel.feetPerMinute}</span>
                        </div>
                        <div>
                            <span class="label">{game.i18n.localize("PF2E.TravelSpeed.MilesPerHour")}</span>
                            <span class="value">{data.travel.milesPerHour}</span>
                        </div>
                        <div>
                            <span class="label">{game.i18n.localize("PF2E.TravelSpeed.MilesPerDay")}</span>
                            <span class="value">{data.travel.milesPerDay}</span>
                        </div>
                        <hr />
                        <div>
                            <span class="label">{game.i18n.localize("PF2E.TravelSpeed.HexplorationActivities")}</span>
                            <span class="value">{data.travel.activities}</span>
                        </div>
                    </div>
                </li>
                {#each data.members as member}
                    <li class="box member" class:readonly={!member.limited}>
                        <div class="actor-link content" data-action="open-sheet" data-actor-uuid={member.actor.uuid}>
                            <img src={member.actor.img} alt={member.actor.name} />
                            <span class="name">{member.actor.name}</span>
                        </div>
                        {#if !member.restricted}
                            <div class="sub-data">
                                <span>
                                    <i class="fa-solid fa-person-running"></i>
                                    {member.speed}
                                    {game.i18n.localize("PF2E.TravelSpeed.FeetAcronym")}
                                </span>
                                <span>
                                    <i class="fa-solid fa-eye"></i>
                                    {member.perception.dc}
                                </span>
                            </div>
                            <footer class="health-bar">
                                <div class="bar" style="width: {(member.hp.value * 100) / member.hp.max}%;"></div>
                                <span>
                                    <i class="fa-solid fa-heart"></i>
                                    {member.hp.value} / {member.hp.max}
                                </span>
                            </footer>
                        {/if}
                    </li>
                {/each}
            </ol>
        {:else}
            {game.i18n.localize("PF2E.Actor.Party.BlankSlate")}
        {/if}
    </aside>

    <section class="content">
        {#if data.editable}
            <header class="content-header">
                <a data-action="clear-exploration">
                    {game.i18n.localize("PF2E.Actor.Party.ClearActivities.Label")}
                </a>
                <div class="buttons">
                    <button
                        type="button"
                        data-action="prompt"
                        data-tooltip="PF2E.Actor.Party.CheckPrompt.TitleShort"
                        aria-labelledby="tooltip"
                    >
                        <i class="fa-solid fa-dice-d20"></i>
                    </button>
                    <button
                        type="button"
                        data-action="rest"
                        data-tooltip="PF2E.Actor.Party.Rest"
                        aria-labelledby="tooltip"
                    >
                        <i class="fa-solid fa-fw fa-bed"></i>
                    </button>
                </div>
            </header>
        {/if}
        <div class="activities">
            {#each data.members.filter((m) => m.actor.type === "character") as member}
                <section
                    class="member-activity elegant-frame"
                    class:readonly={!member.observer}
                    data-actor-uuid={member.actor.uuid}
                >
                    <div class="actor-image">
                        <img
                            class="actor-link"
                            data-action="open-sheet"
                            data-tab="exploration"
                            src={member.actor.img}
                            alt={member.actor.name}
                        />
                    </div>

                    {#if member.activities.length > 0}
                        <div class="activity-entries">
                            {#each member.activities as activity}
                                <section
                                    class="activity"
                                    class:single={member.activities.length === 1}
                                    data-activity-uuid={activity.uuid}
                                >
                                    <span class="name">{activity.name}</span>
                                    <span class="tags">
                                        {#each Object.values(activity.traits) as trait}
                                            <span class="tag tag_transparent">{trait.label}</span>
                                        {/each}
                                    </span>
                                </section>
                            {/each}
                        </div>
                    {:else}
                        <div class="empty" data-action="open-sheet" data-tab="exploration">
                            <div class="icon"><i class="fa-solid fa-plus fa-fw"></i></div>
                            <div>
                                <div class="name">
                                    {game.i18n.localize("PF2E.Item.Ability.Type.Activity")}
                                </div>
                                <div class="hint">
                                    {game.i18n.localize("PF2E.Actor.Party.SlotAvailable")}
                                </div>
                            </div>
                        </div>
                    {/if}
                </section>
            {/each}
        </div>
    </section>
</section>

<style>
    .exploration {
        display: flex;
        flex: 1;
    }

    .exploration-members {
        .actor-link {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .member {
            .sub-data {
                display: flex;
                flex-direction: row;
                background-color: rgba(68, 55, 48, 0.1);
                font-size: var(--font-size-11);
                font-weight: 500;

                & > span {
                    flex: 1;
                    text-align: center;
                    padding: 0.2rem;
                    &:not(:last-child) {
                        border-right: 1px solid rgba(68, 55, 48, 0.1);
                    }
                }
            }

            footer.health-bar {
                background-color: var(--sub);
                color: var(--text-light);

                .bar {
                    position: absolute;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    background-color: var(--primary);
                    border-radius: 0 0 3px 3px;
                    box-shadow: 0px 3px 4px rgba(0, 0, 0, 0.2);
                }

                span {
                    position: relative; /* lets it render over the bar */
                }
            }
        }
    }

    .content {
        overflow: hidden scroll;
        padding: 0.5rem;
        flex: 1;
    }

    .activities {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .member-activity {
            @include frame-elegant;
            display: flex;
            align-items: center;

            img {
                object-fit: contain;
                border: none;
            }

            .actor-image {
                flex: 0 0 auto;

                img {
                    width: 4rem;
                    height: 4rem;
                    margin: 0.375rem;

                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            }

            .activity-entries {
                display: flex;
                flex-direction: column;
                gap: 0.125rem;
                overflow: hidden;

                .activity {
                    align-items: center;
                    display: flex;
                    gap: 0 0.5rem;
                    margin-left: 0.25rem;
                    white-space: nowrap;
                    .name {
                        font-weight: 500;
                    }
                    .tags {
                        flex-wrap: nowrap;
                        overflow: hidden;
                    }

                    &.single {
                        align-items: start;
                        flex-direction: column;
                        .name {
                            font-size: var(--font-size-16);
                        }
                    }
                }
            }

            .empty {
                align-items: center;
                cursor: pointer;
                display: flex;
                font-family: var(--serif);
                gap: 0.5rem;
                div {
                    margin: 0;
                }
                .icon {
                    border: 1px dashed var(--color-border);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: var(--font-size-14);
                    height: 2.125rem;
                    width: 2.125rem;
                }
                .name {
                    color: var(--primary-dark);
                    font-size: var(--font-size-16);
                    line-height: 1em;
                }
                .hint {
                    color: var(--alt-dark);
                    line-height: 1em;
                }
            }
        }
    }
</style>
