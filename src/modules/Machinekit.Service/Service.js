QmlWeb.registerQmlType({
  module: "Machinekit.Service",
  name: "Service",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    type: { type: "string", initialValue: "" },
    domain: { type: "string", initialValue: "local" },
    baseType: { type: "string", initialValue: "machinekit" },
    protocol: { type: "string", initialValue: "tcp" },
    name: { type: "string", initialValue: "" },
    uri: { type: "string", initialValue: "" },
    uuid: { type: "string", initialValue: "" },
    version: { type: "int", initialValue: 0 },
    ready: { type: "bool", initialValue: false },
    filter: { type: "ServiceDiscoveryFilter", initialValue: null },
    items: { type: "var", initialValue: [] },
    required: { type: "bool", initialValue: false }
  }
}, class {
  constructor(meta) {
    QmlWeb.callSuper(this, meta);
    this.objectName = "Service";
  }

  itemsUpdated() {
    if (this.items.length === 0)
    {
      this.uri = "";
      this.uuid = "";
      this.name = "";
      this.version = 0;
      this.ready = false;
    }
    else
    {
      this.uri = this.items[0].dsn;
      this.uuid = this.items[0].uuid;
      this.name = this.items[0].name;
      this.version = 0;
      this.ready = true;
    }
  }
});
