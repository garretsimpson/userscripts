// ==UserScript==
// @name         Shapez buffer mod
// @version      0.1
// @source       https://github.com/garretsimpson/userscripts/tree/main/Shapez
// @description  Adds fill and clear to buffers
// @author       FatCatX
// @match        *://*.shapez.io/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/*
 * Revisions
 * 0.1 - Original version
 */

(() => {
  "use strict";

  const INTERNALS = {};
  const HOOKS = {
    HUDMassSelector: {
      initialize: { func: initialize, adds: [fillBuffers] },
    },
  };

  const SCRIPT_NAME = "BufferMod";
  function log(...args) {
    console.debug(SCRIPT_NAME, ...args);
  }

  function createHooks() {
    const { defineProperty, prototype } = unsafeWindow.Object;
    const cNames = Object.keys(HOOKS);
    for (const cName of cNames) {
      const hookNames = Object.keys(HOOKS[cName]);
      for (const hookName of hookNames) {
        const hook = HOOKS[cName][hookName];
        log("Adding hook:", cName, hookName);
        const skipList = [];
        defineProperty(prototype, hookName, {
          __proto__: null,
          configurable: true,
          set: function (oldFunc) {
            log("Hook callback:", cName, hookName);
            const fName = this.constructor.name;
            const found = fName == cName || fName == "_" + cName;
            if (!found) {
              log("  Skipping:", fName, oldFunc.name);
              skipList.push([this, oldFunc]);
              return;
            }
            log("  Setting:", hookName, fName, oldFunc.name);
            INTERNALS[cName] = this.constructor;
            const func = hook.func;
            const newFunc = function (...args) {
              let result;
              if (found && func != undefined) {
                result = func.call(this, oldFunc, ...args);
              } else {
                result = oldFunc.call(this, ...args);
              }
              return result;
            };
            delete prototype[hookName];
            log("Define:", fName, oldFunc.name, newFunc.name);
            defineProperty(this, hookName, {
              configurable: true,
              enumerable: true,
              writable: true,
              value: newFunc,
            });
            if (hook.adds != undefined) {
              for (let addFunc of hook.adds) {
                log("  Adding:", addFunc.name);
                defineProperty(this, addFunc.name, { value: addFunc });
              }
            }
            for (const [skip, func] of skipList) {
              log("Define:", skip.constructor.name, func.name);
              defineProperty(skip, hookName, {
                configurable: true,
                enumerable: true,
                writable: true,
                value: func,
              });
            }
          },
        });
      }
    }
  }

  function initialize(oldFunc, ...args) {
    log("Calling initialize");
    oldFunc.call(this, ...args);
  }

  function fillBuffers() {
    log("Calling fillBuffers");
  }

  createHooks();
})();
