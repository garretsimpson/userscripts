/**
 * Hooks - Add functions to running scripts
 *
 * Hook object syntax
 *   {
 *     <class-name>: {
 *       <hook-function>: {
 *         func: <new-function>, // optional
 *         adds: [<add-function>, ...] // optional
 *       }, ...
 *     }
 *   }
 *
 */

const Hooks = (() => {
  function log(...args) {
    const SCRIPT_NAME = "Hooks";
    console.debug(SCRIPT_NAME, ...args);
  }

  const INTERNALS = {};

  const Hooks = {
    getInternals: function () {
      return INTERNALS;
    },

    createHooks: function (hooks) {
      const { defineProperty, prototype } = unsafeWindow.Object;
      const cNames = Object.keys(hooks);
      for (const cName of cNames) {
        const hookNames = Object.keys(hooks[cName]);
        for (const hookName of hookNames) {
          const hook = hooks[cName][hookName];
          log("Adding hook:", cName, hookName);
          const funcList = [];
          defineProperty(prototype, hookName, {
            __proto__: null,
            configurable: true,
            set: function (oldFunc) {
              log("Hook callback:", cName, hookName);
              const fName = this.constructor.name;
              const found = fName == cName || fName == "_" + cName;
              if (!found) {
                log("  Skip:", fName, oldFunc.name);
                funcList.push([this, oldFunc]);
                return;
              }
              log("  Found:", fName, oldFunc.name);
              INTERNALS[cName] = this.constructor;
              delete prototype[hookName];
              let func =
                hook.func == undefined
                  ? oldFunc
                  : function (...args) {
                      return hook.func.call(this, oldFunc, ...args);
                    };
              funcList.push([this, func]);
              for (const [proto, func] of funcList) {
                defineProperty(proto, hookName, {
                  configurable: true,
                  enumerable: true,
                  writable: true,
                  value: func,
                });
              }
              if (hook.adds != undefined) {
                for (let addFunc of hook.adds) {
                  log("  Adding:", addFunc.name);
                  defineProperty(this, addFunc.name, { value: addFunc });
                }
              }
            },
          });
        }
      }
    },
  };
  return Hooks;
})();
