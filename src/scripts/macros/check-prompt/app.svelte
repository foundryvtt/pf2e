<script lang="ts">
    import type { CheckPromptV2Context } from "./prompt-v2.ts";

    const localize = game.i18n.localize.bind(game.i18n);
    
    const dcTabs = [{
            name: "set-dc",
            label: localize("PF2E.Actor.Party.CheckPrompt.SetDC"),
        },
        {
            name: "simple-dc",
            label: localize("PF2E.Actor.Party.CheckPrompt.SimpleDC"),
        },
        {
            name: "level-dc",
            label: localize("PF2E.Actor.Party.CheckPrompt.LevelDC"),
        }];
    const skillSaveTabs = [{
            name: "skill",
            label: localize("PF2E.Actor.Party.CheckPrompt.SkillsPerception"),
        },
        {
            name: "save",
            label: localize("PF2E.SavesHeader"),
        }];

    const {state: data }: CheckPromptV2Context = $props();

    const { proficiencyRanks, dcAdjustments, partyLevel } = $derived(data);

    let activeState = $state({
		dc: "set-dc",
		skillSave: "skill",
        rollOptions: false,
        secret: false,
	});

    let inputState = $state({
        checkTitle: "",
        setDC: null,
        simpleDC: null,
        // this is intened as an initial value, intenden
        // svelte-ignore state_referenced_locally
        partyLevel: partyLevel,
        adjustment: null,
        actions: null,
        skills: null,
        lores: null,
    })



</script>

<div class="content standard-form">
    <section class="form-group title">
        <label for="check-prompt-title">
            {localize("PF2E.Actor.Party.CheckPrompt.PromptTitle")}
        </label>
        <input
            id="check-prompt-title"
            name="title"
            type="text"
            bind:value={inputState.checkTitle}
        />
    </section>
    <hr>
    <nav class="dc tabs">
        {#each dcTabs as tab}
            <button
                class:active={activeState.dc===tab.name}
                onclick={() => activeState.dc = tab.name}
                data-tab-name={tab.name}
            >
                {tab.label}
            </button>
        {/each}
    </nav>
    <section class="dc-content">
        <div class="form-group dc">
            {#if activeState.dc=="set-dc"}
                <label for="check-prompt-dc">{localize("PF2E.Actor.Party.CheckPrompt.SetDC")}</label>
                <input type="number" id="check-prompt-dc" name="dc" bind:value={inputState.setDC}/>
            {:else if activeState.dc=="simple-dc"}
                <label for="check-prompt-simple-dc">{localize("PF2E.Actor.Party.CheckPrompt.SimpleDC")}</label>
                    <select id="check-prompt-simple-dc" name="simple-dc" bind:value={inputState.simpleDC}>
                        <option></option>
                        {#each proficiencyRanks as proficiencyRank}
                            <option value="{proficiencyRank.value}">{proficiencyRank.label}</option>
                        {/each}
                    </select>
            {:else}
                <label for="check-prompt-level-dc">{localize("PF2E.LevelLabel")}</label>
                <input type="number" id="check-prompt-level-dc" name="level-dc" bind:value={inputState.partyLevel} />
            {/if}
        </div>
    </section>
    <div class="form-group">
        <label for="check-prompt-adjust-difficulty">{localize("PF2E.Actor.Party.CheckPrompt.AdjustDifficulty")}</label>
        <select id="check-prompt-adjust-difficulty" name="adjust-difficulty" bind:value={inputState.adjustment}>
            <option></option>
            {#each dcAdjustments as dcAdjustment}
                <option value="{dcAdjustment.value}">{dcAdjustment.label}</option>
            {/each}
        </select>
    </div>
    <hr>
    <nav class="skill-save tabs">
        {#each skillSaveTabs as tab}
            <button
                class:active={activeState.skillSave===tab.name}
                onclick={() => activeState.skillSave = tab.name}
                data-tab-name={tab.name}
            >
                {tab.label}
            </button>
        {/each}
    </nav>
    <section class="check-prompt-content">
        {#if activeState.skillSave=='skill'}
            <div class="form-group">
                <input
                    id="check-prompt-skills"
                    type="text"
                    placeholder="{localize("PF2E.Actor.Party.CheckPrompt.ChooseSkills")}"
                    bind:value={inputState.skills}
                />
            </div>
            <div class="form-group lores">
                <input
                    id="check-prompt-lores"
                    type="text"
                    placeholder="{localize("PF2E.Actor.Party.CheckPrompt.ChooseLores")}"
                    bind:value={inputState.lores}
                />
            </div>
            <div class="form-group">
                <div class="add-roll-options-group">
                    <button
                        id="add-roll-options"
                        class="add-roll-options"
                        onclick={() => {
                            activeState.rollOptions = !activeState.rollOptions
                        }}
                    >
                        <i hidden={activeState.rollOptions} class="fa-solid fa-plus"></i><i hidden={!activeState.rollOptions} class="fa-solid fa-minus"></i>
                        {localize("PF2E.ChatRollDetails.RollOptions")}
                    </button>
                </div>
                <div class="form-group secret">
                    <label for="check-prompt-secret">{localize("PF2E.Actor.Party.CheckPrompt.SecretCheck")}</label>
                    <input id="check-prompt-secret" name="secret" type="checkbox" bind:checked={activeState.secret}/>
                </div>
            </div>
        {#if activeState.rollOptions==true}
            <div class="roll-options">
                <div class="form-group">
                    <input
                        id="check-prompt-actions"
                        type="text"
                        placeholder="{localize("PF2E.ActionActionsLabel")}"
                        bind:value={inputState.actions}
                    />
                </div>
                <div class="form-group">
                    <input id="check-prompt-traits" type="text" placeholder="{localize("PF2E.ChatRollDetails.RollOptions")}" />
                </div>
            </div>
        {/if}
        {:else if activeState.skillSave=="save"}
            <div class="form-group">
                <input id="check-prompt-saves" type="text" placeholder="{localize("PF2E.Actor.Party.CheckPrompt.ChooseSaves")}" />
            </div>
            <div class="form-group">
                <label for="check-prompt-basic-save">{localize("PF2E.Item.Spell.Defense.BasicSave")}</label>
                <input id="check-prompt-basic-save" name="basic-save" type="checkbox" />
            </div>
        {/if}
    </section>
    <hr>
</div>

<style>
    .form-group {
        clear: both;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin: 3px 0;
        align-items: center;

        .secret {
            text-align: right;
        }

        .add-roll-options-group {

            text-align: left;
        }
    }

    button {
        display: flex;
        justify-content: center;
        height: var(--button-size);
        min-height: var(--button-size);
        gap: 0.25rem;
        padding: 0 0.5rem;
        background: var(--button-background-color);
        border: 1px solid var(--button-border-color);
        border-radius: 4px;
        color: var(--button-text-color);
        font-family: var(--font-sans);
        font-size: var(--font-size-14);
        line-height: normal;
        text-decoration: none;
        cursor: var(--cursor-pointer);
        transition: 0.5s;
    }

    .tabs {
        align-items: center;
        display: flex;
        flex-flow: row nowrap;
        gap: 0;
        line-height: unset;
        justify-content: space-around;
        border-top: unset;
        border-bottom: unset;
    }
</style>