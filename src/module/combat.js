/* eslint-disable import/prefer-default-export */
export const initiativeFormula = (combatant) => {
  const { actor } = combatant;
  if (!actor) return '1d20';
  const data = actor ? actor.data.data : {};
  const parts = ['1d20', data.attributes.perception.value || 0];
  
  //Only show initiative bonuses if they are there. Else it always shows "+ 0" on the roll.
  if (((data.attributes.initiative || {}).circumstance || 0) + ((data.attributes.initiative || {}).status || 0) != 0) 
    parts.push( (data.attributes.initiative || {}).circumstance || 0) + ((data.attributes.initiative || {}).status || 0 );
  
  // NPC's are always first in PF2e rules
  if (!actor.isPC) 
    parts.push(0.9); 
    
  return parts.join('+');
};
