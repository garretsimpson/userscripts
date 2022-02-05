// ==UserScript==
// @name        shapez.io unlock full game stuff
// @namespace   http://bzzzzdzzzz.blogspot.com/
// @description I did what game asked for.
// @author      BZZZZ
// @include     /^https\:\/\/shapez\.io\/([?#]|$)/
// @version     0.2
// @grant       none
// @run-at      document-start
// ==/UserScript==

{
  const a = document.createElement("div");
  a.setAttribute(
    "onclick",
    `"use strict";{
      const _ret_false=()=>false,{defineProperty,prototype}=window.Object;
      defineProperty(prototype,"isLimitedVersion",{
        "__proto__":null,
        "configurable":true,
        "set":function(){
          delete prototype.isLimitedVersion;
          this.isLimitedVersion=_ret_false;
        }
      });
    }`
  );
  a.click();
}
