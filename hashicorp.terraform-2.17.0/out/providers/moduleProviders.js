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
exports.ModuleProvidersDataProvider = void 0;
const vscode = require("vscode");
const vscode_uri_1 = require("vscode-uri");
const vscode_languageclient_1 = require("vscode-languageclient");
const vscodeUtils_1 = require("../vscodeUtils");
class ModuleProviderItem extends vscode.TreeItem {
    constructor(fullName, displayName, requiredVersion, installedVersion, docsLink) {
        super(displayName, vscode.TreeItemCollapsibleState.None);
        this.fullName = fullName;
        this.displayName = displayName;
        this.requiredVersion = requiredVersion;
        this.installedVersion = installedVersion;
        this.docsLink = docsLink;
        this.description = installedVersion !== null && installedVersion !== void 0 ? installedVersion : '';
        this.iconPath = new vscode.ThemeIcon('package');
        this.tooltip = `${fullName} ${requiredVersion !== null && requiredVersion !== void 0 ? requiredVersion : ''}`;
        if (docsLink) {
            this.contextValue = 'moduleProviderHasDocs';
        }
    }
}
class ModuleProvidersDataProvider {
    constructor(ctx, handler) {
        this.handler = handler;
        this.didChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.didChangeTreeData.event;
        ctx.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((event) => __awaiter(this, void 0, void 0, function* () {
            if (event && vscodeUtils_1.getActiveTextEditor()) {
                this.refresh();
            }
        })), vscode.commands.registerCommand('terraform.providers.openDocumentation', (module) => {
            if (module.docsLink) {
                vscode.env.openExternal(vscode.Uri.parse(module.docsLink));
            }
        }));
    }
    refresh() {
        this.didChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return [];
        }
        else {
            return this.getProvider();
        }
    }
    getProvider() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeEditor = vscodeUtils_1.getActiveTextEditor();
            const document = activeEditor === null || activeEditor === void 0 ? void 0 : activeEditor.document;
            if (document === undefined) {
                return [];
            }
            const editor = document.uri;
            const documentURI = vscode_uri_1.Utils.dirname(editor);
            const handler = this.handler.getClient();
            if (handler === undefined) {
                return [];
            }
            yield handler.client.onReady();
            const moduleCallsSupported = this.handler.clientSupportsCommand(`${handler.commandPrefix}.terraform-ls.module.providers`);
            if (!moduleCallsSupported) {
                return [];
            }
            const params = {
                command: `${handler.commandPrefix}.terraform-ls.module.providers`,
                arguments: [`uri=${documentURI}`],
            };
            const response = yield handler.client.sendRequest(vscode_languageclient_1.ExecuteCommandRequest.type, params);
            if (response === null) {
                return [];
            }
            return Object.entries(response.provider_requirements)
                .map(([provider, details]) => new ModuleProviderItem(provider, details.display_name, details.version_constraint, response.installed_providers[provider], details.docs_link))
                .filter((m) => Boolean(m.requiredVersion));
        });
    }
}
exports.ModuleProvidersDataProvider = ModuleProvidersDataProvider;
//# sourceMappingURL=moduleProviders.js.map