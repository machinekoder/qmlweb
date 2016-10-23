QmlWeb.registerQmlType({
  module: "Machinekit.Service",
  name: "ServiceDiscoveryFilter",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    ready: "bool",
    status: { type: "enum", initialValue: 3 }, // WebSocket.Closed
    errorString: "string",
    uri: "string",
    serviceData: { type: "var", initialValue: [] },
    interval: { type: "int", initialValue: 1000 },
    test: "bool"
  }
}, class {
  constructor(meta) {
    QmlWeb.callSuper(this, meta);
  }

});
