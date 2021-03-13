
Hooks.once("dragRuler.ready", (SpeedProvider) => {
// When dragruler is ready to go give it all the PF2 specific stuff
	class PF2ESpeedProvider extends SpeedProvider {
//Registers colours for up to four movement actions so colours can be customized for them, and sets defaults
		get colors() {
			return [
				{id: "FirstAction", default: 0x3222C7},
				{id: "SecondAction", default: 0xFFEC07},
				{id: "ThirdAction", default: 0xC033E0},
				{id: "FourthAction", default: 0x1BCAD8}
			]
		}
// Get the distance for each movement interval to give to drag ruller
		getRanges(token){
			const tokenSpeed = cleanSpeed(token); //This does most of the heavy lifting.
			const tokenElevation = token.data.elevation; //Gives us a way to check if a token is flying
			const type = token.actor.data.type; //Someone made speeds work differently for different types of actors, so we need to know which type of actor we're looking at so can find the speed.
			const items = token.actor.data.items.filter(item => item.type === 'condition' && item.flags.pf2e?.condition); //Gets a read out of the conditions effecting the actor.
			const conditions = game.pf2e.ConditionManager.getFlattenedConditions(items); //Converts the condition list into a state that's easier to use.
			let numactions = 3; //Sets the default number of actions (3) which can then be modified depending on the conditions.

			//This logic gate handles flight.
			if(tokenElevation > 0) {
				// If a token is elevated steps through all the speeds looking for the fly speed.
				for(var i=0, len= tokenSpeed.length; i<len; i++){
					// When we find the fly speed sets it as the value for the default.
					if (tokenSpeed[i].id === 'fly') {var baseSpeed = parseFloat(tokenSpeed[i].value)}
			 	}
				//If a creature has no fly speed, instead uses the first speed, based on the order: land, fly, misc, swim, burrow, climb
				if (baseSpeed === undefined) {var baseSpeed = parseFloat(tokenSpeed[0].value)}
			}else if (tokenElevation <= 0){var baseSpeed = parseFloat(tokenSpeed[0].value)} // If the token isn't elevated, just assigns the default speed to the first speed.

			//This loop handles all changes to number of actions from conditions.
			for (var i=0, len=conditions.length; i<len; i++) {
				//Interates through the conditions.
				if(conditions[i].name.includes("Quickened") && conditions[i].active === true){
					numactions = numactions + 1;
					// Self explanatory. If a token is quickened increases the number of actions.
				} else if (conditions[i].name.includes("Stunned") && conditions[i].active === true) {
					numactions = numactions - conditions[i].value
					//if you've got the stunned condition reduces the number of actions you can take by your stunned value.
				} else if (conditions[i].name.includes("Slowed") && conditions[i].active === true) {
					numactions = numactions - conditions[i].value
					//if you've got the slowed condition reduces the number of actions you can take by you stunned value. Note: the conditions[i].active === true is important because stunned will override slowed setting it to inactive but the condition and its value still exist.
				}
				else if (conditions[i].name.includes("Immobilized") && conditions[i].active === true) {
					numactions = numactions - numactions
					//if you've got the immobilized condition sets the number of move actions you can take to 0. This also handles restrained as restrained gives a linked immobilized condition.
				}
				else if (conditions[i].name.includes("Paralyzed") && conditions[i].active === true) {
					numactions = numactions - numactions
					//if you've got the paralyzed condition sets the number of move actions you can take to 0.
				}
			}

			if (numactions < 0) {numactions = 0};
			//You can't have less than 0 actions, if you've managed to get to less than 0, due to being stunned 4 for example, set the number of actions you get to take to 0

			if (numactions === 0){baseSpeed = 5}; //I can't recall why, but it complains if you set the base speed to 0 here, so set a nice small arbitrary value if you have no actions.
				const ranges = [{range: baseSpeed, color: "FirstAction"},{range: baseSpeed * 2, color: "SecondAction"}, { range: baseSpeed * 3, color: "ThirdAction" },{range: baseSpeed * 4, color: "FourthAction"}];
				//Set the rangees for each of our four actions to be given to the drag ruler.
				for (var i = numactions, len=ranges.length; i<len; i++){
					 ranges.pop(); //remove ranges from the function until only the ranges equal to the number of legal actions remain.
					};
			if (numactions === 0){
					baseSpeed = 0;
					ranges.push({range: baseSpeed, color: "FirstAction"});
				}; //Since ranges is empty if you've got no actions which throws an error, add a range for the first action of 0.
					return ranges;
			}
		}

	dragRuler.registerModule("pf2e-dragruler", PF2ESpeedProvider) //register the speed provider so its selectable from the drag ruler configuration.
})

