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
exports.moduleCallers = exports.updateTerraformStatusBar = exports.deactivate = exports.activate = exports.terraformStatus = void 0;
const vscode = require("vscode");
const vscode_extension_telemetry_1 = require("vscode-extension-telemetry");
const vscode_languageclient_1 = require("vscode-languageclient");
const vscode_uri_1 = require("vscode-uri");
const clientHandler_1 = require("./clientHandler");
const generateBugReport_1 = require("./commands/generateBugReport");
const languageServerInstaller_1 = require("./languageServerInstaller");
const moduleCalls_1 = require("./providers/moduleCalls");
const moduleProviders_1 = require("./providers/moduleProviders");
const serverPath_1 = require("./serverPath");
const utils_1 = require("./utils");
const vscodeUtils_1 = require("./vscodeUtils");
const brand = `HashiCorp Terraform`;
const outputChannel = vscode.window.createOutputChannel(brand);
let reporter;
let clientHandler;
const languageServerUpdater = new utils_1.SingleInstanceTimeout();
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const manifest = context.extension.packageJSON;
        exports.terraformStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        reporter = new vscode_extension_telemetry_1.default(context.extension.id, manifest.version, manifest.appInsightsKey);
        context.subscriptions.push(reporter);
        const lsPath = new serverPath_1.ServerPath(context);
        clientHandler = new clientHandler_1.ClientHandler(lsPath, outputChannel, reporter);
        // get rid of pre-2.0.0 settings
        if (vscodeUtils_1.config('terraform').has('languageServer.enabled')) {
            try {
                yield vscodeUtils_1.config('terraform').update('languageServer', { enabled: undefined, external: true }, vscode.ConfigurationTarget.Global);
            }
            catch (err) {
                console.error(`Error trying to erase pre-2.0.0 settings: ${err.message}`);
            }
        }
        if (vscodeUtils_1.config('terraform').has('languageServer.requiredVersion')) {
            const langServerVer = vscodeUtils_1.config('terraform').get('languageServer.requiredVersion', languageServerInstaller_1.defaultVersionString);
            if (!languageServerInstaller_1.isValidVersionString(langServerVer)) {
                vscode.window.showWarningMessage(`The Terraform Language Server Version string '${langServerVer}' is not a valid semantic version and will be ignored.`);
            }
        }
        // Subscriptions
        context.subscriptions.push(vscode.commands.registerCommand('terraform.enableLanguageServer', () => __awaiter(this, void 0, void 0, function* () {
            if (!enabled()) {
                const current = vscodeUtils_1.config('terraform').get('languageServer');
                yield vscodeUtils_1.config('terraform').update('languageServer', Object.assign(current, { external: true }), vscode.ConfigurationTarget.Global);
            }
            yield updateLanguageServer(manifest.version, lsPath);
            return clientHandler.startClient();
        })), vscode.commands.registerCommand('terraform.disableLanguageServer', () => __awaiter(this, void 0, void 0, function* () {
            if (enabled()) {
                const current = vscodeUtils_1.config('terraform').get('languageServer');
                yield vscodeUtils_1.config('terraform').update('languageServer', Object.assign(current, { external: false }), vscode.ConfigurationTarget.Global);
            }
            languageServerUpdater.clear();
            return clientHandler.stopClient();
        })), vscode.commands.registerCommand('terraform.apply', () => __awaiter(this, void 0, void 0, function* () {
            yield terraformCommand('apply', false);
        })), vscode.commands.registerCommand('terraform.init', () => __awaiter(this, void 0, void 0, function* () {
            const selected = yield vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: vscode.workspace.workspaceFolders[0].uri,
                openLabel: 'Initialize',
            });
            if (selected) {
                const moduleUri = selected[0];
                const client = clientHandler.getClient();
                const requestParams = {
                    command: `${client.commandPrefix}.terraform-ls.terraform.init`,
                    arguments: [`uri=${moduleUri}`],
                };
                yield execWorkspaceCommand(client.client, requestParams);
            }
        })), vscode.commands.registerCommand('terraform.initCurrent', () => __awaiter(this, void 0, void 0, function* () {
            yield terraformCommand('init', true);
        })), vscode.commands.registerCommand('terraform.plan', () => __awaiter(this, void 0, void 0, function* () {
            yield terraformCommand('plan', false);
        })), vscode.commands.registerCommand('terraform.validate', () => __awaiter(this, void 0, void 0, function* () {
            yield terraformCommand('validate', true);
        })), new generateBugReport_1.GenerateBugReportCommand(context), vscode.window.registerTreeDataProvider('terraform.modules', new moduleCalls_1.ModuleCallsDataProvider(context, clientHandler)), vscode.window.registerTreeDataProvider('terraform.providers', new moduleProviders_1.ModuleProvidersDataProvider(context, clientHandler)), vscode.workspace.onDidChangeConfiguration((event) => __awaiter(this, void 0, void 0, function* () {
            if (event.affectsConfiguration('terraform') || event.affectsConfiguration('terraform-ls')) {
                const reloadMsg = 'Reload VSCode window to apply language server changes';
                const selected = yield vscode.window.showInformationMessage(reloadMsg, 'Reload');
                if (selected === 'Reload') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            }
        })), vscode.window.onDidChangeVisibleTextEditors((editors) => __awaiter(this, void 0, void 0, function* () {
            const textEditor = editors.find((ed) => !!ed.viewColumn);
            if ((textEditor === null || textEditor === void 0 ? void 0 : textEditor.document) === undefined) {
                return;
            }
            yield updateTerraformStatusBar(textEditor.document.uri);
        })));
        if (enabled()) {
            try {
                yield updateLanguageServer(manifest.version, lsPath);
                yield clientHandler.startClient();
                vscode.commands.executeCommand('setContext', 'terraform.showTreeViews', true);
            }
            catch (error) {
                reporter.sendTelemetryException(error);
            }
        }
    });
}
exports.activate = activate;
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        if (clientHandler === undefined) {
            return;
        }
        return clientHandler.stopClient();
    });
}
exports.deactivate = deactivate;
function updateTerraformStatusBar(documentUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = clientHandler.getClient();
        if (client === undefined) {
            return;
        }
        const initSupported = clientHandler.clientSupportsCommand(`${client.commandPrefix}.terraform-ls.terraform.init`);
        if (!initSupported) {
            return;
        }
        try {
            const moduleUri = vscode_uri_1.Utils.dirname(documentUri);
            const response = yield moduleCallers(moduleUri.toString());
            if (response.moduleCallers.length === 0) {
                const dirName = vscode_uri_1.Utils.basename(moduleUri);
                exports.terraformStatus.text = `$(refresh) ${dirName}`;
                exports.terraformStatus.color = new vscode.ThemeColor('statusBar.foreground');
                exports.terraformStatus.tooltip = `Click to run terraform init`;
                exports.terraformStatus.command = 'terraform.initCurrent';
                exports.terraformStatus.show();
            }
            else {
                exports.terraformStatus.hide();
                exports.terraformStatus.text = '';
            }
        }
        catch (err) {
            vscode.window.showErrorMessage(err);
            reporter.sendTelemetryException(err);
            exports.terraformStatus.hide();
        }
    });
}
exports.updateTerraformStatusBar = updateTerraformStatusBar;
function updateLanguageServer(extVersion, lsPath, scheduled = false) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Checking for language server updates...');
        const hour = 1000 * 60 * 60;
        languageServerUpdater.timeout(function () {
            updateLanguageServer(extVersion, lsPath, true);
        }, 24 * hour);
        try {
            if (lsPath.hasCustomBinPath()) {
                // skip install if a language server binary path is set
                return;
            }
            const installer = new languageServerInstaller_1.LanguageServerInstaller(extVersion, lsPath, reporter);
            const install = yield installer.needsInstall(vscodeUtils_1.config('terraform').get('languageServer.requiredVersion', languageServerInstaller_1.defaultVersionString));
            if (install === false) {
                // no install required
                return;
            }
            // an install is needed, either as an update or fresh install
            // stop current client, if it exists
            yield clientHandler.stopClient();
            try {
                // install ls from configured source
                yield installer.install();
            }
            catch (err) {
                console.log(err); // for test failure reporting
                reporter.sendTelemetryException(err);
                throw err;
            }
            finally {
                // clean up after ourselves and remove zip files
                yield installer.cleanupZips();
            }
            if (scheduled) {
                // scheduled updates still need to start client
                yield clientHandler.startClient();
            }
        }
        catch (error) {
            console.log(error); // for test failure reporting
            vscode.window.showErrorMessage(error.message);
        }
    });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function execWorkspaceCommand(client, params) {
    reporter.sendTelemetryEvent('execWorkspaceCommand', { command: params.command });
    return client.sendRequest(vscode_languageclient_1.ExecuteCommandRequest.type, params);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function modulesCallersCommand(languageClient, moduleUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const requestParams = {
            command: `${languageClient.commandPrefix}.terraform-ls.module.callers`,
            arguments: [`uri=${moduleUri}`],
        };
        return execWorkspaceCommand(languageClient.client, requestParams);
    });
}
function moduleCallers(moduleUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = clientHandler.getClient();
        if (client === undefined) {
            return {
                version: 0,
                moduleCallers: [],
            };
        }
        const response = yield modulesCallersCommand(client, moduleUri);
        const moduleCallers = response.callers;
        return { version: response.v, moduleCallers };
    });
}
exports.moduleCallers = moduleCallers;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function terraformCommand(command, languageServerExec = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const textEditor = vscodeUtils_1.getActiveTextEditor();
        if (textEditor) {
            const languageClient = clientHandler.getClient();
            const moduleUri = vscode_uri_1.Utils.dirname(textEditor.document.uri);
            const response = yield moduleCallers(moduleUri.toString());
            let selectedModule;
            if (response.moduleCallers.length > 1) {
                const selected = yield vscode.window.showQuickPick(response.moduleCallers.map((m) => m.uri), { canPickMany: false });
                selectedModule = selected[0];
            }
            else if (response.moduleCallers.length == 1) {
                selectedModule = response.moduleCallers[0].uri;
            }
            else {
                selectedModule = moduleUri.toString();
            }
            if (languageServerExec) {
                const requestParams = {
                    command: `${languageClient.commandPrefix}.terraform-ls.terraform.${command}`,
                    arguments: [`uri=${selectedModule}`],
                };
                return execWorkspaceCommand(languageClient.client, requestParams);
            }
            else {
                const terminalName = `Terraform ${selectedModule}`;
                const moduleURI = vscode.Uri.parse(selectedModule);
                const terraformCommand = yield vscode.window.showInputBox({
                    value: `terraform ${command}`,
                    prompt: `Run in ${selectedModule}`,
                });
                if (terraformCommand) {
                    const terminal = vscode.window.terminals.find((t) => t.name == terminalName) ||
                        vscode.window.createTerminal({ name: `Terraform ${selectedModule}`, cwd: moduleURI });
                    terminal.sendText(terraformCommand);
                    terminal.show();
                }
                return;
            }
        }
        else {
            vscode.window.showWarningMessage(`Open a module then run terraform ${command} again`);
            return;
        }
    });
}
function enabled() {
    return vscodeUtils_1.config('terraform').get('languageServer.external');
}
//# sourceMappingURL=extension.js.map