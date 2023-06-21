// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { populateFoundryUtilFunctions } from "../fixtures/foundryshim.ts";
import { ActorSourcePF2e, CharacterSource } from "@actor/data/index.ts";
import { MigrationRunner } from "@module/migration/runner/index.ts";
import { MigrationBase } from "@module/migration/base.ts";
import { MockActor } from "tests/mocks/actor.ts";
import { MockItem } from "tests/mocks/item.ts";
import { MockMacro } from "tests/mocks/macro.ts";
import { MockRollTable } from "tests/mocks/roll-table.ts";
import { MockUser } from "tests/mocks/user.ts";
import { MockScene } from "tests/mocks/scene.ts";
import { MockChatMessage } from "tests/mocks/chat-message.ts";
import characterJSON from "../../packs/iconics/amiri-level-1.json";
import armorJSON from "../../packs/equipment/scale-mail.json";
import { ArmorSource, ItemSourcePF2e } from "@item/data/index.ts";
import { FoundryUtils } from "tests/utils.ts";
import { MockActors, MockCollection, MockItems, MockWorldCollection } from "tests/mocks/collection.ts";
import { MockJournalEntry } from "tests/mocks/journal-entry.ts";

const characterData = FoundryUtils.duplicate(characterJSON) as unknown as CharacterSource;
characterData.effects = [];
characterData.system.schema = { version: 0, lastMigration: null };
for (const item of characterData.items) {
    item.effects = [];
    item.system.schema = { version: 0, lastMigration: null };
}

const armorData = FoundryUtils.duplicate(armorJSON) as unknown as ArmorSource;
armorData.effects = [];
armorData.system.schema = { version: 0, lastMigration: null };

