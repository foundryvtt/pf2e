import { ItemPF2e } from '@item/base';
import { isPhysicalItem, PhysicalItemData } from '@item/data/types';
import ky from 'ky';
import { ActorPF2e } from './base';
import {
    Abilities,
    Language,
    RawCharacterData,
    RawCharacterDataDetails,
    RawPathfinderSocietyData,
    ValuesList,
} from './data-definitions';

export interface PfsDbEntry {
    _id: string; // Concatenate player and character number
    pfsData: RawPathfinderSocietyData;
    items: PfsDbItem[];
    characterData: {
        abilities: {
            strength: number;
            dexterity: number;
            constitution: number;
            intelligence: number;
            wisdom: number;
            charisma: number;
        };
        details: RawCharacterDataDetails;
        languages: ValuesList<Language>;
    };
}

interface PfsDbItem {
    sourceId: string;
    data?: string; //PhysicalItemData
}

const dbUrl = 'http://localhost:9042';

export const ImportFromPfsDb = async (
    playerNumber: string,
    characterNumber: string,
    actor: ActorPF2e,
): Promise<RawCharacterData> => {
    if (actor.data.type !== 'character') return;
    if (characterNumber === '' || playerNumber === '') {
        throw Error('PFS DB | No PFS identifier');
    }
    console.log(`PFS DB | Fetching ${playerNumber}${characterNumber}`);
    // HTTP GET to DB using PFS ID
    try {
        const response = ky
            .get(`${dbUrl}/pathfinder/${playerNumber.toString()}${characterNumber.toString()}`)
            .json();
        console.log(`PFS DB | Retrieved ${JSON.stringify(await response)}`);
        console.log(`PFS DB | Converting PFS DB Entry to RawCharacterData`);
        UpdateActorFromPfsDbEntry(await response as PfsDbEntry, actor);
    } catch (error) {
        console.log(`PFS DB | ${error}`);
    }
};
export const ExportIntoPfsDb = async (actor: ActorPF2e): Promise<void> => {
    if (actor.data.type !== 'character') return;
    if (actor.data.data.pfs.characterNumber === '' || actor.data.data.pfs.playerNumber === '') {
        throw Error('PFS DB | No PFS identifier');
    }
    console.log(`PFS DB | Converting RawCharacterData to PFS DB Entry`);
    const pfsDataEntry = ConvertActorToPfsDbEntry(actor);
    console.log(`PFS DB | Pushing data to DB`);
    const response = ky.post(
        `${dbUrl}/pathfinder/${pfsDataEntry.pfsData.playerNumber}${pfsDataEntry.pfsData.characterNumber}`,
        { json: pfsDataEntry },
    );
    if ((await response).status === 200 || (await (await response).status) === 201) {
        console.log(`PFS DB | Data Pushed. ${JSON.stringify(await response)}`);
    }
};
export const DeleteFromPfsDb = async (playerNumber: string, characterNumber: string): Promise<void> => {
    if (characterNumber === '' || playerNumber === '') {
        throw Error('PFS DB | No PFS identifier');
    }
    console.log(`PFS DB | Deleting ${playerNumber}${characterNumber} from PFS DB.`);
    const response = ky.delete(`${dbUrl}/pathfinder/${playerNumber}${characterNumber}`);
    if ((await response).status === 200 || (await (await response).status) === 201) {
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
        console.log("PFSDB | Ability Scores Updated from PFSDB.")
        
        // *** Update Details *** //
        const updatedCharacterDetails = pfsDbEntry.characterData.details;
        await existingActor.update({ 'data.details': updatedCharacterDetails });
        console.log("PFSDB | Character details updated from PFSDB.")
        
        // *** Update Languages *** //
        const updatedLanguages = pfsDbEntry.characterData.languages;
        existingActor.update({ 'data.traits.languages': updatedLanguages });
        console.log("PFSDB | Languages updated from PFSDB.")
        
        // *** Grant items *** //
        pfsDbEntry.items.forEach(async (item) => {
            const match = sourceIdPattern.exec(item.sourceId ?? '');
            // This assumes SourceIds are still Compendium.pf2e.<pack>.<id>
            const pack = Array.isArray(match) ? match[1] : undefined;
            console.log(`Pack: ${pack}`)
            const id = Array.isArray(match) ? match[2] : undefined;
            console.log(`Id: ${id}`)
            const lookupData: ItemLookupData = { pack, id };
            grantItem(existingActor, lookupData);
            await updatePhysicalItem(existingActor, item);
        });
    }
};

const sourceIdPattern = /^Compendium\.(pf2e\.[-\w]+)\.(\w+)$/;

interface ItemLookupData {
    pack: string | null;
    id: string;
}

const updatePhysicalItem = async (actor: ActorPF2e, item: PfsDbItem) => {
    await actor.items.entries.forEach(async (entry) => {
        console.log()
        if (entry.sourceId === item.sourceId && item.data) {
            // const originalItem = actor.getOwnedItem(entry.id);
            const updatedItemData = JSON.parse(item.data) as PhysicalItemData;
            console.log(`type of updateItemData: ${typeof updatedItemData}`)
            await actor.updateOwnedItem({ _id: entry._id, ...updatedItemData });
        }
    });
};

const grantItem = async (owner: ActorPF2e, lookupData: ItemLookupData): Promise<void> => {
    const toGrant =
        lookupData.pack === null
            ? game.items.get(lookupData.id)
            : await game.packs.get(lookupData.pack)?.getEntity(lookupData.id);

    const ownerAlreadyHas = (item: ItemPF2e) =>
        owner.items.entries.some((ownedItem) => ownedItem.sourceId === item.sourceId);

    if (toGrant instanceof ItemPF2e && !ownerAlreadyHas(toGrant)) {
        await owner.createEmbeddedEntity('OwnedItem', toGrant.data).catch(error => console.error(error));
    }
};

const ConvertActorToPfsDbEntry = (actor: ActorPF2e): PfsDbEntry => {
    if (actor.data.type !== 'character') return;
    const rawCharacterData = actor.data.data;
    // _id is the unique key in the db is PFS player number concatenated with character number
    const _id = rawCharacterData.pfs.playerNumber + rawCharacterData.pfs.characterNumber;
    // Relevant PFS data captured here.
    const pfsData = rawCharacterData.pfs;
    // Capture Items in a Foundry sense to get Classes, Ancestries, etc.
    const items: PfsDbItem[] = actor.items.map((item) => {
        // This captures item specifics for physical items such as quality, runes, material, etc.
        if (isPhysicalItem(item.data)) {
            return { sourceId: item.sourceId, data: JSON.stringify(item.data) }; 
        } else {
            return { sourceId: item.sourceId };
        }
    });
    const details = rawCharacterData.details
    console.log(JSON.stringify(items))
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
    };
};
