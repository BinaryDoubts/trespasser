/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class TrespasserItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["trespasser", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/trespasser/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.html`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.html`.
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */
  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.item;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    if (context.item.type == "power"){

    }

    if (context.item.type == "weapon"){
      this._prepareWeaponData(context);
    }
    return context;
  }
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".send-chat").click(this._onClick.bind(this));
    // Everything below here is only needed if the sheet is editable
    html.find(".power-header").click(this._onPowerHeaderClick.bind(this));
    if (!this.isEditable) return;

    html.find(".weapon-type-range").change(this._onRangeTypeChange.bind(this));
    // Roll handlers, click handlers, etc. would go here.

  }

  async _prepareWeaponData(context){
    for (let [k, v] of Object.entries(context.system.ranges)) {
      v.label = game.i18n.localize(CONFIG.TRESPASSER.weaponTypes[k]) ?? k;
    }

  }

  async _onClick(event){
    const msg = await ChatMessage.create({"content": event.target.dataset.message});
  }

  async _onRangeTypeChange(event){
    this.object.generateWeaponStrings();
  }

  async _onPowerHeaderClick(event){
    const card = await this.getCardData();
    const msg = await ChatMessage.create({"content": card});
    //console.log(msg);
  }
  
  async getCardData(){
    if (!this.card){
      this.card = await renderTemplate("systems/trespasser/templates/chat/power-card.hbs", this.object);
      return this.card;
    }
    else{
      return this.card;
    }
  }
}
