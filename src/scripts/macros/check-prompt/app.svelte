<script lang="ts">
    import { adjustDC, calculateDC, calculateSimpleDC } from "@module/dc.ts";
    import { tupleHasValue } from "@util";
    import { PROFICIENCY_RANKS } from "@module/data.ts";
    import { ChatMessagePF2e } from "@module/chat-message/document.ts";

    import type { CheckPromptV2Context } from "./prompt-v2.ts";
    import SvelectePf2e from "@module/sheet/components/svelecte-pf2e.svelte";

    const localize = game.i18n.localize.bind(game.i18n);

    const dcTabs = [
        {
            name: "set-dc",
            label: "PF2E.Actor.Party.CheckPrompt.SetDC",
        },
        {
            name: "simple-dc",
            label: "PF2E.Actor.Party.CheckPrompt.SimpleDC",
        },
        {
            name: "level-dc",
            label: "PF2E.Actor.Party.CheckPrompt.LevelDC",
        },
    ];
    const skillSaveTabs = [
        {
            name: "skill",
            label: "PF2E.Actor.Party.CheckPrompt.SkillsPerception",
        },
        {
            name: "save",
            label: "PF2E.SavesHeader",
        },
    ];

    const { state: data }: CheckPromptV2Context = $props();

    const { actions, dcAdjustments, lores, partyLevel, proficiencyRanks, saves, skills, traits } = $derived(data);

    let inputState = $state({
        checkTitle: "",
        setDC: null,
        simpleDC: null,
        // supress the warning: this is intended as an initial value
        // svelte-ignore state_referenced_locally
        partyLevel: partyLevel,
        adjustment: null,
        actions: "",
        skills: "",
        lores: "",
        saves: "",
        traits: "",
        dc: "set-dc",
        skillSave: "skill",
        rollOptions: false,
        secret: false,
        basic: false,
        clipboard: false,
    });

    function generatePrompt() {
        const checkTypes: string[] = [];
        const checkTraits: string[] = [];
        const checkExtras: string[] = [];

        if (inputState.skillSave === "skill") {
            //skills and lores
            checkTypes.push(...inputState.skills, ...inputState.lores);

            //traits and action traits
            checkTraits.push(...inputState.traits, ...inputState.actions);

            if (inputState.secret && !checkTraits.includes("secret")) {
                checkTraits.push("secret");
            }
        } else if (inputState.skillSave === "save") {
            checkTypes.push(...inputState.saves);
            if (inputState.secret) checkExtras.push("basic:true");

            checkTraits.push(...inputState.traits);
        }

        //traits and action traits

        if (checkTypes.length > 0) {
            const checkFlavor = inputState.checkTitle
                ? `<h4 class="action"><strong>${inputState.checkTitle}</strong></h4><hr>`
                : "";

            const dc = getDC();
            const content = checkTypes.map((type) => constructCheck(type, dc, checkTraits, checkExtras)).join("");
            if (inputState.clipboard) {
                copy(content);
            } else {
                ChatMessagePF2e.create({ author: game.user.id, flavor: checkFlavor, content });
            }
        }
    }

    function getDC(): number | null {
        const dc = ((): number => {
            const pwol = game.pf2e.settings.variants.pwol.enabled;

            if (inputState.dc === "set-dc") {
                return inputState.setDC ?? NaN;
            } else if (inputState.dc === "simple-dc") {
                const profRank = inputState.simpleDC;
                if (tupleHasValue(PROFICIENCY_RANKS, profRank)) {
                    return calculateSimpleDC(profRank, { pwol });
                }
            } else if (inputState.dc === "level-dc") {
                const level = inputState.partyLevel ?? NaN;
                if (Number.isInteger(level)) return calculateDC(+level, { pwol });
            }
            return NaN;
        })();

        if (Number.isInteger(dc)) {
            const dcAdjustment = inputState.adjustment;
            return dcAdjustment ? adjustDC(dc, dcAdjustment) : dc;
        }

        return null;
    }

    function constructCheck(type: string, dc: number | null, traits: string[], extras: string[]): string {
        const parts = [
            type,
            Number.isInteger(dc) ? `dc:${dc}` : null,
            traits.length ? `traits:${traits.join(",")}` : null,
        ]
            .concat(...extras)
            .filter((p) => p);
        return `<p>@Check[${parts.join("|")}]</p>`;
    }

    async function copy(string: string) {
        try {
            await navigator.clipboard.writeText(string);
            ui.notifications.success("Copied check to clipboard!");
        } catch (error: any) {
            console.log(error.message);
        }
    }
</script>

