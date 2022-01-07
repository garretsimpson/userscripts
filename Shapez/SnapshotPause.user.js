// ==UserScript==
// @name         shapez.io snapshot pause
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        *://*.shapez.io/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName("head")[0];
    if (!head) {
      return;
    }
    style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = css.replace(/;/g, " !important;");
    head.appendChild(style);
  }
  addGlobalStyle(`
    #ingame_HUD_BetaOverlay {
        display: none;
    }

    .ingameDialog {
        background: rgba(160,165,180,.2);
    }
    .ingameDialog[data-theme=dark], html[data-theme=dark] .ingameDialog {
        background: rgba(72,76,88,.2);
    }
    .ingameDialog.visible {
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
    }

    @-webkit-keyframes B {
        0% {
            background-color: transparent;
            opacity: .5
        }

        to {
            background-color: rgba(160,165,180,.4)
        }
    }

    @keyframes B {
        0% {
            background-color: transparent;
            opacity: .5
        }

        to {
            background-color: rgba(160,165,180,.4)
        }
    }

    @-webkit-keyframes C {
        0% {
            background-color: transparent;
            opacity: .5
        }

        to {
            background-color: rgba(72,76,88,.4)
        }
    }

    @keyframes C {
        0% {
            background-color: transparent;
            opacity: .5
        }

        to {
            background-color: rgba(72,76,88,.4);
        }
    }
  `);
})();
