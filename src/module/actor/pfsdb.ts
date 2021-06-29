import { ItemPF2e } from '@item/base';
import { FeatPF2e } from '@item/feat';
import ky from 'ky';
import { ActorPF2e } from './base';
import { CharacterDataDetails, CharacterSkillData, PathfinderSocietyData } from '../actor/character/data';
import { ValuesList } from '@module/data';
import { Abilities, Language } from './creature/data';

export interface PfsDbEntry {
    _id: string; // Concatenate player and character number
    skills: PfsDbSkills;
    items: PfsDbItem[];
    pfsData: PathfinderSocietyData;
    characterData: {
        abilities: {
            strength: number;
            dexterity: number;
            constitution: number;
            intelligence: number;
            wisdom: number;
            charisma: number;
        };
        details: CharacterDataDetails;
        languages: ValuesList<Language>;
    };
}

interface PfsDbItem {
    sourceId: string;
    data?: string; //PhysicalItemData as JSON so we can rehydrate items after import
}

interface PfsDbSkills {
    // Just the skill ranks for rebuilding character after import.
    acr: Pick<CharacterSkillData, 'rank'>;
    arc: Pick<CharacterSkillData, 'rank'>;
    ath: Pick<CharacterSkillData, 'rank'>;
    cra: Pick<CharacterSkillData, 'rank'>;
    dec: Pick<CharacterSkillData, 'rank'>;
    dip: Pick<CharacterSkillData, 'rank'>;
    itm: Pick<CharacterSkillData, 'rank'>;
    med: Pick<CharacterSkillData, 'rank'>;
    nat: Pick<CharacterSkillData, 'rank'>;
    occ: Pick<CharacterSkillData, 'rank'>;
    prf: Pick<CharacterSkillData, 'rank'>;
    rel: Pick<CharacterSkillData, 'rank'>;
    soc: Pick<CharacterSkillData, 'rank'>;
    ste: Pick<CharacterSkillData, 'rank'>;
    sur: Pick<CharacterSkillData, 'rank'>;
    thi: Pick<CharacterSkillData, 'rank'>;
}

// Should probably make this a configurable value but also have a hard coded default
const dbUrl = 'http://localhost:9042';

export const ImportFromPfsDb = async (
    playerNumber: string,
    characterNumber: string,
    actor: ActorPF2e,
): Promise<void> => {
    if (actor.data.type !== 'character') throw Error('PFSDB | Cannot import from pfsdb onto non-PC Actor');
    if (characterNumber === '' || playerNumber === '') {
        throw Error('PFS DB | No PFS identifier');
    }
    console.log(`PFS DB | Fetching ${playerNumber}${characterNumber}`);
    // HTTP GET to DB using PFS ID
    try {
        const response = ky.get(`${dbUrl}/pathfinder/${playerNumber.toString()}${characterNumber.toString()}`).json();
        console.log(`PFS DB | Retrieved ${JSON.stringify(await response)}`);
        console.log(`PFS DB | Converting PFS DB Entry to RawCharacterData`);
        UpdateActorFromPfsDbEntry((await response) as PfsDbEntry, actor);
    } catch (error) {
        console.log(`PFS DB | ${error}`);
    }
};
export const ExportIntoPfsDb = async (actor: ActorPF2e): Promise<void> => {
    if (actor.data.type !== 'character') {
        console.log(`PFSDB | Cannot export non PC character. (actor.data.type !== 'character')`);
        return;
    }
    if (actor.data.data.pfs.characterNumber === '' || actor.data.data.pfs.playerNumber === '') {
        throw Error('PFS DB | No PFS identifier');
    }
    console.log(`PFSDB | Converting ActorPF2E to PFS DB Entry`);
    const pfsDataEntry = ConvertActorToPfsDbEntry(actor);
    if (!pfsDataEntry) {
        throw Error('Conversion failed');
    }
    console.log(`PFSDB | Pushing data to DB`);
    const response = ky.post(
        `${dbUrl}/pathfinder/${pfsDataEntry.pfsData.playerNumber}${pfsDataEntry.pfsData.characterNumber}`,
        { json: pfsDataEntry },
    );
    if ((await response).status === 200 || (await response).status === 201) {
        console.log(`PFS DB | Data Pushed. ${JSON.stringify(await response)}`);
    }
};
export const DeleteFromPfsDb = async (playerNumber: string, characterNumber: string): Promise<void> => {
    if (characterNumber === '' || playerNumber === '') {
        throw Error('PFS DB | No PFS identifier');
    }
    console.log(`PFS DB | Deleting ${playerNumber}${characterNumber} from PFS DB.`);
    const response = ky.delete(`${dbUrl}/pathfinder/${playerNumber}${characterNumber}`);
    if ((await response).status === 200 || (await response).status === 201) {
        console.log(`PFS DB | Data Deleted. ${(await response).status}`);
    }
};

