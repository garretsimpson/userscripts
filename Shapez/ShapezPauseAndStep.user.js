// ==UserScript==
// @name         Shapez pause and step
// @version      0.1
// @source       https://github.com/garretsimpson/userscripts/tree/main/Shapez
// @description  Adds pause and step to Shapez.io
// @author       FatCatX
// @match        *://*.shapez.io/*
// @require      https://raw.githubusercontent.com/garretsimpson/userscripts/main/Hooks.js
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(() => {
  "use strict";

  const SCRIPT_NAME = "PauseAndStep";
  function log(...args) {
    console.debug(SCRIPT_NAME, ...args);
  }

  Hooks.createHooks({
    GameCore: {
      initializeRoot: { func: initializeRoot, adds: [stepTick] },
    },
    GameHUD: {
      shouldPauseGame: { func: shouldPauseGame },
    },
    Keybinding: {
      getKeyCodeString: {},
    },
    KeyActionMapper: {
      handleKeydown: { adds: [addBinding] },
    },
  });

  log(`##### Loading userscript: ${SCRIPT_NAME}`);

  const STOP_PROPAGATION = "stop_propagation";
  const SETTINGS = { gamePaused: false };

  function key(str) {
    return str.toUpperCase().charCodeAt(0);
  }

  const KEY_MAP = {
    pause: { keyCode: 19 /* Pause */ },
    step: { keyCode: key("n"), repeated: true },
  };
  for (const id in KEY_MAP) {
    KEY_MAP[id].id = id;
  }

  function initializeRoot(oldFunc, ...args) {
    oldFunc.call(this, ...args);

    for (const id in KEY_MAP) {
      addBinding.call(this.root.keyMapper, id);
    }
    this.root.keyMapper.getBinding(KEY_MAP.pause).add(togglePause);
    this.root.keyMapper.getBinding(KEY_MAP.step).addToTop(this.stepTick, this);
  }

  function addBinding(id) {
    const Keybinding = Hooks.getConstructor("Keybinding");
    let payload = Object.assign({}, KEY_MAP[id]);
    this.keybindings[id] = new Keybinding(this, this.root.app, payload);
  }

  function togglePause() {
    SETTINGS.gamePaused = !SETTINGS.gamePaused;
  }

  function shouldPauseGame(oldFunc) {
    return oldFunc.call(this) || SETTINGS.gamePaused;
  }

  function stepTick() {
    const root = this.root;

    SETTINGS.gamePaused = false;
    root.time.updateRealtimeNow();
    root.time.performTicks(
      root.dynamicTickrate.deltaMs,
      this.boundInternalTick
    );
    root.productionAnalytics.update();
    root.achievementProxy.update();
    SETTINGS.gamePaused = true;

    // return STOP_PROPAGATION;
  }
})();
