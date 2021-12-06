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
exports.GenerateBugReportCommand = void 0;
const child_process = require("child_process");
const os = require("os");
const vscode = require("vscode");
class GenerateBugReportCommand {
    constructor(ctx) {
        this.ctx = ctx;
        this.ctx.subscriptions.push(vscode.commands.registerCommand('terraform.generateBugReport', () => __awaiter(this, void 0, void 0, function* () {
            const problemText = yield vscode.window.showInputBox({
                title: 'Generate a Bug Report',
                prompt: 'Enter a short description of the problem or hit enter to submit now',
                placeHolder: "For example: I'm having trouble getting autocomplete to work when I...",
            });
            const extensions = this.getExtensions();
            const body = yield this.generateBody(extensions, problemText);
            const encodedBody = encodeURIComponent(body);
            const fullUrl = `https://github.com/hashicorp/vscode-terraform/issues/new?body=${encodedBody}`;
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(fullUrl));
        })));
    }
    dispose() {
        // throw new Error('Method not implemented.');
    }
    generateBody(extensions, problemText) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!problemText) {
                problemText = `Steps To Reproduce
=====

Steps to reproduce the behavior:

1. Go to '...'
2. Type '...'
3. See error

Include any relevant Terraform configuration or project structure:

\`\`\`terraform
resource "github_repository" "test" {
  name = "vscode-terraform"
}
\`\`\`


You can use 'tree' to output ASCII-based hierarchy of your project.

If applicable, add screenshots to help explain your problem.

Expected Behavior
-----

<!-- What should have happened? -->

Actual Behavior
-----

<!-- What actually happened? -->

Additional context
-----

<!--
Add any other context about the problem here.
Note whether you use any tools for managing Terraform version/execution (e.g. 'tfenv')
any credentials helpers, or whether you have any other Terraform extensions installed.
-->
`;
            }
            const body = `Issue Description
=====

${problemText}

Environment Information
=====

Terraform Information
-----

${this.generateRuntimeMarkdown(yield this.getRuntimeInfo())}

Visual Studio Code
-----

| Name | Version |
| --- | --- |
| Operating System | ${os.type()} ${os.arch()} ${os.release()} |
| VSCode | ${vscode.version}|

Visual Studio Code Extensions
-----

<details><summary>Visual Studio Code Extensions(Click to Expand)</summary>

${this.generateExtesnionMarkdown(extensions)}
</details>

Extension Logs
-----

> Find this from the first few lines of the relevant Output pane:
View -> Output -> 'HashiCorp Terraform'

`;
            return body;
        });
    }
    generateExtesnionMarkdown(extensions) {
        if (!extensions.length) {
            return 'none';
        }
        const tableHeader = `|Extension|Author|Version|\n|---|---|---|`;
        const table = extensions
            .map((e) => {
            return `|${e.name}|${e.publisher}|${e.version}|`;
        })
            .join('\n');
        const extensionTable = `${tableHeader}\n${table}`;
        return extensionTable;
    }
    generateRuntimeMarkdown(info) {
        const rows = `
Version:\t${info.version}
Platform:\t${info.platform}
Outdated:\t${info.outdated}
    `;
        return rows;
    }
    getExtensions() {
        const extensions = vscode.extensions.all
            .filter((element) => element.packageJSON.isBuiltin === false)
            .sort((leftside, rightside) => {
            if (leftside.packageJSON.name.toLowerCase() < rightside.packageJSON.name.toLowerCase()) {
                return -1;
            }
            if (leftside.packageJSON.name.toLowerCase() > rightside.packageJSON.name.toLowerCase()) {
                return 1;
            }
            return 0;
        })
            .map((ext) => {
            return {
                name: ext.packageJSON.name,
                publisher: ext.packageJSON.publisher,
                version: ext.packageJSON.version,
            };
        });
        return extensions;
    }
    getRuntimeInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const terraformExe = 'terraform';
            const spawn = child_process.spawnSync;
            try {
                const child = spawn(terraformExe, ['version', '-json']);
                const response = child.stdout.toString();
                const j = JSON.parse(response);
                return {
                    version: j.terraform_version,
                    platform: j.platform,
                    outdated: j.terraform_outdated,
                };
            }
            catch (err) {
                if (err.status === 0) {
                    return {
                        version: 'Not found',
                        platform: 'Not found',
                        outdated: false,
                    };
                }
            }
            try {
                // assume older version of terraform which didn't have json flag
                const child = spawn(terraformExe, ['version']);
                const response = child.stdout.toString() || child.stderr.toString();
                const regex = new RegExp('v?(?<version>[0-9]+(?:.[0-9]+)*(?:-[A-Za-z0-9.]+)?)');
                const matches = regex.exec(response);
                const version = matches[1];
                const platform = response.split('\n')[1].replace('on ', '');
                return {
                    version: version,
                    platform: platform,
                    outdated: false,
                };
            }
            catch (_a) {
                return {
                    version: 'Not found',
                    platform: 'Not found',
                    outdated: false,
                };
            }
        });
    }
}
exports.GenerateBugReportCommand = GenerateBugReportCommand;
//# sourceMappingURL=generateBugReport.js.map