<div class="content standard-form">
    <section class="form-group title">
        <label for="check-prompt-title">
            {localize("PF2E.Actor.Party.CheckPrompt.PromptTitle")}
        </label>
        <input id="check-prompt-title" name="title" type="text" bind:value={inputState.checkTitle} />
    </section>
    <hr />
    <nav class="dc tabs">
        {#each dcTabs as tab}
            <button
                class:active={inputState.dc === tab.name}
                onclick={() => (inputState.dc = tab.name)}
                data-tab-name={tab.name}
            >
                {localize(tab.label)}
            </button>
        {/each}
    </nav>
    <section class="dc-content">
        <div class="form-group dc">
            {#if inputState.dc == "set-dc"}
                <label for="check-prompt-dc">
                    {localize("PF2E.Actor.Party.CheckPrompt.SetDC")}
                </label>
                <input type="number" id="check-prompt-dc" name="dc" bind:value={inputState.setDC} />
            {:else if inputState.dc == "simple-dc"}
                <label for="check-prompt-simple-dc">
                    {localize("PF2E.Actor.Party.CheckPrompt.SimpleDC")}
                </label>
                <select id="check-prompt-simple-dc" name="simple-dc" bind:value={inputState.simpleDC}>
                    <option></option>
                    {#each proficiencyRanks as proficiencyRank}
                        <option value={proficiencyRank.value}>
                            {proficiencyRank.label}
                        </option>
                    {/each}
                </select>
            {:else}
                <label for="check-prompt-level-dc">
                    {localize("PF2E.LevelLabel")}
                </label>
                <input type="number" id="check-prompt-level-dc" name="level-dc" bind:value={inputState.partyLevel} />
            {/if}
        </div>
    </section>
    <div class="form-group">
        <label for="check-prompt-adjust-difficulty">{localize("PF2E.Actor.Party.CheckPrompt.AdjustDifficulty")}</label>
        <select id="check-prompt-adjust-difficulty" name="adjust-difficulty" bind:value={inputState.adjustment}>
            <option></option>
            {#each dcAdjustments as dcAdjustment}
                <option value={dcAdjustment.value}>
                    {dcAdjustment.label}
                </option>
            {/each}
        </select>
    </div>
    <hr />
    <nav class="skill-save tabs">
        {#each skillSaveTabs as tab}
            <button
                class:active={inputState.skillSave === tab.name}
                onclick={() => (inputState.skillSave = tab.name)}
                data-tab-name={tab.name}
            >
                {localize(tab.label)}
            </button>
        {/each}
    </nav>
    <section class="check-prompt-content">
        {#if inputState.skillSave == "skill"}
            <div class="form-group skills">
                <SvelectePf2e
                    options={skills}
                    multiple={true}
                    bind:value={inputState.skills}
                    placeholder={localize("PF2E.Actor.Party.CheckPrompt.ChooseSkills")}
                />
            </div>
            <div class="form-group lores">
                <SvelectePf2e
                    options={lores}
                    multiple={true}
                    bind:value={inputState.lores}
                    placeholder={localize("PF2E.Actor.Party.CheckPrompt.ChooseLores")}
                />
            </div>
        {:else if inputState.skillSave == "save"}
            <div class="form-group saves">
                <SvelectePf2e
                    options={saves}
                    multiple={true}
                    bind:value={inputState.saves}
                    placeholder={localize("PF2E.Actor.Party.CheckPrompt.ChooseSaves")}
                />
            </div>
        {/if}
        <div class="form-group">
            <div class="add-roll-options-group">
                <button
                    id="add-roll-options"
                    class="add-roll-options"
                    onclick={() => {
                        inputState.rollOptions = !inputState.rollOptions;
                    }}
                >
                    <i hidden={inputState.rollOptions} class="fa-solid fa-plus"></i>
                    <i hidden={!inputState.rollOptions} class="fa-solid fa-minus"></i>
                    {localize("PF2E.ChatRollDetails.RollOptions")}
                </button>
            </div>
            <div class="basic-secret-group">
                {#if inputState.skillSave == "skill"}
                    <label for="check-prompt-secret">
                        {localize("PF2E.Actor.Party.CheckPrompt.SecretCheck")}
                    </label>
                    <input id="check-prompt-secret" name="secret" type="checkbox" bind:checked={inputState.secret} />
                {:else if inputState.skillSave == "save"}
                    <label for="check-prompt-basic-save">
                        {localize("PF2E.Item.Spell.Defense.BasicSave")}
                    </label>
                    <input
                        id="check-prompt-basic-save"
                        name="basic-save"
                        type="checkbox"
                        bind:checked={inputState.basic}
                    />
                {/if}
            </div>
        </div>
        {#if inputState.rollOptions == true}
            <div class="roll-options">
                {#if inputState.skillSave == "skill"}
                    <div class="form-group">
                        <SvelectePf2e
                            options={actions}
                            multiple={true}
                            bind:value={inputState.actions}
                            placeholder={localize("PF2E.ActionActionsLabel")}
                        />
                    </div>
                {/if}
                <div class="form-group">
                    <SvelectePf2e
                        options={traits}
                        multiple={true}
                        bind:value={inputState.traits}
                        placeholder={localize("PF2E.ChatRollDetails.RollOptions")}
                    />
                </div>
            </div>
        {/if}
    </section>
    <hr />

    <div class="form-group">
        <div class="clipboard">
            <input id="copy-to-clipboard" name="clipboard" type="checkbox" bind:checked={inputState.clipboard} />
            <label for="copy-to-clipboard">
                <i class="fa-solid fa-copy"></i>
            </label>
        </div>
        <button class="dialog-button post default bright" onclick={() => generatePrompt()}>
            {localize("PF2E.Actor.Party.CheckPrompt.Post")}
        </button>
    </div>
</div>

<style>
    .form-group {
        clear: both;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin: 3px 0;
        align-items: center;

        .basic-secret-group {
            text-align: right;
        }

        .add-roll-options-group {
            text-align: left;
        }
    }

    hr {
        margin: inherit;
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
