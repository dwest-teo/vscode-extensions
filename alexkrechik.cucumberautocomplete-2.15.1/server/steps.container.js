"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const gherkin_1 = require("./gherkin");
const vscode_languageserver_1 = require("vscode-languageserver");
const glob = require("glob");
const commentParser = require('doctrine');
class StepsContainer {
    constructor(root, settings) {
        this.elementsHash = {};
        this.elemenstCountHash = {};
        this.settings = settings;
        this.populate(root, settings.cucumberautocomplete.steps);
    }
    incrementElementCount(id) {
        if (this.elemenstCountHash[id]) {
            this.elemenstCountHash[id]++;
        }
        else {
            this.elemenstCountHash[id] = 1;
        }
    }
    getElements() {
        return this.elements;
    }
    setSettings(settings) {
        this.settings = settings;
    }
    getDescForStep(step) {
        //Remove 'Function body' part
        step = step.replace(/\{.*/, '');
        //Remove spaces in the beginning end in the end of string
        step = step.replace(/^\s*/, '').replace(/\s*$/, '');
        return step;
    }
    getPartialRegText(regText) {
        //Same with main reg, only differ is match any string that same or less that current one
        return util_1.getPartialRegParts(regText)
            .map(el => `(${el}|$)`)
            .join('( |$)')
            .replace(/^\^|^/, '^');
    }
    getRegTextForStep(step) {
        //Ruby interpolation (like `#{Something}` ) should be replaced with `.*`
        //https://github.com/alexkrechik/VSCucumberAutoComplete/issues/65
        step = step.replace(/#{(.*?)}/g, '.*');
        //Parameter-types
        //https://github.com/alexkrechik/VSCucumberAutoComplete/issues/66
        //https://docs.cucumber.io/cucumber/cucumber-expressions/
        step = step.replace(/{float}/g, '-?\\d*\\.?\\d+');
        step = step.replace(/{int}/g, '-?\\d+');
        step = step.replace(/{stringInDoubleQuotes}/g, '"[^"]+"');
        step = step.replace(/{string}/g, '"[^"]+"');
        step = step.replace(/{}/g, '.*');
        //Optional Text
        step = step.replace(/\(([a-z]+)\)/g, '($1)?');
        //Alternative text a/b/c === (a|b|c)
        step = step.replace(/([a-zA-Z]+)(?:\/([a-zA-Z]+))+/g, match => `(${match.replace(/\//g, '|')})`);
        //Handle Cucumber Expressions (like `{Something}`) should be replaced with `.*`
        //https://github.com/alexkrechik/VSCucumberAutoComplete/issues/99
        //Cucumber Expressions Custom Parameter Type Documentation
        //https://docs.cucumber.io/cucumber-expressions/#custom-parameters
        step = step.replace(/([^\\]|^){(?![\d,])(.*?)}/g, '$1.*');
        //Escape all the regex symbols to avoid errors
        step = util_1.escapeRegExp(step);
        return step;
    }
    getTextForStep(step) {
        //Remove all the backslashes
        step = step.replace(/\\/g, '');
        //Remove "string start" and "string end" RegEx symbols
        step = step.replace(/^\^|\$$/g, '');
        return step;
    }
    getElementCount(id) {
        return this.elemenstCountHash[id] || 0;
    }
    getStepRegExp() {
        //Actually, we dont care what the symbols are before our 'Gherkin' word
        //But they shouldn't end with letter
        const startPart = '^((?:[^\'"\/]*?[^\\w])|.{0})';
        //All the steps should be declared using any gherkin keyword. We should get first 'gherkin' word
        const gherkinPart = this.settings.cucumberautocomplete.gherkinDefinitionPart || `(${gherkin_1.allGherkinWords}|defineStep|Step|StepDefinition)`;
        //All the symbols, except of symbols, using as step start and letters, could be between gherkin word and our step
        const nonStepStartSymbols = `[^\/'"\`\\w]*?`;
        // Step part getting
        const { stepRegExSymbol } = this.settings.cucumberautocomplete;
        //Step text could be placed between '/' symbols (ex. in JS) or between quotes, like in Java
        const stepStart = stepRegExSymbol ? `(${stepRegExSymbol})` : `(\/|'|"|\`)`;
        //Our step could contain any symbols, except of our 'stepStart'. Use \3 to be sure in this
        const stepBody = stepRegExSymbol ? `([^${stepRegExSymbol}]+)` : '([^\\3]+)';
        //Step should be ended with same symbol it begins
        const stepEnd = stepRegExSymbol ? stepRegExSymbol : '\\3';
        //Our RegExp will be case-insensitive to support cases like TypeScript (...@when...)
        const r = new RegExp(startPart + gherkinPart + nonStepStartSymbols + stepStart + stepBody + stepEnd, 'i');
        // /^((?:[^'"\/]*?[^\w])|.{0})(Given|When|Then|And|But|defineStep)[^\/'"\w]*?(\/|'|")([^\3]+)\3/i
        return r;
    }
    getStepTextInvariants(step) {
        //Handle regexp's like 'I do (one|to|three)'
        //TODO - generate correct num of invariants for the circular braces
        const bracesRegEx = /(\([^\)\()]+\|[^\(\)]+\))/;
        if (~step.search(bracesRegEx)) {
            const match = step.match(bracesRegEx);
            const matchRes = match[1];
            const variants = matchRes.replace(/\(\?\:/, '').replace(/^\(|\)$/g, '').split('|');
            return variants.reduce((varRes, variant) => {
                return varRes.concat(this.getStepTextInvariants(step.replace(matchRes, variant)));
            }, []);
        }
        else {
            return [step];
        }
    }
    getDocumentation(stepRawComment) {
        const stepParsedComment = commentParser.parse(stepRawComment.trim(), { unwrap: true, sloppy: true, recoverable: true });
        return stepParsedComment.description ||
            (stepParsedComment.tags.find(tag => tag.title === 'description') || {}).description ||
            (stepParsedComment.tags.find(tag => tag.title === 'desc') || {}).description ||
            stepRawComment;
    }
    getSteps(fullStepLine, stepPart, def, gherkin, comments) {
        const stepsVariants = this.settings.cucumberautocomplete.stepsInvariants ?
            this.getStepTextInvariants(stepPart) : [stepPart];
        const desc = this.getDescForStep(fullStepLine);
        const comment = comments[def.range.start.line];
        const documentation = comment ? this.getDocumentation(comment) : fullStepLine;
        return stepsVariants
            .filter((step) => {
            //Filter invalid long regular expressions
            try {
                new RegExp(this.getRegTextForStep(step));
                return true;
            }
            catch (err) {
                //Todo - show some warning
                return false;
            }
        })
            .map((step) => {
            const reg = new RegExp(this.getRegTextForStep(step));
            let partialReg;
            // Use long regular expression in case of error
            try {
                partialReg = new RegExp(this.getPartialRegText(step));
            }
            catch (err) {
                // Todo - show some warning
                partialReg = reg;
            }
            //Todo we should store full value here
            const text = this.getTextForStep(step);
            const id = 'step' + util_1.getMD5Id(text);
            const count = this.getElementCount(id);
            return { id, reg, partialReg, text, desc, def, count, gherkin, documentation };
        });
    }
    geStepDefinitionMatch(line) {
        return line.match(this.getStepRegExp());
    }
    handleCustomParameters(step) {
        if (!step)
            return '';
        this.settings.cucumberautocomplete.customParameters.forEach((p) => {
            const { parameter, value } = p;
            step = step.split(parameter).join(value);
        });
        return step;
    }
    getMultiLineComments(content) {
        return content.split(/\r?\n/g).reduce((res, line, i) => {
            if (!!~line.search(/^\s*\/\*/)) {
                res.current = `${line}\n`;
                res.commentMode = true;
            }
            else if (!!~line.search(/^\s*\*\//)) {
                res.current += `${line}\n`;
                res.comments[i + 1] = res.current;
                res.commentMode = false;
            }
            else if (res.commentMode) {
                res.current += `${line}\n`;
            }
            return res;
        }, {
            comments: {}, current: '', commentMode: false
        }).comments;
    }
    getFileSteps(filePath) {
        const fileContent = util_1.getFileContent(filePath);
        const fileComments = this.getMultiLineComments(fileContent);
        const definitionFile = util_1.clearComments(fileContent);
        return definitionFile.split(/\r?\n/g).reduce((steps, line, lineIndex, lines) => {
            //TODO optimize
            let match;
            let finalLine;
            const currLine = this.handleCustomParameters(line);
            const currentMatch = this.geStepDefinitionMatch(currLine);
            //Add next line to our string to handle two-lines step definitions
            const nextLine = this.handleCustomParameters(lines[lineIndex + 1]);
            if (currentMatch) {
                match = currentMatch;
                finalLine = currLine;
            }
            else if (nextLine) {
                const nextLineMatch = this.geStepDefinitionMatch(nextLine);
                const bothLinesMatch = this.geStepDefinitionMatch(currLine + nextLine);
                if (bothLinesMatch && !nextLineMatch) {
                    match = bothLinesMatch;
                    finalLine = currLine + nextLine;
                }
            }
            if (match) {
                const [, beforeGherkin, gherkinString, , stepPart] = match;
                const gherkin = gherkin_1.getGherkinTypeLower(gherkinString);
                const pos = vscode_languageserver_1.Position.create(lineIndex, beforeGherkin.length);
                const def = vscode_languageserver_1.Location.create(util_1.getOSPath(filePath), vscode_languageserver_1.Range.create(pos, pos));
                steps = steps.concat(this.getSteps(finalLine, stepPart, def, gherkin, fileComments));
            }
            return steps;
        }, []);
    }
    populate(root, stepsPathes) {
        this.elementsHash = {};
        this.elements = stepsPathes
            .reduce((files, path) => files.concat(glob.sync(root + '/' + path, { ignore: '.gitignore' })), [])
            .reduce((elements, f) => elements.concat(this.getFileSteps(f).reduce((steps, step) => {
            if (!this.elementsHash[step.id]) {
                steps.push(step);
                this.elementsHash[step.id] = true;
            }
            return steps;
        }, [])), []);
    }
}
exports.StepsContainer = StepsContainer;
//# sourceMappingURL=steps.container.js.map