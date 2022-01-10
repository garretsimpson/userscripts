// ==UserScript==
// @name         Shapez clipboard copy
// @version      0.1
// @domain       https://github.com/garretsimpson/userscripts/tree/main/Shapez
// @description  testing method injection
// @author       FatCatX
// @match        *://*.shapez.io/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/**
 * Process
 * - Register hooks / callbacks in each class that we need to modify (or get internal data)
 * - In the callbacks, add needed methods and store pointers to
 */

(() => {
  "use strict";

  const INTERNALS = {};
  const HOOKS = {
    HUDBlueprintPlacer: {
      hook: "createBlueprintFromBuildings",
      post: postCreateBlueprintFromBuildings,
      adds: [copyToClipboard],
    },
    SerializerInternal: { hook: "deserializeEntity" },
    Blueprint: { hook: "canAfford", adds: [serialize] },
  };

  function setHooks() {
    const { defineProperty, prototype } = unsafeWindow.Object;
    const cNames = Object.keys(HOOKS);
    for (const cName of cNames) {
      const hook = HOOKS[cName];
      const hookName = hook.hook;
      console.log("##### Adding hook:", cName, hookName);
      defineProperty(prototype, hookName, {
        __proto__: null,
        configurable: true,
        set: function (oldFunc) {
          console.log("##### Hook callback:", cName, hookName);
          const fName = this.constructor.name;
          const found = fName == cName || fName == "_" + cName;
          if (!found) {
            console.log("#####   Skipping:", fName);
            return;
          }
          console.log("#####   Setting:", hookName);
          INTERNALS[cName] = this;
          delete prototype[hookName];
          const preFunc = hook.pre;
          const postFunc = hook.post;
          const newFunc = function (...args) {
            if (preFunc != undefined) preFunc.call(this, ...args);
            oldFunc.call(this, ...args);
            if (postFunc != undefined) postFunc.call(this, ...args);
          };
          defineProperty(this, hookName, { value: newFunc });
          if (hook.adds != undefined) {
            for (let addFunc of hook.adds) {
              defineProperty(this, addFunc.name, { value: addFunc });
            }
          }
        },
      });
    }
  }

  function postCreateBlueprintFromBuildings(a) {
    console.log("##### Called postCreateBlueprintFromBuildings");
    console.log("uids:", JSON.stringify(a));
    this.copyToClipboard();
  }

  async function copyToClipboard() {
    console.log("##### Called copyToClipboard");
    const serializedBP = this.currentBlueprint.get().serialize();
    try {
      const json = JSON.stringify(serializedBP);
      await navigator.clipboard.writeText(json);
      // this.root.soundProxy.playUi(SOUNDS.copy);
      console.debug("Copied blueprint to clipboard");
    } catch (e) {
      console.error("Copy to clipboard failed:", e.message);
    }
  }

  function serialize() {
    console.log("##### Called serialize");
    const SerializerInternal = INTERNALS["SerializerInternal"].constructor;

    let data = new SerializerInternal().serializeEntityArray(this.entities);
    for (let i = 0; i < data.length; ++i) {
      const entry = data[i];
      delete entry.uid;
      delete entry.components.WiredPins;
    }
    return data;
  }

  setHooks();
})();
