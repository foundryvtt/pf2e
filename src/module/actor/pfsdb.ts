import { ItemPF2e } from '@item/base';
import { Size } from '@item/data-definitions';
import ky from 'ky';
import { ActorPF2e } from './base';
import {
    AbilityString,
    LabeledString,
    LabeledValue,
    Language,
    RawCharacterData,
    RawPathfinderSocietyData,
    ValuesList,
    ZeroToFour,
} from './data-definitions';

export interface PfsDbEntry {
    _id: string; // Concatenate player and character number
    pfsData: RawPathfinderSocietyData;
    sourceIds: string[]; // flags.core.sourceId: "Compendium.pf2e.ancestryfeatures.mnhmhOKWLiOD0lev"
    characterData: {
        abilities: {
            strength: number;
            dexterity: number;
            constitution: number;
            intelligence: number;
            wisdom: number;
            charisma: number;
        };
        details: {
            alignment: { value: string };
            deity: { value: string; image: string };
            age: { value: string };
            height: { value: string };
            weight: { value: string };
            gender: { value: string };
            ethnicity: { value: string };
            nationality: { value: string };
            biography: { value: string; public?: string };
            xp: {
                value: number;
                min: number;
                max: number;
                pct: number;
            };
            level: {
                value: number;
                min: number;
            };
        };
        languages: ValuesList<Language>;
    };
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
    console.log(`PFS DB | Fetching ${playerNumber}-${characterNumber}`);
    // GET to DB using PFS ID
    try {
        const response = ky
            .get(`${dbUrl}/pathfinder/${playerNumber.toString()}${characterNumber.toString()}`)
            .json<PfsDbEntry>();
        console.log(`PFS DB | Retrieved ${JSON.stringify(await response, null, 1)}`);
        console.log(`PFS DB | Converting PFS DB Entry to RawCharacterData`);
        const newRawCharacterData = ConvertPfsDbEntryToActor(await response, actor);
        return newRawCharacterData;
    } catch (error) {
        console.log(`PFS DB | ${error}`);
    }
};
export const ExportIntoPfsDb = async (actor: ActorPF2e): Promise<void> => {
    if (actor.data.type !== 'character') return;
    actor.items.forEach((x) => {
        console.log(x.name);
        console.log(x.getFlag('core', 'sourceId'));
        // console.log(JSON.stringify(x, null, 1));
    });
    if (actor.data.data.pfs.characterNumber === '' || actor.data.data.pfs.playerNumber === '') {
        throw Error('PFS DB | No PFS identifier');
    }
    console.log(`PFS DB | Converting RawCharacterData to PFS DB Entry`);
    // console.log(`Data to be converted: ${JSON.stringify(actor, null, 1)}`);
    const pfsDataEntry = ConvertActorToPfsDbEntry(actor);
    console.log(`PFS DB | Pushing data to DB`);
    // console.log(`PFS DB | ${JSON.stringify(pfsDataEntry, null, 1)}`);
    // POST to DB using PFS Id and Data
    const response = ky.post(
        `${dbUrl}/pathfinder/${pfsDataEntry.pfsData.playerNumber.concat(pfsDataEntry.pfsData.characterNumber)}`,
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
    console.log(`PFS DB | Deleting ${playerNumber}-${characterNumber} from PFS DB.`);
    const response = ky.delete(`${dbUrl}/pathfinder/${playerNumber}${characterNumber}`);
    if ((await response).status === 200 || (await (await response).status) === 201) {
        console.log(`PFS DB | Data Deleted. ${(await response).status}`);
    }
};

const ConvertPfsDbEntryToActor = (pfsDbEntry: PfsDbEntry, existingActor: ActorPF2e): RawCharacterData => {
    if (existingActor.data.type !== 'character') return;
    const rawCharacterData = existingActor.data.data;
    const fortitude = rawCharacterData.saves.fortitude;
    fortitude.rank = pfsDbEntry.characterData.saves.fortitude;
    const reflex = rawCharacterData.saves.reflex;
    reflex.rank = pfsDbEntry.characterData.saves.reflex;
    const will = rawCharacterData.saves.will;
    will.rank = pfsDbEntry.characterData.saves.will;

    const mergedData: RawCharacterData = {
        ...rawCharacterData,
        pfs: pfsDbEntry.pfsData,
        abilities: {
            str: { ...rawCharacterData.abilities.str, value: pfsDbEntry.characterData.abilities.strength },
            dex: { ...rawCharacterData.abilities.dex, value: pfsDbEntry.characterData.abilities.dexterity },
            con: {
                ...rawCharacterData.abilities.con,
                value: pfsDbEntry.characterData.abilities.constitution,
            },
            int: {
                ...rawCharacterData.abilities.int,
                value: pfsDbEntry.characterData.abilities.intelligence,
            },
            wis: { ...rawCharacterData.abilities.wis, value: pfsDbEntry.characterData.abilities.wisdom },
            cha: { ...rawCharacterData.abilities.cha, value: pfsDbEntry.characterData.abilities.charisma },
        },
        details: { ...pfsDbEntry.characterData.details },
        saves: { fortitude, reflex, will },
        attributes: {
            ...rawCharacterData.attributes,
            speed: { ...rawCharacterData.attributes.speed, ...pfsDbEntry.characterData.speed },
        },
        traits: {
            ...rawCharacterData.traits,
            size: { value: pfsDbEntry.characterData.size },
            senses: pfsDbEntry.characterData.senses,
            traits: pfsDbEntry.characterData.traits,
            languages: pfsDbEntry.characterData.languages,
        },
    };
    return mergedData;
};

interface ItemLookupData {
    pack: string | null;
    id: string;
}

const grantItem = async (owner: ActorPF2e, lookupData: ItemLookupData): Promise<void> => {
    const toGrant =
        lookupData.pack === null
            ? game.items.get(lookupData.id)
            : await game.packs.get(lookupData.pack)?.getEntity(lookupData.id);

    const ownerAlreadyHas = (item: ItemPF2e) =>
        owner.items.entries.some((ownedItem) => ownedItem.sourceId === item.sourceId);

    if (toGrant instanceof ItemPF2e && !ownerAlreadyHas(toGrant)) {
        await owner.createEmbeddedEntity('OwnedItem', toGrant.data);
    }
};

const valueIsLookupData = (value: unknown): value is ItemLookupData => {
    return value instanceof Object && 'pack' in value && 'id' in value;
};

const ConvertActorToPfsDbEntry = (actor: ActorPF2e): PfsDbEntry => {
    if (actor.data.type !== 'character') return;
    const RawCharacterData = actor.data.data;
    return {
        _id: `${RawCharacterData.pfs.playerNumber}${RawCharacterData.pfs.characterNumber}`,
        pfsData: RawCharacterData.pfs,
        characterData: {
            abilities: {
                strength: RawCharacterData.abilities.str.value,
                dexterity: RawCharacterData.abilities.dex.value,
                constitution: RawCharacterData.abilities.con.value,
                intelligence: RawCharacterData.abilities.int.value,
                wisdom: RawCharacterData.abilities.wis.value,
                charisma: RawCharacterData.abilities.cha.value,
            },
            saves: {
                fortitude: RawCharacterData.saves.fortitude.rank,
                reflex: RawCharacterData.saves.reflex.rank,
                will: RawCharacterData.saves.will.rank,
            },
            details: RawCharacterData.details,
            speed: RawCharacterData.attributes.speed,
            size: RawCharacterData.traits.size.value,
            traits: RawCharacterData.traits.traits,
            senses: RawCharacterData.traits.senses,
            languages: RawCharacterData.traits.languages,
        },
    };
};
