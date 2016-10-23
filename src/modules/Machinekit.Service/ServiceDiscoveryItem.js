QmlWeb.registerQmlType({
  module: "Machinekit.Service",
  name: "ServiceDiscoveryItem",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    type: { type: "string", initialValue: "" },
    name: { type: "string", initialValue: "" },
    uri: { type: "string", initialValue: "" },
    uuid: { type: "string", initialValue: "" },
    version: { type: "int", initialValue: 0 },
    port: { type: "int", initialValue: 0 },
    hostName: { type: "string", initialValue: "" },
    hostAddress: { type: "string", initialValue: "" },
    txtRecords: { type: "var", initialValue: "" },
    updated: { type: "bool", initialValue: false }
  }
}, class {
  constructor(meta) {
    QmlWeb.callSuper(this, meta);

  }

});
