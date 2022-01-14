// ==UserScript==
// @name         Shapez buffer mod
// @version      0.3
// @source       https://github.com/garretsimpson/userscripts/tree/main/Shapez
// @description  Adds fill and clear to buffers
// @author       FatCatX
// @match        *://*.shapez.io/*
// @require      https://raw.githubusercontent.com/garretsimpson/userscripts/main/Hooks.js
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/*
 * Revisions
 * 0.1 - Original version
 * 0.2 - Import Hooks
 * 0.3 - Added key bindings
 */

(() => {
  "use strict";

  Hooks.createHooks({
    HUDMassSelector: {
      initialize: { func: initialize, adds: [fillBuffers] },
    },
    Keybinding: {
      getKeyCodeString: {},
    },
    KeyActionMapper: {
      handleKeydown: { adds: [addBinding] },
    },
  });

  const SCRIPT_NAME = "BufferMod";
  function log(...args) {
    console.debug(SCRIPT_NAME, ...args);
  }

  function key(str) {
    return str.toUpperCase().charCodeAt(0);
  }

  const KEY_MAP = {
    fillBuffers: { keyCode: key("n") },
  };
  for (const id in KEY_MAP) {
    KEY_MAP[id].id = id;
  }

  function initialize(oldFunc, ...args) {
    log("Calling initialize");
    oldFunc.call(this, ...args);

    for (const id in KEY_MAP) {
      addBinding.call(this.root.keyMapper, id, KEY_MAP[id]);
    }
    this.root.keyMapper
      .getBinding(KEY_MAP.fillBuffers)
      .add(this.fillBuffers, this);
  }

  function addBinding(id, val) {
    const Keybinding = Hooks.getConstructor("Keybinding");
    let payload = Object.assign({}, KEY_MAP[id]);
    this.keybindings[id] = new Keybinding(this, this.root.app, payload);
  }

  function fillBuffers() {
    log("Calling fillBuffers");
  }
})();
