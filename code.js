// This plugin will open a modal to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser enviroment (see documentation).
// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 370, height: 550 });
function clone(val) {
    const type = typeof val;
    if (val === null) {
        return null;
    }
    else if (type === 'undefined' || type === 'number' ||
        type === 'string' || type === 'boolean') {
        return val;
    }
    else if (type === 'object') {
        if (val instanceof Array) {
            return val.map(x => clone(x));
        }
        else if (val instanceof Uint8Array) {
            return new Uint8Array(val);
        }
        else {
            let o = {};
            for (const key in val) {
                o[key] = clone(val[key]);
            }
            return o;
        }
    }
    throw 'unknown';
}
function sortByNonNullCount(rules) {
    rules.sort(function (a, b) {
        var aKeys = Object.keys(a);
        var bKeys = Object.keys(b);
        var aNonNullKeys = aKeys.filter(function (key) {
            return a[key] !== undefined && a[key] !== null;
        });
        var bNonNullKeys = bKeys.filter(function (key) {
            return b[key] !== undefined && b[key] !== null;
        });
        return aNonNullKeys.length < bNonNullKeys.length;
    });
    return rules;
}
// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg) => __awaiter(this, void 0, void 0, function* () {
    // One way of distinguishing between different types of messages sent from
    // your HTML page is to use an object with a "type" property like this.
    var returnMsg = {};
    if (msg.type === 'COMMAND.GET_FONTS') {
        var fonts = yield figma.listAvailableFontsAsync();
        returnMsg = {
            command: msg.type,
            fonts: fonts
        };
        figma.ui.postMessage(returnMsg);
    }
    if (msg.type === 'COMMAND.SET_TYPE') {
        console.log("applying rules", msg.rules);
        var rules = sortByNonNullCount(msg.rules);
        var allTextNodes = figma.currentPage.findAll((node) => {
            return node.type === "TEXT";
        });
        for (var i = 0; i < allTextNodes.length; i++) {
            var textNode = allTextNodes[i];
            var textNodeFontSize = parseInt(textNode.fontSize.toString());
            const fills = clone(textNode.fills);
            //var nodeFont = (textNode as any).fontName;
            //var textFieldFont = await figma.loadFontAsync(nodeFont);
            for (var j = 0; j < rules.length; j++) {
                var rule = rules[j];
                //console.log("rule for key count", rule);
                var matchesAllRules = true;
                if (rule.minFontSize !== null && textNodeFontSize < rule.minFontSize) {
                    matchesAllRules = false;
                }
                if (rule.maxFontSize !== null && textNodeFontSize > rule.maxFontSize) {
                    matchesAllRules = false;
                }
                if (rule.fontColor !== null) {
                    var foundColorArray = fills.filter(function (fill) {
                        if ((Math.abs(fill.color.r - rule.fontColor.r) < 0.002) && (Math.abs(fill.color.g - rule.fontColor.g) < 0.002) && (Math.abs(fill.color.b - rule.fontColor.b) < 0.002)) {
                            //close enough, tinyColor lib isn't perfect
                            console.log("node: " + textNode.name + " matches color from rule", rule.ruleName);
                            return true;
                        }
                        else {
                            return false;
                        }
                    });
                    if (foundColorArray.length === 0) {
                        matchesAllRules = false;
                    }
                }
                if (matchesAllRules) {
                    var fontName = { family: rule.fontFamily, style: rule.fontStyle };
                    var font = yield figma.loadFontAsync(fontName);
                    textNode.fontName = fontName;
                    console.log("setting node: " + textNode.name + " to rule: " + rule.ruleName);
                    break;
                }
            }
        }
        figma.notify("Type Set 👍");
    }
    if (msg.type === 'COMMAND.SAVE_RULES') {
        var setRules = yield figma.clientStorage.setAsync("rules", JSON.stringify(msg.rules));
        returnMsg = {
            command: msg.type
        };
        figma.ui.postMessage(returnMsg);
    }
    if (msg.type === 'COMMAND.GET_RULES') {
        var rules = yield figma.clientStorage.getAsync("rules");
        returnMsg = {
            command: msg.type,
            rules: JSON.parse(rules)
        };
        figma.ui.postMessage(returnMsg);
    }
});
