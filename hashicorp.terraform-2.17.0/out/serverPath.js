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
exports.ServerPath = exports.CUSTOM_BIN_PATH_OPTION_NAME = void 0;
const path = require("path");
const vscode = require("vscode");
const which = require("which");
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
    resolvedPathToBinary() {
        return __awaiter(this, void 0, void 0, function* () {
            const pathToBinary = this.binPath();
            let cmd;
            try {
                if (path.isAbsolute(pathToBinary)) {
                    yield vscode.workspace.fs.stat(vscode.Uri.file(pathToBinary));
                    cmd = pathToBinary;
                }
                else {
                    cmd = which.sync(pathToBinary);
                }
                console.log(`Found server at ${cmd}`);
            }
            catch (err) {
                let extraHint = '';
                if (this.hasCustomBinPath()) {
                    extraHint = `. Check "${exports.CUSTOM_BIN_PATH_OPTION_NAME}" in your settings.`;
                }
                throw new Error(`Unable to launch language server: ${err.message}${extraHint}`);
            }
            return cmd;
        });
    }
}
exports.ServerPath = ServerPath;
//# sourceMappingURL=serverPath.js.map