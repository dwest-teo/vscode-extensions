"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryFeature = void 0;
const TELEMETRY_VERSION = 1;
class TelemetryFeature {
    constructor(client, reporter) {
        this.client = client;
        this.client.onTelemetry((event) => {
            if (event.v != TELEMETRY_VERSION) {
                console.log(`unsupported telemetry event: ${event}`);
                return;
            }
            reporter.sendRawTelemetryEvent(event.name, event.properties);
        });
    }
    fillClientCapabilities(capabilities) {
        if (!capabilities['experimental']) {
            capabilities['experimental'] = {};
        }
        capabilities['experimental']['telemetryVersion'] = TELEMETRY_VERSION;
    }
    initialize() {
        return;
    }
    dispose() {
        return;
    }
}
exports.TelemetryFeature = TelemetryFeature;
//# sourceMappingURL=telemetry.js.map