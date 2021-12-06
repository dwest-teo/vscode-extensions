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
exports.ClientHandler = void 0;
const short_unique_id_1 = require("short-unique-id");
const vscode = require("vscode");
const node_1 = require("vscode-languageclient/node");
const showReferences_1 = require("./showReferences");
const telemetry_1 = require("./telemetry");
const vscodeUtils_1 = require("./vscodeUtils");
/**
 * ClientHandler maintains lifecycles of language clients
 * based on the server's capabilities
 */
class ClientHandler {
    constructor(lsPath, outputChannel, reporter) {
        this.lsPath = lsPath;
        this.outputChannel = outputChannel;
        this.reporter = reporter;
        this.shortUid = undefined;
        this.tfClient = undefined;
        this.commands = [];
        this.shortUid = new short_unique_id_1.default();
        if (lsPath.hasCustomBinPath()) {
            this.reporter.sendTelemetryEvent('usePathToBinary');
        }
    }
    startClient() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Starting client');
            this.tfClient = yield this.createTerraformClient();
            const disposable = this.tfClient.client.start();
            yield this.tfClient.client.onReady();
            this.reporter.sendTelemetryEvent('startClient');
            const multiFoldersSupported = (_b = (_a = this.tfClient.client.initializeResult.capabilities.workspace) === null || _a === void 0 ? void 0 : _a.workspaceFolders) === null || _b === void 0 ? void 0 : _b.supported;
            console.log(`Multi-folder support: ${multiFoldersSupported}`);
            this.commands = (_c = this.tfClient.client.initializeResult.capabilities.executeCommandProvider) === null || _c === void 0 ? void 0 : _c.commands;
            return disposable;
        });
    }
    createTerraformClient() {
        return __awaiter(this, void 0, void 0, function* () {
            const commandPrefix = this.shortUid.seq();
            const initializationOptions = this.getInitializationOptions(commandPrefix);
            const serverOptions = yield this.getServerOptions();
            const documentSelector = [
                { scheme: 'file', language: 'terraform' },
                { scheme: 'file', language: 'terraform-vars' },
            ];
            const clientOptions = {
                documentSelector: documentSelector,
                initializationOptions: initializationOptions,
                initializationFailedHandler: (error) => {
                    this.reporter.sendTelemetryException(error);
                    return false;
                },
                outputChannel: this.outputChannel,
                revealOutputChannelOn: node_1.RevealOutputChannelOn.Never,
            };
            const id = `terraform`;
            const client = new node_1.LanguageClient(id, serverOptions, clientOptions);
            const codeLensReferenceCount = vscodeUtils_1.config('terraform').get('codelens.referenceCount');
            if (codeLensReferenceCount) {
                client.registerFeature(new showReferences_1.ShowReferencesFeature(client));
            }
            if (vscode.env.isTelemetryEnabled) {
                client.registerFeature(new telemetry_1.TelemetryFeature(client, this.reporter));
            }
            client.onDidChangeState((event) => {
                console.log(`Client: ${node_1.State[event.oldState]} --> ${node_1.State[event.newState]}`);
                if (event.newState === node_1.State.Stopped) {
                    this.reporter.sendTelemetryEvent('stopClient');
                }
            });
            return { commandPrefix, client };
        });
    }
    getServerOptions() {
        return __awaiter(this, void 0, void 0, function* () {
            const cmd = yield this.lsPath.resolvedPathToBinary();
            const serverArgs = vscodeUtils_1.config('terraform').get('languageServer.args');
            const executable = {
                command: cmd,
                args: serverArgs,
                options: {},
            };
            const serverOptions = {
                run: executable,
                debug: executable,
            };
            this.outputChannel.appendLine(`Launching language server: ${cmd} ${serverArgs.join(' ')}`);
            return serverOptions;
        });
    }
    getInitializationOptions(commandPrefix) {
        const rootModulePaths = vscodeUtils_1.config('terraform-ls').get('rootModules', []);
        const terraformExecPath = vscodeUtils_1.config('terraform-ls').get('terraformExecPath');
        const terraformExecTimeout = vscodeUtils_1.config('terraform-ls').get('terraformExecTimeout');
        const terraformLogFilePath = vscodeUtils_1.config('terraform-ls').get('terraformLogFilePath');
        const excludeModulePaths = vscodeUtils_1.config('terraform-ls').get('excludeRootModules', []);
        const ignoreDirectoryNames = vscodeUtils_1.config('terraform-ls').get('ignoreDirectoryNames', []);
        if (rootModulePaths.length > 0 && excludeModulePaths.length > 0) {
            throw new Error('Only one of rootModules and excludeRootModules can be set at the same time, please remove the conflicting config and reload');
        }
        const experimentalFeatures = vscodeUtils_1.config('terraform-ls').get('experimentalFeatures');
        const initializationOptions = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ commandPrefix,
            experimentalFeatures }, (terraformExecPath.length > 0 && { terraformExecPath })), (terraformExecTimeout.length > 0 && { terraformExecTimeout })), (terraformLogFilePath.length > 0 && { terraformLogFilePath })), (rootModulePaths.length > 0 && { rootModulePaths })), (excludeModulePaths.length > 0 && { excludeModulePaths })), (ignoreDirectoryNames.length > 0 && { ignoreDirectoryNames }));
        return initializationOptions;
    }
    stopClient() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (((_a = this.tfClient) === null || _a === void 0 ? void 0 : _a.client) === undefined) {
                return;
            }
            yield this.tfClient.client.stop();
            console.log('Client stopped');
        });
    }
    getClient() {
        return this.tfClient;
    }
    clientSupportsCommand(cmdName) {
        return this.commands.includes(cmdName);
    }
}
exports.ClientHandler = ClientHandler;
//# sourceMappingURL=clientHandler.js.map