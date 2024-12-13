<script lang="ts">
    import type { PartySheetContext } from "./sheet-new.ts";
    import OverviewTab from "./components/overview-tab.svelte";
    import SubNavigation from "./components/sub-navigation.svelte";
    import Coinage from "@module/sheet/components/coinage.svelte";

    const { state: data }: PartySheetContext = $props();
    const actor = data.actor;
    const inventorySummary = data.inventorySummary;
    const playerRestricted = data.playerRestricted;
    const restricted = data.restricted;

    // Get the tab. This variable is not responsive, and we're relying on foundry for future changes
    const tab = $derived(data.tabGroups.main === "overview" && restricted ? "exploration" : data.tabGroups.main);
</script>

<div class="party-sheet">
    <header class="sheet-header">
        <div class="frame-container">
            <div class="frame">
                <img class="player-image" alt={actor.name} src={actor.img} data-tooltip={actor.name} data-edit="img" />
            </div>
        </div>
        <div class="details">
            <input
                name="name"
                class="name"
                id="{actor.uuid}-name"
                type="text"
                disabled={!data.editable}
                value={actor.name}
                placeholder={game.i18n.localize("PF2E.CharacterNamePlaceholder")}
            />
            <label class="actor-type" for="{actor.uuid}-name">{game.i18n.localize("TYPES.Actor.party")}</label>
            {#if data.user.isGM}
                <a class="visibility" class:restricted={playerRestricted} data-action="open-meta-setting">
                    {#if playerRestricted}
                        <i class="fa-solid fa-eye-slash"></i>
                        {game.i18n.localize("PF2E.Actor.Party.Visibility.Restricted")}
                    {:else}
                        <i class="fa-solid fa-eye"></i>
                        {game.i18n.localize("PF2E.Actor.Party.Visibility.Unrestricted")}
                    {/if}
                </a>
            {/if}
        </div>
    </header>

    <SubNavigation>
        {#if !restricted}
            <a class:active={tab === "overview"} data-action="tab" data-group="main" data-tab="overview">
                {game.i18n.localize("PF2E.Actor.Party.Tabs.Overview")}
            </a>
        {/if}
        <a class:active={tab === "exploration"} data-action="tab" data-group="main" data-tab="exploration">
            {game.i18n.localize("PF2E.Actor.Party.Tabs.Exploration")}
        </a>
        <a class:active={tab === "inventory"} data-action="tab" data-group="main" data-tab="inventory">
            {game.i18n.localize("PF2E.Actor.Party.Tabs.Stash")}
        </a>
        {#if data.orphaned.length > 0}
            <a class:active={tab === "orphaned"} data-action="tab" data-group="main" data-tab="orphaned"
                >{game.i18n.localize("PF2E.Actor.Party.Tabs.Orphaned")}</a
            >
        {/if}
    </SubNavigation>

    <section class="container">
        <div class="tab fade" data-group="main" data-tab="overview" class:active={tab === "overview"}>
            <OverviewTab members={data.members} summary={data.overviewSummary} user={data.user} />
        </div>

        <div class="exploration tab fade" data-group="main" data-tab="exploration" class:active={tab === "exploration"}>
            <aside class="sidebar">
                {#if data.members}
                    <ol class="box-list exploration-members">
                        <li class="box summary">
                            <header>{game.i18n.localize("PF2E.Actor.Party.TravelHeader")}</header>
                            <div class="summary-data">
                                <div>
                                    <label>{game.i18n.localize("PF2E.TravelSpeed.Label")}</label>
                                    <span class="value"
                                        >{data.explorationSummary.speed} {game.i18n.localize("PF2E.Foot.Plural")}</span
                                    >
                                </div>
                                <hr />
                                <div>
                                    <label>{game.i18n.localize("PF2E.TravelSpeed.FeetPerMinute")}</label>
                                    <span class="value">{data.explorationSummary.feetPerMinute}</span>
                                </div>
                                <div>
                                    <label>{game.i18n.localize("PF2E.TravelSpeed.MilesPerHour")}</label>
                                    <span class="value">{data.explorationSummary.milesPerHour}</span>
                                </div>
                                <div>
                                    <label>{game.i18n.localize("PF2E.TravelSpeed.MilesPerDay")}</label>
                                    <span class="value">{data.explorationSummary.milesPerDay}</span>
                                </div>
                                <hr />
                                <div>
                                    <label>{game.i18n.localize("PF2E.TravelSpeed.HexplorationActivities")}</label>
                                    <span class="value">{data.explorationSummary.activities}</span>
                                </div>
                            </div>
                        </li>
                        {#each data.members as member}
                            <li class="box member" class:readonly={!member.limited}>
                                <div
                                    class="actor-link content"
                                    data-action="open-sheet"
                                    data-actor-uuid={member.actor.uuid}
                                >
                                    <img src={member.actor.img} />
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
                                        <div
                                            class="bar"
                                            style="width: {(member.hp.value * 100) / member.hp.max}%;"
                                        ></div>
                                        <span
                                            ><i class="fa-solid fa-heart"></i> {member.hp.value} / {member.hp.max}</span
                                        >
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
                        <a data-action="clear-exploration"
                            >{game.i18n.localize("PF2E.Actor.Party.ClearActivities.Label")}</a
                        >
                        <div class="buttons">
                            <button
                                type="button"
                                data-action="prompt"
                                data-tooltip="PF2E.Actor.Party.CheckPrompt.TitleShort"
                                ><i class="fa-solid fa-dice-d20"></i></button
                            >
                            <button type="button" data-action="rest" data-tooltip="PF2E.Actor.Party.Rest"
                                ><i class="fa-solid fa-fw fa-bed"></i></button
                            >
                        </div>
                    </header>
                {/if}
                <div class="activities">
                    {#each data.members as member}
                        {#if member.actor.type === "character"}
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
                        {/if}
                    {/each}
                </div>
            </section>
        </div>

        <div class="tab inventory fade" data-group="main" data-tab="inventory" class:active={tab === "inventory"}>
            <aside class="sidebar">
                {#if data.members}
                    <ol class="box-list inventory-members">
                        {#if !restricted}
                            <li class="box summary">
                                <header>{game.i18n.localize("PF2E.Actor.Party.Total")}</header>
                                <div class="summary-data">
                                    <div>
                                        <label
                                            ><i class="fa-solid fa-coins fa-fw"></i>
                                            {game.i18n.localize("PF2E.Actor.Party.Coin")}</label
                                        >
                                        <span class="value"
                                            >{inventorySummary.totalCoins.toFixed(2)}
                                            {game.i18n.localize("PF2E.CurrencyAbbreviations.gp")}</span
                                        >
                                    </div>
                                    <div>
                                        <label
                                            ><i class="fa-solid fa-scale-unbalanced fa-fw"></i>
                                            {game.i18n.localize("PF2E.Actor.Party.Wealth")}</label
                                        >
                                        <span class="value"
                                            >{inventorySummary.totalWealth.toFixed(2)}
                                            {game.i18n.localize("PF2E.CurrencyAbbreviations.gp")}</span
                                        >
                                    </div>
                                </div>
                                <footer>
                                    <i class="fa-solid fa-weight-hanging"></i>
                                    {game.i18n.localize("PF2E.Item.Physical.Bulk.Label")}
                                    {inventorySummary.totalBulk}
                                </footer>
                            </li>
                        {/if}
                        {#each data.members as member}
                            <li class="box" class:readonly={!member.limited}>
                                <div
                                    class="actor-link content"
                                    data-actor-uuid={member.actor.uuid}
                                    data-action="open-sheet"
                                    data-tab="inventory"
                                >
                                    <img src={member.actor.img} />
                                    <div class="sub-data">
                                        <div class="name">{member.actor.name}</div>
                                        {#if !member.restricted}
                                            <div class="value">
                                                <i class="fa-solid fa-scale-unbalanced"></i>
                                                {member.totalWealth.toFixed(2)}
                                                {game.i18n.localize("PF2E.CurrencyAbbreviations.gp")}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                                {#if !member.restricted}
                                    <footer>
                                        <i class="fa-solid fa-weight-hanging"></i>
                                        {game.i18n.localize("PF2E.Item.Physical.Bulk.Label")}
                                        {member.bulk}
                                    </footer>
                                {/if}
                            </li>
                        {/each}
                    </ol>
                {:else}
                    {game.i18n.localize("PF2E.Actor.Party.BlankSlate")}
                {/if}
            </aside>

            <section class="inventory">
                <Coinage
                    editable={data.editable}
                    coinage={data.inventory.coinage}
                    canDistribute={data.inventory.canDistributeCoins}
                />
                <!-- {> "systems/pf2e/templates/actors/partials/coinage.hbs" owner=data.owner}
                {> "systems/pf2e/templates/actors/partials/inventory.hbs"}
                {> "systems/pf2e/templates/actors/partials/total-bulk.hbs"} -->
            </section>
        </div>

        {#if data.orphaned.length}
            <div class="tab fade" data-group="main" data-tab="orphaned" class:active={tab === "exploration"}>
                <ol class="item-list directory-list">
                    {#each data.orphaned as item}
                        {#if item.isIdentified || data.user.isGM}
                            <li class="item" data-item-type={item.type} data-item-id={item.id}>
                                <div class="item-name">
                                    <a
                                        class="item-image"
                                        data-action="item-to-chat"
                                        style="background-image: url({item.img})"
                                    >
                                        <i class="fa-solid fa-message"></i>
                                    </a>
                                    <h4 class="action-name">{item.name}</h4>
                                </div>
                                <div class="item-controls">
                                    {#if data.editable && !item.temporary}
                                        <a data-action="delete-item" data-tooltip="PF2E.DeleteItemTitle"
                                            ><i class="fa-solid fa-fw fa-trash"></i></a
                                        >
                                    {/if}
                                </div>
                            </li>
                        {/if}
                    {/each}
                </ol>
            </div>
        {/if}
    </section>
</div>

<style lang="scss">
    @use "src/styles/mixins/_frames.scss" as frames;

    .party-sheet {
        --color-border: rgba(0, 0, 0, 0.28);
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;

        background: url("/assets/sheet/background.webp");
        background-repeat: no-repeat;
        background-size: cover;
        background-attachment: local;

        /** Top level properties and reusable classes for the sheet */
        :global {
            .tab.fade {
                transition: opacity 0.2s ease-in-out;
                flex: 1;

                &:not(.active) {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    opacity: 0;
                    pointer-events: none;
                }

                &.active {
                    opacity: 1;
                }
            }

            .actor-link {
                cursor: pointer;
            }

            .readonly {
                pointer-events: none;
                a,
                button {
                    pointer-events: none;
                }
            }

            .elegant-frame {
                border-image-repeat: repeat;
                border-image-slice: 11;
                border-image-source: url("/assets/sheet/frame-elegant.svg");
                border-image-width: 14px;
                border-style: double;
            }

            .tag.light {
                --tag-color: var(--color-proficiency-untrained);
                font: 700 var(--font-size-13) / 1.25rem var(--sans-serif);
                font-variant: all-small-caps;
                &[data-rank="1"] {
                    --tag-color: var(--color-proficiency-trained);
                }
                &[data-rank="2"] {
                    --tag-color: var(--color-proficiency-expert);
                }
                &[data-rank="3"] {
                    --tag-color: var(--color-proficiency-master);
                }
                &[data-rank="4"] {
                    --tag-color: var(--color-proficiency-legendary);
                }
            }
        }
    }

    header.sheet-header {
        background: url("/assets/sheet/header-bw.webp"), url("/assets/sheet/background.webp");
        background-repeat: repeat-x, no-repeat;
        background-size: cover;
        background-color: #2f9d50;
        background-blend-mode: multiply;
        color: var(--text-light);

        width: 100%;
        font-family: var(--sans-serif);
        text-transform: uppercase;
        font-weight: 600;

        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 0.75rem;
        gap: 8px;

        box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);

        .frame-container {
            flex: 0 0 60px;
            padding: 4px; /* frames use shadows to create the border, so we need to offset it */
            margin: 0.75rem 0;

            .frame {
                position: relative;
                width: 2.5rem;
                height: 2.5rem;
            }

            .player-image {
                object-fit: cover;
                object-position: top;
                border: none;
                border-radius: 0;
                width: 100%;
                cursor: pointer;
                border: none;
                box-shadow:
                    0 0 0 1px #918c88,
                    0 0 0 2px #e1d8cf,
                    0 0 0 3px #a98f39,
                    inset 0 0 8px rgba(0, 0, 0, 0.5),
                    0 0 8px black;
            }
        }

        input[type="text"],
        input[type="number"] {
            color: var(--text-light);
            border: none;
            border-bottom: 1px solid transparent;
            &:not(:disabled):hover,
            &:focus {
                border: none;
                border-bottom: 1px solid var(--text-light);
                box-shadow: none;
            }
        }

        .details {
            margin: 4px 0;
            flex: 1;
        }

        .details {
            display: grid;
            grid:
                "name type" 1fr
                "name visibility" auto
                / 1fr auto;
            align-items: center;
            gap: 0 0.5rem;

            font-family: var(--serif-condensed);
            font-size: var(--font-size-28);
            font-weight: 700;

            .name {
                grid-area: name;
                flex: 1;
                font-size: var(--font-size-32);
            }

            .actor-type {
                grid-area: type;
                text-align: end;
            }

            .visibility {
                grid-area: visibility;
                font-size: var(--font-size-14);
                opacity: 0.8;

                i {
                    font-size: 0.9em;
                    margin-right: 0.125rem;
                }
            }
        }
    }

    .container {
        height: 100%;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;

        > .tab {
            display: flex;
            width: 100%;
            flex: 1;
            overflow: hidden;
        }
    }

    .content {
        overflow: hidden scroll;
        flex: 1;
    }

    .item-list.directory-list {
        @include effects-list;
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 0;
        margin: 0;

        .item {
            margin: 2px 0;
            border: solid transparent;
            border-width: 0 0 1px;
            border-image: linear-gradient(90deg, #f1edea, #d5cac1) 1 repeat;
            .item-summary {
                margin-top: 8px;
            }
        }
    }

    header.content-header {
        align-items: center;
        background-color: var(--sub);
        color: var(--text-light);
        display: flex;
        font-weight: 600;
        margin-bottom: 0.5rem;
        padding: 0 0.5rem;
        line-height: 2.375rem;

        .buttons {
            align-items: center;
            display: flex;
            margin-left: auto;
        }

        button {
            background-color: var(--tertiary);
            border: 1px solid var(--alt-dark);
            border-radius: 0;
            color: var(--alt-dark);
            min-width: 2.375rem;
            height: 1.875rem;
            margin: 0;
            & + button {
                margin-left: -1px;
            }
        }

        button:hover {
            z-index: 1;
        }
    }

    .sidebar {
        overflow: hidden scroll;
        border-right: 1px solid #888;
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: 100%;
        padding: 0.5rem;
        width: 13.5rem;

        .box-list {
            display: flex;
            color: var(--alt-dark);
            flex-direction: column;
            font-family: var(--sans-serif);
            gap: 0.5rem;
            list-style-type: none;
            padding: 0;
            margin: 0;
        }

        .box {
            border: 1px solid var(--color-border);
            box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.18);
            font-family: var(--sans-serif);
            border-radius: 3px;
            font-size: var(--font-size-12);

            .summary-data {
                & > div {
                    align-items: center;
                    display: flex;
                    margin: 0 0.5rem;
                    line-height: 1.375rem;
                    label {
                        flex: 1;
                        font-weight: 600;
                    }
                }
            }

            hr {
                /* compensate for border to maintain vertical rhythm */
                margin: -1px 0;
            }

            .actor-link {
                img {
                    border: none;
                    width: 2rem;
                    height: 2rem;
                    object-fit: contain;
                }
            }

            .name {
                font-weight: 700;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            header,
            footer {
                position: relative;
                margin: -1px; /* ensure border radius lines up */
                padding: 0 0 0 calc(0.5rem + 1px);
            }

            header {
                background-color: var(--sub);
                border-radius: 3px 3px 0 0;
                color: var(--text-light);
                font-weight: 700;
                height: 1.375rem;
                line-height: 1.375rem;
                margin-bottom: 0;
            }

            footer {
                background-color: var(--bg-dark);
                border-radius: 0 0 3px 3px;
                border: 1px solid var(--color-border);
                border-top: none;
                color: var(--sub);
                font-weight: 500;
                height: 1.125rem;
                line-height: 1.125rem;
                margin-top: 0;
            }
        }
    }

    .exploration {
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
            padding: 0.5rem;
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

                        i {
                            color: var(--text-dark);
                            font-size: var(--font-size-30);
                        }
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
    }

    .inventory-members {
        .box {
            .content {
                align-items: center;
                display: flex;
                padding: 0.5rem;
                overflow: hidden;

                img {
                    grid-area: image;
                    margin-right: 0.4rem;
                }

                .sub-data {
                    display: flex;
                    flex-direction: column;
                    gap: 0.125rem;
                }
            }

            footer {
                align-items: baseline;
                display: flex;
                gap: 0.25rem;
                i {
                    align-self: center;
                    font-size: 0.85em;
                }
            }

            .inventory-data {
                display: flex;
                gap: 0.25rem;
                padding: 2px 3px;
                font-size: var(--font-size-12);
            }
        }
    }
</style>
