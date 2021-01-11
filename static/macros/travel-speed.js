function escapeHtml(html) {
    const text = document.createTextNode(html);
    const p = document.createElement('p');
    p.appendChild(text);
    return p.innerHTML;
}

// Must match TravelActivities enum order!
const explorationActivities = [
    'Full Speed',
    'Half Speed',
    'Anticipate Ambush',
    'Avoid Notice',
    'Cover Tracks',
    'Defend',
    'Detect Magic',
    'Investigate',
    'Repeat a Spell',
    'Scout',
    'Search',
    'Track',
];

const terrainModifiers = {
    standard: 1,
    difficult: 2,
    greaterDifficult: 3,
};

function travelPopupTemplate(actors) {
    return `
    <form>
        <h2>Party Speed</h2>
        <table>
            <tbody>
                <tr>
                    <th>Name</th>
                    <th>Travel Speed</th>
                    <th>Speed Unit</th>
                    <th>Exploration Action</th>
                    <th>Detection Mode</th>
                </tr>
                <tr>
                    <td>Barl Breakbones</td>
                    <td><input type="number" value="25"></td>
                    <td>
                        <select>
                            <option>feet</option>
                            <option>miles</option>
                        </select>
                    </td>
                    <td>
                        <select>
                            ${explorationActivities.map(
                                (value, index) => `<option value="${index}">${escapeHtml(value)}</option>`,
                            )} 
                        </select>
                    </td>
                    <td>
                        <select>
                            <option>None</option>
                            <option>Detect Everything</option>
                            <option>Detect Before Running Into It</option>
                        </select>
                    </td>
                </tr>
            </tbody>
        </table>
        
        <h2>Movement Speed Reduction</h2>
        <p>Change these if your players have feats that change difficult terrain costs</p>
        <div class="form-group">
            <label>Greater Difficult Terrain</label>
            <input value="1/3" type="text">
        </div>
        <div class="form-group">
            <label>Difficult Terrain</label>
            <input value="1/2" type="text">
        </div>
        <div class="form-group">
            <label>Normal Terrain</label>
            <input value="1" type="text">
        </div>
        
        <h2>Journey</h2>
        <div class="form-group">
            <label>Distance</label>
            <input value="1" type="text">
        </div>
        <div class="form-group">
            <label>Distance Unit</label>
            <select>
                <option>feet</option>
                <option>miles</option>
            </select>
        </div>
        <div class="form-group">
            <label>Terrain</label>
            <select>
                <option>Normal</option>
                <option>Difficult</option>
                <option>Greater Difficult</option>
            </select>
        </div>
    </form>
    <h2>Estimated Travel Time</h2>
    <p>5 days, 04:24 hours</p>
    `;
}

function showTravelPopup(actors) {
    new Dialog(
        {
            title: 'Travel Duration',
            content: travelPopupTemplate(actors),
            buttons: {
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancel',
                },
            },
            default: 'yes',
        },
        {
            width: 800,
        },
    ).render(true);
}

const tokens = canvas.tokens.controlled;

if (tokens.length === 0) {
    ui.notifications.error(`You must select at least one pc token`);
} else {
    showTravelPopup(tokens.map((p) => p.actor));
}
