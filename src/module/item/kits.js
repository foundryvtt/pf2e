const kits = new Map();

// adventurer's pack
kits.set('rxXT8KPBXa08feFD', [
    {
        // backpack
        id: '3lgwjrFEsQVKzhh7',
        items: [
            {
                // bedroll
                id: 'fagzYdmfYyMQ6J77'
            },
            {
                // 10 pieces chalk
                id: 'xShIDyydOMkGvGNb',
                quantity: 10
            },
            {
                // flint and steel 
                id: 'UlIxxLm71UdRgCFE'
            },
            {
                // 50ft rope
                id: 'fyYnQf1NAx9fWFaS'
            },
            {
                // 2 weeks rations
                id: 'L9ZV076913otGtiB',
                quantity: 14
            },
            {
                // soap
                id: '81aHsD27HFGnq1Nt'
            },
            {
                // 5 torches 
                id: '8Jdw4yAzWYylGePS',
                quantity: 5
            },
            {
                // waterskin
                id: 'VnPh324pKwd2ZB66'
            }
        ],
    },
    {
        // belt pouch 
        id: 'eFqKVKrf62XOGWUw'
    },
    {
        // belt pouch 
        id: 'eFqKVKrf62XOGWUw'
    },
]);

export function isKit(itemId) {
    return kits.has(itemId);
}

async function createKitItem(item, createItem, containerId) {
    const itemId = item.id;
    if (kits.has(itemId)) {
        await createKitItem(itemId, createItem);
    }
    const createItemId = await createItem(itemId, containerId, item.quantity);
    for (const heldItem of item.items ?? []) {
        // eslint-disable-next-line no-await-in-loop
        await createKitItem(heldItem, createItem, createItemId);
    }
}

export async function addKit(itemId, createItem) {
    for (const item of kits.get(itemId)) {
        // eslint-disable-next-line no-await-in-loop
        await createKitItem(item, createItem);
    }
}