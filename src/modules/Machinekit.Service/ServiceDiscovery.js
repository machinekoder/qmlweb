QmlWeb.registerQmlType({
  module: "Machinekit.Service",
  name: "ServiceDiscovery",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  enums: {
    ServiceDiscovery: { UnicastDNS: 1, MulticastDNS: 0 }
  },
  properties: {
    running: { type: "bool", initialValue: false },
    networkReady: { type: "bool", initialValue: true },
    lookupReady: { type: "bool", initialValue: false },
    filter: { type: "ServiceDiscoveryFilter", initialValue: null },
    serviceLists: { type: "list", initialValue: [] },
    lookupMode: { type: "enum", initialValue: 1 }, // UnicastDNS
    unicastLookupInterval: { type: "int", initialValue: 1000 },
    unicastErrorThreshold: { type: "int", initialValue: 2 }
    // nameServers
  },
  signals: {
    textMessageReceived: [{ type: "string", name: "message" }]
  }
}, class {
  constructor(meta) {
    QmlWeb.callSuper(this, meta);

    this.timer = null;

    this.serviceTypes = {};

    this.runningChanged.connect(this, this.$onRunningChanged);
  }

  jsonRequest(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        callback(xhr);
      }
    };
    xhr.open("GET", url, true);
    xhr.send("");
  }

  queryData() {
    this.jsonRequest("sd/", o => {
      const data = JSON.parse(o.responseText);
      this.parseData(data);
    });
  }

  clearServiceTypes() {
    this.serviceTypes = {};
  }

  addServiceType(key, item) {
    if (!(key in this.serviceTypes))
    {
      this.serviceTypes[key] = [];
    }
    this.serviceTypes[key].push(item);
  }

  updateServiceTypes() {
    this.clearServiceTypes();
    // scan services
    for (let i = 0; i < this.serviceLists.length; ++i)
    {
      const item = this.serviceLists[i];
      for (let j = 0; j < item.services.length; ++j)
      {
        const service = item.services[j];
        this.addServiceType(service.type, service);
      }
    }
  }

  parseData(data) {
    // clear items
    Object.keys(this.serviceTypes).forEach(key => {
      const serviceArray = this.serviceTypes[key];
      for (const service of serviceArray)
      {
        service.items = [];
      }
    });

    // match discovered services
    for (let i = 0; i < data.length; ++i)
    {
      const item = data[i];
      if (item.service in this.serviceTypes)
      {
        for (const service of this.serviceTypes[item.service])
        {
          service.items.push(item);
        }
      }
    }

    // mark services as updated
    Object.keys(this.serviceTypes).forEach(key => {
      const serviceArray = this.serviceTypes[key];
      for (const service of serviceArray)
      {
        service.itemsUpdated();
      }
    });
  }

  $onRunningChanged(ready) {
    if (ready) {
      this.updateServiceTypes();
      this.queryData();
      this.timer = setInterval(() => {
        this.queryData();
      }, this.unicastLookupInterval);
    }
    else if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
});