const UpdateActorFromPfsDbEntry = async (pfsDbEntry: PfsDbEntry, existingActor: ActorPF2e): Promise<void> => {
    if (existingActor.data.type === 'character') {
        // *** Update PFS Data *** //
        console.log(`Old PFS data ${JSON.stringify(existingActor.data.data.pfs)}`);
        await existingActor.update({ 'data.pfs': pfsDbEntry.pfsData });
        console.log(`Updated PFS data ${JSON.stringify(existingActor.data.data.pfs)}`);

        // *** Update Ability Scores *** //
        const oldAbilities = existingActor.data.data.abilities;
        const newAbilities = pfsDbEntry.characterData.abilities;
        const updatedActorAbilities: Abilities = {
            str: { ...oldAbilities.str, value: newAbilities.strength },
            dex: { ...oldAbilities.dex, value: newAbilities.dexterity },
            con: { ...oldAbilities.con, value: newAbilities.constitution },
            int: { ...oldAbilities.int, value: newAbilities.intelligence },
            wis: { ...oldAbilities.wis, value: newAbilities.wisdom },
            cha: { ...oldAbilities.cha, value: newAbilities.charisma },
        };
        await existingActor.update({ 'data.abilities': updatedActorAbilities });
        console.log('PFSDB | Ability Scores Updated from PFSDB.');

        // *** Update Details *** //
        const updatedCharacterDetails = pfsDbEntry.characterData.details;
        await existingActor.update({ 'data.details': updatedCharacterDetails });
        console.log('PFSDB | Character details updated from PFSDB.');

        // *** Update Languages *** //
        const updatedLanguages = pfsDbEntry.characterData.languages;
        existingActor.update({ 'data.traits.languages': updatedLanguages });
        console.log('PFSDB | Languages updated from PFSDB.');

        // *** Grant items *** //
        pfsDbEntry.items.forEach(async (item) => {
            await grantItem(existingActor, item);
        });
    }
};

const sourceIdPattern = /^Compendium\.(pf2e\.[-\w]+)\.(\w+)$/;

interface ItemLookupData {
    pack: string | null;
    id: string;
}

const grantItem = async (owner: ActorPF2e, item: PfsDbItem): Promise<void> => {
    const match = sourceIdPattern.exec(item.sourceId ?? '');
    // This assumes SourceIds are still Compendium.pf2e.<pack>.<id>
    const pack = Array.isArray(match) ? match[1] : undefined;
    console.log(`Pack: ${pack}`);
    const id = Array.isArray(match) ? match[2] : undefined;
    console.log(`Id: ${id}`);
    if (!pack || !id) {
        throw Error(`PFSDB | Failed to parse Compendium pack or id from ${item.sourceId}`);
    }
    const lookupData: ItemLookupData = { pack, id };
    const toGrant =
        lookupData.pack === null
            ? game.items.get(lookupData.id)
            : await game.packs.get(lookupData.pack)?.getDocument(lookupData.id);

    const ownerAlreadyHas = (item: ItemPF2e) => owner.items.some((ownedItem) => ownedItem.sourceId === item.sourceId);

    if (toGrant instanceof ItemPF2e && !ownerAlreadyHas(toGrant)) {
        toGrant.data.flags.pf2e = { grantedBy: 'pfsdb' };
        await owner.createEmbeddedDocuments('Item', [toGrant.data]);
        if (item.data) {
            await owner.items.find((x) => x.sourceId === item.sourceId)?.update({ data: item.data });
        }
    }
};

const ConvertActorToPfsDbEntry = (actor: ActorPF2e): PfsDbEntry | undefined => {
    if (actor.data.type !== 'character') return;
    const rawCharacterData = actor.data.data;
    // _id is the unique key in the db is PFS player number concatenated with character number
    const _id = rawCharacterData.pfs.playerNumber + rawCharacterData.pfs.characterNumber;
    // Relevant PFS data captured here.
    const pfsData = rawCharacterData.pfs;
    console.log(`PFSDB | Added pfsData to be exported.`);
    // Capture Items in a Foundry sense to get Classes, Ancestries, etc.
    const items: PfsDbItem[] = actor.items
        .filter((item) => item.data.isPhysical || !(item as FeatPF2e).data.data.location) // Don't capture if the Item is sourced from somewhere else.
        .map((item) => {
            // This captures item specifics for physical items such as quality, runes, material, etc.
            if (item.data.isPhysical) {
                console.log(
                    `PFSDB | Adding physical item, ${item.data.name}, with sourceId (${item.sourceId}) to be exported.`,
                );
                return { sourceId: item.sourceId, data: JSON.stringify(item.data) };
            } else {
                console.log(
                    `PFSDB | Adding non-physical item, ${item.data.name}, with sourceId (${item.sourceId}) to be exported.`,
                );
                return { sourceId: item.sourceId };
            }
        });
    const details = rawCharacterData.details;
    const skills: PfsDbSkills = {
        acr: { rank: actor.data.data.skills.acr.rank },
        arc: { rank: actor.data.data.skills.arc.rank },
        ath: { rank: actor.data.data.skills.ath.rank },
        cra: { rank: actor.data.data.skills.cra.rank },
        dec: { rank: actor.data.data.skills.dec.rank },
        dip: { rank: actor.data.data.skills.dip.rank },
        itm: { rank: actor.data.data.skills.itm.rank },
        med: { rank: actor.data.data.skills.med.rank },
        nat: { rank: actor.data.data.skills.nat.rank },
        occ: { rank: actor.data.data.skills.occ.rank },
        prf: { rank: actor.data.data.skills.prf.rank },
        rel: { rank: actor.data.data.skills.rel.rank },
        soc: { rank: actor.data.data.skills.soc.rank },
        ste: { rank: actor.data.data.skills.ste.rank },
        sur: { rank: actor.data.data.skills.sur.rank },
        thi: { rank: actor.data.data.skills.thi.rank },
    };
    return {
        _id,
        pfsData,
        items,
        characterData: {
            abilities: {
                strength: rawCharacterData.abilities.str.value,
                dexterity: rawCharacterData.abilities.str.value,
                constitution: rawCharacterData.abilities.str.value,
                intelligence: rawCharacterData.abilities.str.value,
                wisdom: rawCharacterData.abilities.str.value,
                charisma: rawCharacterData.abilities.str.value,
            },
            details,
            languages: rawCharacterData.traits.languages,
        },
        skills,
    };
};
