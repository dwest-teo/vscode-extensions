"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleProvider = void 0;
const path = require("path");
const vscode = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const vscode_uri_1 = require("vscode-uri");
const vscodeUtils_1 = require("../vscodeUtils");
class ModuleCall extends vscode.TreeItem {
    constructor(label, sourceAddr, version, sourceType, docsLink, terraformIcon, children) {
        super(label, children.length >= 1 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.sourceAddr = sourceAddr;
        this.version = version;
        this.sourceType = sourceType;
        this.docsLink = docsLink;
        this.terraformIcon = terraformIcon;
        this.children = children;
        this.iconPath = this.getIcon(this.sourceType);
        this.description = this.version ? `${this.version}` : '';
        if (this.version === undefined) {
            this.tooltip = `${this.sourceAddr}`;
        }
        else {
            this.tooltip = `${this.sourceAddr}@${this.version}`;
        }
    }
    getIcon(type) {
        switch (type) {
            case 'tfregistry':
                return {
                    light: this.terraformIcon,
                    dark: this.terraformIcon,
                };
            case 'local':
                return new vscode.ThemeIcon('symbol-folder');
            case 'github':
                return new vscode.ThemeIcon('github');
            case 'git':
                return new vscode.ThemeIcon('git-branch');
            default:
                return new vscode.ThemeIcon('extensions-view-icon');
        }
    }
}
class ModuleProvider {
    constructor(ctx, handler) {
        this.handler = handler;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.svg = '';
        this.svg = ctx.asAbsolutePath(path.join('assets', 'icons', 'terraform.svg'));
        ctx.subscriptions.push(vscode.commands.registerCommand('terraform.modules.refreshList', () => this.refresh()), vscode.commands.registerCommand('terraform.modules.openDocumentation', (module) => {
            vscode.env.openExternal(vscode.Uri.parse(module.docsLink));
        }), vscode.window.onDidChangeActiveTextEditor((event) => __awaiter(this, void 0, void 0, function* () {
            if (event && vscodeUtils_1.getActiveTextEditor()) {
                this.refresh();
            }
        })));
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve(element.children);
        }
        else {
            const m = this.getModules();
            return Promise.resolve(m);
        }
    }
    getModules() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeEditor = vscodeUtils_1.getActiveTextEditor();
            if (activeEditor === undefined) {
                return Promise.resolve([]);
            }
            const document = activeEditor.document;
            if (document === undefined) {
                return Promise.resolve([]);
            }
            const editor = document.uri;
            const documentURI = vscode_uri_1.Utils.dirname(editor);
            const handler = this.handler.getClient(editor);
            return yield handler.client.onReady().then(() => __awaiter(this, void 0, void 0, function* () {
                const moduleCallsSupported = this.handler.clientSupportsCommand(`${handler.commandPrefix}.terraform-ls.module.calls`, editor);
                if (!moduleCallsSupported) {
                    return Promise.resolve([]);
                }
                const params = {
                    command: `${handler.commandPrefix}.terraform-ls.module.calls`,
                    arguments: [`uri=${documentURI}`],
                };
                const response = yield handler.client.sendRequest(vscode_languageclient_1.ExecuteCommandRequest.type, params);
                if (response == null) {
                    return Promise.resolve([]);
                }
                const list = response.module_calls.map((m) => this.toModuleCall(m.name, m.source_addr, m.version, m.source_type, m.docs_link, this.svg, m.dependent_modules));
                return list;
            }));
        });
    }
    toModuleCall(name, sourceAddr, version, sourceType, docsLink, terraformIcon, dependents) {
        let deps = [];
        if (dependents.length != 0) {
            deps = dependents.map((dp) => this.toModuleCall(dp.name, dp.source_addr, dp.version, dp.source_type, dp.docs_link, terraformIcon, dp.dependent_modules));
        }
        return new ModuleCall(name, sourceAddr, version, sourceType, docsLink, terraformIcon, deps);
    }
}
exports.ModuleProvider = ModuleProvider;
//# sourceMappingURL=moduleProvider.js.map