function cleanSpeed(token) {
var land = 0; var fly = 0; var swim = 0; var climb = 0; var burrow = 0; var miscSpeed =0; //set empty variables for each speed, so JS doesn't complain later. Some comments refer to these as the OG variables because I'm extra like that.
	//handles speeds for PCs
	if (token.actor.data.type === "character"){
		const cleanedSpeeds = speedsSorter(token) //This grabs and cleans most of the speeds from the actor.
		var land = cleanedSpeeds.land; var fly = cleanedSpeeds.fly; var swim = cleanedSpeeds.swim; var climb = cleanedSpeeds.swim; var burrow = cleanedSpeeds.burrow; var miscSpeed =cleanedSpeeds.misc; //Assigns the cleaned speeds to the appropriate variables
		var land = parseFloat(token.actor.data.data.attributes.speed.total); //land speed usually isn't under other speeds for PCs, so we need to grab that as well.
		//handles speeds for NPCs
	} else if (token.actor.data.type === "npc"){
		const cleanedSpeeds = speedsSorter(token) //Same as above. Grabs most of the speeds.
		var land = cleanedSpeeds.land; var fly = cleanedSpeeds.fly; var swim = cleanedSpeeds.swim; var climb = cleanedSpeeds.swim; var burrow = cleanedSpeeds.burrow; var miscSpeed =cleanedSpeeds.misc; //Assigns the cleaned speeds to the appropriate variables
		// Like with PCs in addition to the "other speeds" grabbed by the speedsSorter function the NPC will have a main speed, in some cases this isn't a land speed so we need to figure out what kind of speed it is and assign it to the approriate variable.
		if(token.actor.data.data.attributes.speed.type === "land" || token.actor.data.data.attributes.speed.type === "Land" ){
			var land = parseFloat(token.actor.data.data.attributes.speed.total)
		} else if (token.actor.data.data.attributes.speed.type === "fly" || token.actor.data.data.attributes.speed.type === "Fly") {
			var fly = parseFloat(token.actor.data.data.attributes.speed.total);
		} else if (token.actor.data.data.attributes.speed.type === "swim" || token.actor.data.data.attributes.speed.type === "Swim") {
			var swim = parseFloat(token.actor.data.data.attributes.speed.total);
		}	else if (token.actor.data.data.attributes.speed.type === "climb" || token.actor.data.data.attributes.speed.type === "Climb" ) {
			var climb = parseFloat(token.actor.data.data.attributes.speed.total);
		} else if (token.actor.data.data.attributes.speed.type === "burrow" || token.actor.data.data.attributes.speed.type === "Burrow") {
			var burrow = parseFloat(token.actor.data.data.attributes.speed.total);
		} else{var miscSpeed = parseFloat(token.actor.data.data.attributes.speed.total)};
		// Sometimes an NPC is a disaster, and we've got no main speed. In which cause land speed will still have its default value (0). But there might be a speed that's being handled poorly that didn't make it from the .value to the .total function so we should parse that.
		if (land === 0 && token.actor.data.data.attributes.speed.value !== undefined) {
		var miscSpeed = 0; //Set the speed to 0 as a fall back.
			if (token.actor.data.data.attributes.speed.value !== null && token.actor.data.data.attributes.speed.value !== undefined){
				var miscSpeed = parseFloat(token.actor.data.data.attributes.speed.value.match(/\d+/)); //in the event we really do have a speed in .value that didn't make it to .total, covert it to a number, and assign it. If the conditions above are both false, speed will be treated as 0, the fallback from above.
			}
		};
		//What else. Familiars
	} else if (token.actor.data.type === "familiar"){
		//Works pretty normally, just need to grab the appropriate other speeds from the speedsSorter. Since that's where everything is stored when you're a familiar. Hellish. We then assign to the appropriate values. As I'm sure is becoming routine. Yawn.
		const cleanedSpeeds = speedsSorter(token)
		var land = cleanedSpeeds.land; var fly = cleanedSpeeds.fly; var swim = cleanedSpeeds.swim; var climb = cleanedSpeeds.swim; var burrow = cleanedSpeeds.burrow; var miscSpeed =cleanedSpeeds.misc;

		//vehicles don't have other speeds as an option, for reasons (tm). They also store their speed in a different place. Don't look at me, I'm busy wishing death on everything too. If its a vehicle just grab its speed info and assign to the land variable. You can write the ticket later.
	} else if (token.actor.data.type === "vehicle"){
		var land = parseFloat(token.actor.data.data.details.speed)
	}
	//This is were we set up an array of speeds to be made available as the output from this function.
	const speeds = []; // Blank so that we can push things to it.
	if (land > 0) {speeds.push({id: "land", value: land})}; //If you've got a land speed, add it as an array to the array, which becomes a matrix. JS matrixes are satanic. But don't panic. Or do. Your call.
	if (fly > 0) {speeds.push({id: "fly", value: fly})}; //If you've got a fly speed add it as an array to the array.
	if (miscSpeed > 0) {speeds.push({id: "misc", value: miscSpeed})}; //If you've got a an uncategorized speed add it.
	if (swim > 0) {speeds.push({id: "swim", value: swim})}; //Same for swim speed
	if (burrow > 0) {speeds.push({id: "burrow", value: burrow})}; //and burrow
	if (climb > 0) {speeds.push({id: "climb", value: climb})}; // why the hell not, climb too. This order matters at it sets which speed is the default speed used for dragging. The default speed used in the first one to show up in the speed matrix
	if (speeds.length === 0) {speeds.push({id: "land", value: 0})}; //If we've got this far and our speed matrix is empty make the land speed 0, the token ain't moving for shit, but hey you won't get an error. <3

	return speeds //output this shit so it can be read, used back in line 16 -ish. Or at least its line 16 at time of writing. Search for the function "cleanSpeed" if you can't find. If you still can't find it look for glasses.
}
//So this actually does a lot of the grabby grabby stuff. Pulls out all the speeds stored under other speeds.
function speedsSorter (token) {
var land2 = 0; var fly2 = 0; var swim2 = 0; var climb2 = 0; var burrow2 = 0; var miscSpeed2 =0;
if (token.actor.data.data.attributes.speed.otherSpeeds !== undefined){
	//skips this if no other speeds exist.
	for (var i=0, len=token.actor.data.data.attributes.speed.otherSpeeds.length; i<len; i++){
		//iterates through other speeds assigning to the appropriate variables. Different from the OG ones for sanities sake. Will later get assined to the OG ones.
		if(token.actor.data.data.attributes.speed.otherSpeeds[i].type === "land" || token.actor.data.data.attributes.speed.otherSpeeds[i].type === "Land"){
			var land2 = parseFloat(token.actor.data.data.attributes.speed.otherSpeeds[i].total)
		} else if (token.actor.data.data.attributes.speed.otherSpeeds[i].type === "fly" || token.actor.data.data.attributes.speed.otherSpeeds[i].type === "Fly") {
			var fly2 = parseFloat(token.actor.data.data.attributes.speed.otherSpeeds[i].total);
		} else if (token.actor.data.data.attributes.speed.otherSpeeds[i].type === "swim" || token.actor.data.data.attributes.speed.otherSpeeds[i].type === "Swim") {
			var swim2 = parseFloat(token.actor.data.data.attributes.speed.otherSpeeds[i].total);
		}	else if (token.actor.data.data.attributes.speed.otherSpeeds[i].type === "climb" || token.actor.data.data.attributes.speed.otherSpeeds[i].type === "Climb" ) {
			var climb2 = parseFloat(token.actor.data.data.attributes.speed.otherSpeeds[i].total);
		} else if (token.actor.data.data.attributes.speed.otherSpeeds[i].type === "burrow" || token.actor.data.data.attributes.speed.otherSpeeds[i].type === "Burrow" ) {
			var burrow2 = parseFloat(token.actor.data.data.attributes.speed.otherSpeeds[i].total);
		} else{var miscSpeed2 = parseFloat(token.actor.data.data.attributes.speed.otherSpeeds[i].total)}
	}
};
return {land: land2, fly: fly2, swim: swim2, burrow: burrow2, climb: climb2, misc: miscSpeed2}
//returns them all as a since simple array, easy to grab from for assigning to our lovely OG variables.
}
