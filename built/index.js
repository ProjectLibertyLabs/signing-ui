var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// @ts-ignore
import { WsProvider, ApiPromise } from 'https://cdn.jsdelivr.net/npm/@polkadot/api@10.5.1/+esm';
// @ts-ignore
import { web3Accounts, web3Enable } from 'https://cdn.jsdelivr.net/npm/@polkadot/extension-dapp@0.46.2/+esm';
var PREFIX = 42;
var UNIT = "UNIT";
var singletonApi;
var singletonProvider;
var providerName;
var extrinsicsSelectionListenerIsRegistered = false;
var GENESIS_HASHES = {
    rococo: "0x0c33dfffa907de5683ae21cc6b4af899b5c4de83f3794ed75b2dc74e1b088e72",
    frequency: "0x4a587bf17a404e3572747add7aab7bbe56e805a5479c6c436f07f36fcc8d3ae1",
};
function loadApi(providerUri) {
    return __awaiter(this, void 0, void 0, function () {
        var chain;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Singleton
                    if (!providerUri && singletonApi)
                        return [2 /*return*/, singletonApi];
                    if (!providerUri) {
                        // they didn't select anything
                        return [2 /*return*/, null];
                    }
                    if (!providerUri) return [3 /*break*/, 4];
                    if (!singletonApi) return [3 /*break*/, 2];
                    return [4 /*yield*/, singletonApi.disconnect()];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    if (!singletonProvider) return [3 /*break*/, 4];
                    return [4 /*yield*/, singletonProvider.disconnect()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    // Singleton Provider because it starts trying to connect here.
                    singletonProvider = new WsProvider(providerUri);
                    return [4 /*yield*/, ApiPromise.create({ provider: singletonProvider })];
                case 5:
                    singletonApi = _a.sent();
                    return [4 /*yield*/, singletonApi.isReady];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, singletonApi.rpc.system.properties()];
                case 7:
                    chain = _a.sent();
                    PREFIX = Number(chain.ss58Format.toString());
                    UNIT = chain.tokenSymbol.toHuman();
                    document.getElementById("unit").innerText = UNIT;
                    return [2 /*return*/];
            }
        });
    });
}
function listenForExtrinsicsChange() {
    // If people are playing around and switching providers, don't keep registering the listener.
    // better to check a flag than to remove and add back.
    if (!extrinsicsSelectionListenerIsRegistered) {
        document.getElementById("extrinsics").addEventListener("change", showExtrinsicForm);
        extrinsicsSelectionListenerIsRegistered = true;
    }
}
function getSelectedOption(elementId) {
    var select = document.getElementById(elementId);
    return select.selectedOptions[0];
}
// Connect to the wallet and blockchain
function connect(event) {
    return __awaiter(this, void 0, void 0, function () {
        var selectedProvider;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    event.preventDefault();
                    selectedProvider = getSelectedOption('provider-list');
                    providerName = selectedProvider.getAttribute("name");
                    return [4 /*yield*/, loadApi(selectedProvider.getAttribute("value"))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, loadAccounts()];
                case 2:
                    _a.sent();
                    resetForms();
                    document.getElementById("setupExtrinsic").setAttribute("class", "ready");
                    listenForExtrinsicsChange();
                    return [2 /*return*/];
            }
        });
    });
}
function loadAccounts() {
    return __awaiter(this, void 0, void 0, function () {
        var extensions, accounts, accountsSelect;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, web3Enable('Frequency parachain signer helper')];
                case 1:
                    extensions = _a.sent();
                    if (!extensions.length) {
                        alert("Polkadot{.js} extension not found; please install it first.");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, web3Accounts()];
                case 2:
                    accounts = _a.sent();
                    // clear options
                    document.getElementById("signing-address").innerHTML = "";
                    accountsSelect = document.getElementById("signing-address");
                    // set options.
                    accounts.forEach(function (a) {
                        // display only the accounts allowed for this chain
                        // TODO: add Alice..Ferdie accounts if localhost. add everything for localhost for now
                        if (!a.meta.genesisHash
                            || GENESIS_HASHES[providerName] === a.meta.genesisHash
                            || providerName === "localhost") {
                            var el = document.createElement("option");
                            el.setAttribute("value", a.address);
                            el.setAttribute("name", a.address);
                            el.innerText = "".concat(a.meta.name, ": ").concat(a.address);
                            accountsSelect.add(el);
                        }
                    });
                    return [2 /*return*/];
            }
        });
    });
}
// resetForms puts the form state back to initial setup with first extrinsic selected and first form showing
function resetForms() {
    document.getElementById("handles_claim_handle").setAttribute("class", "extrinsic-form");
    var selectedExtrinsic = getSelectedOption("extrinsics");
    if (selectedExtrinsic.value !== "handles_claim_handle") {
        document.getElementById(selectedExtrinsic.value).setAttribute("class", "hidden extrinsic-form");
        selectedExtrinsic.selected = false;
    }
}
function showExtrinsicForm(event) {
    event.preventDefault();
    var selectedEl = event.target.selectedOptions[0];
    var formToShow = selectedEl.value;
    // hide all the forms
    var forms = document.getElementsByClassName("extrinsic-form");
    for (var i = 0; i < forms.length; i++) {
        var form = forms.item(i);
        if (form.id !== formToShow) {
            form.setAttribute("class", "hidden extrinsic-form");
        }
        else {
            form.setAttribute("class", "extrinsic-form");
        }
    }
}
function init() {
    document.getElementById("connectButton").addEventListener("click", connect);
}
init();
