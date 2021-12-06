"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerPath = exports.CUSTOM_BIN_PATH_OPTION_NAME = void 0;
const path = require("path");
const vscode = require("vscode");
const INSTALL_FOLDER_NAME = 'bin';
exports.CUSTOM_BIN_PATH_OPTION_NAME = 'languageServer.pathToBinary';
class ServerPath {
    constructor(context) {
        this.context = context;
        this.customBinPath = vscode.workspace.getConfiguration('terraform').get(exports.CUSTOM_BIN_PATH_OPTION_NAME);
    }
    installPath() {
        return path.join(this.context.globalStorageUri.fsPath, INSTALL_FOLDER_NAME);
    }
    // legacyBinPath represents old location where LS was installed.
    // We only use it to ensure that old installations are removed
    // from there after LS is installed into the new path.
    legacyBinPath() {
        return path.resolve(this.context.asAbsolutePath('lsp'), this.binName());
    }
    hasCustomBinPath() {
        return !!this.customBinPath;
    }
    binPath() {
        if (this.hasCustomBinPath()) {
            return this.customBinPath;
        }
        return path.resolve(this.installPath(), this.binName());
    }
    binName() {
        if (this.hasCustomBinPath()) {
            return path.basename(this.customBinPath);
        }
        if (process.platform === 'win32') {
            return 'terraform-ls.exe';
        }
        return 'terraform-ls';
    }
}
exports.ServerPath = ServerPath;
//# sourceMappingURL=serverPath.js.map