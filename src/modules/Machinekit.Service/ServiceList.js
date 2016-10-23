QmlWeb.registerQmlType({
  module: "Machinekit.Service",
  name: "ServiceList",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    services: { type: "items", initialValue: [] }
  },
  defaultProperty: "services"
}, class {
  constructor(meta) {
    QmlWeb.callSuper(this, meta);
  }
});
