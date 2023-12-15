/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates({

    // Actor partials.
    "actor-powers": "systems/trespasser/templates/actor/parts/actor-powers.html",
    "actor-effects": "systems/trespasser/templates/actor/parts/actor-effects.html",
    "actor-arms": "systems/trespasser/templates/actor/parts/actor-arms.hbs",
    //power card
    "power-card": "systems/trespasser/templates/chat/power-card.hbs"
 });
};