describe("test migration runner", () => {
    populateFoundryUtilFunctions();

    const settings = {
        worldSchemaVersion: 10,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).game = {
        data: {
            version: "3.2.1",
        },
        settings: {
            get<K extends keyof typeof settings>(_context: string, key: K): (typeof settings)[K] {
                return settings[key];
            },
            set<K extends keyof typeof settings>(_context: string, key: K, value: (typeof settings)[K]): void {
                settings[key] = value;
            },
        },
        system: {
            data: {
                version: "1.2.3",
                schema: 5,
            },
        },
        actors: new MockActors(),
        i18n: {
            localize: (stringId): string => stringId,
            format: (stringId: string, data: object): string => stringId,
        },
        items: new MockItems(),
        journal: new MockWorldCollection<MockJournalEntry>(),
        macros: new MockWorldCollection<MockMacro>(),
        messages: new MockWorldCollection<MockChatMessage>(),
        tables: new MockWorldCollection<MockRollTable>(),
        users: new MockWorldCollection<MockUser>(),
        packs: new MockCollection(),
        scenes: new MockWorldCollection<MockScene>(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).SceneNavigation = {
        displayProgressBar(...args: unknown): void {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).CONFIG = {
        Actor: { documentClass: MockActor },
        Item: { documentClass: MockItem },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).ui = {
        notifications: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            info(_msg: string, _other?: any) {},
        },
    };

    class Version10 extends MigrationBase {
        static version = 10;
    }

    class Version11 extends MigrationBase {
        static version = 11;
    }

    class ChangeNameMigration extends MigrationBase {
        static version = 12;
        async updateActor(actor: ActorSourcePF2e) {
            actor.name = "updated";
        }
    }

    class ChangeAlignmentMigration extends MigrationBase {
        static version = 12;
        async updateActor(source: CharacterSource) {
            source.system.details.alignment.value = "CG";
        }
    }

    class UpdateItemName extends MigrationBase {
        static version = 13;
        async updateItem(source: ItemSourcePF2e): Promise<void> {
            source.name = "updated";
        }
    }

    class RemoveItemProperty extends MigrationBase {
        static version = 14;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async updateItem(item: any) {
            item.system["-=someFakeProperty"] = null;
        }
    }

    beforeEach(() => {
        settings.worldSchemaVersion = 10;
    });

    test("expect needs upgrade when version older", () => {
        settings.worldSchemaVersion = 5;
        MigrationRunner.LATEST_SCHEMA_VERSION = 11;
        const migrationRunner = new MigrationRunner([new Version10(), new Version11()]);
        expect(migrationRunner.needsMigration()).toEqual(true);
    });

    test("expect doesn't need upgrade when version at latest", () => {
        settings.worldSchemaVersion = 11;
        MigrationRunner.LATEST_SCHEMA_VERSION = 11;
        const migrationRunner = new MigrationRunner([new Version10(), new Version11()]);
        expect(migrationRunner.needsMigration()).toEqual(false);
    });

    test("expect previous version migrations don't run", async () => {
        settings.worldSchemaVersion = 20;

        game.actors.set(characterData._id, new MockActor(characterData));
        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0].name).not.toEqual("updated");
    });

    test("expect update causes version to be updated", async () => {
        game.actors.set(characterData._id, new MockActor(characterData));
        MigrationRunner.LATEST_SCHEMA_VERSION = 12;

        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(settings.worldSchemaVersion).toEqual(12);
    });

    test("expect updated actor name in world", async () => {
        game.actors.set(characterData._id, new MockActor(characterData));

        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0].name).toEqual("updated");
    });

    test("expect update actor deep property", async () => {
        game.actors.set(characterData._id, new MockActor(characterData));

        const migrationRunner = new MigrationRunner([new ChangeAlignmentMigration()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0].system.details.alignment.value).toEqual("CG");
    });

    test.skip("expect unlinked actor in scene gets migrated", async () => {
        characterData._id = "actor1";
        game.actors.set(characterData._id, new MockActor(characterData));
        const scene = new MockScene({});
        scene.addToken({
            _id: "token1",
            actorId: "actor1",
            delta: { name: "original" },
            actorLink: false,
        });
        game.scenes.set(scene.id, scene);

        const migrationRunner = new MigrationRunner([new ChangeNameMigration()]);
        await migrationRunner.runMigration();
        expect(game.scenes.contents[0].tokens[0].actorData.name).toEqual("updated");
    });

    test("update world actor item", async () => {
        game.actors.set(characterData._id, new MockActor(characterData));

        const migrationRunner = new MigrationRunner([new UpdateItemName()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0].items.contents[0].name).toEqual("updated");
    });

    test("update world item", async () => {
        game.items.set(armorData._id, new MockItem(armorData));

        const migrationRunner = new MigrationRunner([new UpdateItemName()]);
        await migrationRunner.runMigration();
        expect(game.items.contents[0].name).toEqual("updated");
    });

    test("properties can be removed", async () => {
        game.items.set(armorData._id, new MockItem(armorData));
        game.items.contents[0].system.someFakeProperty = 123123;

        const migrationRunner = new MigrationRunner([new RemoveItemProperty()]);
        await migrationRunner.runMigration();
        expect("someFakeProperty" in game.items.contents[0].system).toEqual(false);
    });

    test("migrations run in sequence", async () => {
        class ChangeItemProp extends MigrationBase {
            static version = 13;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async updateItem(item: any) {
                item.system.prop = 456;
            }
        }

        class UpdateItemNameWithProp extends MigrationBase {
            static version = 14;
            async updateItem(item: ItemSourcePF2e) {
                item.name = `${item.system.prop}`;
            }
        }

        game.items.set(armorData._id, new MockItem(armorData));
        game.items.contents[0].system.prop = 123;

        const migrationRunner = new MigrationRunner([new ChangeItemProp(), new UpdateItemNameWithProp()]);
        await migrationRunner.runMigration();
        expect(game.items.contents[0].system.prop).toEqual(456);
        expect(game.items.contents[0].name).toEqual("456");
    });

    test("migrations can remove items from actors", async () => {
        class RemoveItemsFromActor extends MigrationBase {
            static version = 13;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async updateActor(actor: any) {
                actor.items = [];
            }
        }

        game.actors.set(characterData._id, new MockActor(characterData));
        expect(game.actors.contents[0].items.size).toBeGreaterThan(0);

        const migrationRunner = new MigrationRunner([new RemoveItemsFromActor()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0].items.size).toEqual(0);
    });

    class AddItemToActor extends MigrationBase {
        static version = 13;

        requiresFlush = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async updateActor(actor: { items: any[] }) {
            actor.items.push({
                name: "sample item",
                type: "melee",
                effects: [],
                system: {
                    schema: {
                        version: null,
                        lastMigration: null,
                    },
                },
            });
        }
    }

    test("migrations can add items to actors", async () => {
        characterData.items = [];
        const actor = new MockActor(characterData);
        game.actors.set(actor.id, actor);

        const migrationRunner = new MigrationRunner([new AddItemToActor()]);
        await migrationRunner.runMigration();

        expect(actor.items.size).toEqual(1);
        expect(actor.items.get("item1")).toBeDefined();
    });

    class SetActorPropertyToAddedItem extends MigrationBase {
        static version = 14;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async updateActor(actor: { items: any[] }) {
            actor.system.sampleItemId = actor.items.find((i: { name: string }) => i.name === "sample item")._id;
        }
    }

    test("migrations can reference previously added items", async () => {
        game.actors.set(characterData._id, new MockActor(characterData));

        const migrationRunner = new MigrationRunner([new AddItemToActor(), new SetActorPropertyToAddedItem()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0].system.sampleItemId).toEqual("item1");
    });

    test.skip("migrations can reference previously added items on tokens", async () => {
        characterData._id = "actor1";
        game.actors.clear();
        game.actors.set(characterData._id, new MockActor(characterData));
        game.actors.contents[0]._source.items = [];

        const scene = new MockScene({});
        scene.addToken({
            _id: "token1",
            actorId: "actor1",
            delta: { name: "original" },
            actorLink: false,
        });
        game.scenes.contents.push(scene);

        const migrationRunner = new MigrationRunner([new AddItemToActor(), new SetActorPropertyToAddedItem()]);
        await migrationRunner.runMigration();
        expect(game.actors.contents[0].system.sampleItemId).toEqual("item2");
    });

    test("expect free migration function gets called", async () => {
        let called = false;
        class FreeFn extends MigrationBase {
            static version = 14;
            async migrate() {
                called = true;
            }
        }

        const migrationRunner = new MigrationRunner([new AddItemToActor(), new FreeFn()]);
        await migrationRunner.runMigration();
        expect(called).toEqual(true);
    });
});
