//const json = require("./tickets/ticket9.json");
const path = require("path");
const fs = require("fs");

const moment = require("moment");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: "Resultados.csv",
  header: [
    { id: "name", title: "Nombre" },
    { id: "cif", title: "CIF" },
    { id: "factura", title: "Es Factura" },
    { id: "total", title: "Total" },
    { id: "invoice", title: "Invoice Num" },
    { id: "fecha", title: "Fecha" },
    { id: "iva1", title: "IVA 1" },
    { id: "iva2", title: "IVA 2" }
  ]
});

const directoryPath = path.join(__dirname, "tickets");

let compositionData = require("./composition.json");

compositionData = compositionData.data.elements;

const initializeCatalogs = data => {
  let object = {};
  const record = {};

  data.map(i => {
    if (i.composition.length === 1) {
      object[i.name] = i.composition[0];
    } else {
      i.composition.map(o => {
        object[o.name] = o;
      });
    }
  });
  return object;
};

compositionData = {
  ...compositionData,
  composition: Object.entries(compositionData.composition).map(i => ({
    name: i[1].info[0].name,
    ...i[1]
  }))
};

let catalogs = initializeCatalogs(compositionData.composition);

const handleResponseOCR = (data, catalogs) => {
  const newState = {};

  const str = data[0].description.split("\n");

  const regexCIF = /[a-zA-Z]\d{8}|\d{8}[a-zA-Z]/;

  const formatCIF = string =>
    string
      .replace(/\d{9,}|-/g, " ")
      .replace(/\./g, "")
      .replace(/[a-zA-Z]{2,}/g, " ")
      .replace(/\s+/g, "");

  const CIF = str.find(item => formatCIF(item).match(regexCIF));
  if (CIF) {
    const providerFound = catalogs.providerId.values.find(
      i => i.cif === formatCIF(CIF).match(regexCIF)[0]
    );
    if (providerFound) {
      newState.providerTypeSelected = providerFound;
    }
  }
  console.log(`CIF: ${CIF ? formatCIF(CIF).match(regexCIF)[0] : undefined}`);

  const esFactura =
    str.filter(item => formatCIF(item).match(regexCIF)).length > 1;
  console.log(`Es factura: ${esFactura}`);

  newState.documentTypeSelected = esFactura ? 0 : 1;

  const formatPrices = string =>
    string
      .replace(",", ".")
      .replace(/€|\*|Total:|\d[a-zA-Z]|[a-zA-Z]|/g || /\s+/g, "");

  const price = str
    .filter(i => /\.|,|€|\*|Total:/.test(i) && !isNaN(formatPrices(i)))
    .map(i => Number(formatPrices(i)))
    .sort((a, b) => b - a)[
    str.filter(i => i.toLowerCase().includes("cambio")).length > 0 ? 1 : 0
  ];

  console.log(`Total : ${price || 0}`);
  newState.price = price || 0;

  const invoiceNumberIndex = str.findIndex(item =>
    /n°|ticket|tiquet|nº|fact\.|f\/s|número|numero|factura:|#/g.test(
      item.toLowerCase()
    )
  );

  const formatInvoiceNum = string =>
    string
      .toLowerCase()
      .replace("factura", "")
      .replace("simple", "")
      .replace("ticket", "")
      .replace("tiquet", "")
      .replace("numero", "")
      .replace("número", "")
      .replace(":", "")
      .replace(/\d{2}([./-])\d{2}\1\d{2,4}/, "")
      .replace(/(([0-1]?[0-9])|(2[0-3])):[0-5][0-9]:[0-5][0-9]/, "")
      .replace(/\d\d\/\d\d\//, "")
      .replace(/\./g, "")
      .replace(/\s+/g, "")
      .replace("fact", "")
      .replace("f/s", "")
      .replace("de", "")
      .replace("n°", "")
      .replace("nº", "")
      .replace("n", "")
      .replace("f:", "")
      .replace("h:", "")
      .replace("#", "");

  const invoiceNum =
    invoiceNumberIndex !== -1
      ? formatInvoiceNum(str[invoiceNumberIndex]).length > 4
        ? formatInvoiceNum(str[invoiceNumberIndex])
        : str[invoiceNumberIndex + 1]
      : undefined;

  console.log(`Invoice Num: ${invoiceNum}`);
  newState.invoiceNum = invoiceNum;

  const fechaIndex = str.findIndex(item =>
    item.toLowerCase().includes("fecha")
  );
  const dateReg = /\d{2}([./-\s])(\d{2}|[a-zA-Z]{3})([./-\s])\d{2,4}/;

  const date =
    fechaIndex !== -1
      ? str
          .map((item, index) => ({
            description: item,
            index: Math.abs(index - fechaIndex)
          }))
          .filter(item => item.description.match(dateReg))
          .sort((a, b) => a.index - b.index).length > 0
        ? str
            .map((item, index) => ({
              description: item,
              index: Math.abs(index - fechaIndex)
            }))
            .filter(item => item.description.match(dateReg))
            .sort((a, b) => a.index - b.index)[0]
            .description.match(dateReg)[0]
        : null
      : (data[0].description.match(dateReg) &&
          data[0].description.match(dateReg)[0]) ||
        null;
  console.log(`Fecha: ${date}`);
  newState.startDate = new Date(date ? moment(date, "DD-MM-YYYY") : moment());

  let firstIVA = str.findIndex(item =>
    /total iva|iva|i\.v\.a|%/g.test(item.toLowerCase())
  );
  const selectedIvas = [];
  const dataIvas = catalogs.ivas.values.map(i => ({
    ...i,
    value: ((price || 0) / (1 + Number(i.IVA) / 100)).toFixed(2)
  }));
  if (firstIVA !== -1) {
    console.log(str[firstIVA]);
    if (!str[firstIVA].match(/\d+/g)) {
      firstIVA = firstIVA + 1;
    }

    str[firstIVA].replace("%", "");
    const test = str[firstIVA].split(",");

    if (Number(test[0]) <= 0) {
      firstIVA = str.findIndex(item => item.includes("%"));
      if (firstIVA !== -1) {
        if (!str[firstIVA].match(/\d+/g)) {
          firstIVA = firstIVA + 1;
        }
      }
    }
    if (str[firstIVA]) {
      if (str[firstIVA].includes("21")) {
        console.log("IVA: 21%");
        selectedIvas.push(dataIvas.find(i => i.IVA === "21"));
        newState.iva = 3;
      } else if (str[firstIVA].includes("10")) {
        console.log("IVA: 10%");
        selectedIvas.push(dataIvas.find(i => i.IVA === "10"));
        newState.iva = 2;
      } else if (str[firstIVA].includes("4")) {
        console.log("IVA: 4%");
        selectedIvas.push(dataIvas.find(i => i.IVA === "4"));
        newState.iva = 1;
      } else {
        console.log("IVA: 0%");
        selectedIvas.push(dataIvas.find(i => i.IVA === "0"));
        newState.iva = 0;
      }
    } else {
      console.log("IVA: 0%");
      selectedIvas.push(dataIvas.find(i => i.IVA === "0"));
      newState.iva = 0;
    }
  } else {
    console.log("IVA: 0%");
    selectedIvas.push(dataIvas.find(i => i.IVA === "0"));
    newState.iva = 0;
  }
  newState.selectedIvas = selectedIvas;
  newState.catalogs = { ...catalogs, ivas: { values: dataIvas } };
  return newState;
};

fs.readdir(directoryPath, function(err, files) {
  //handling error
  if (err) {
    return console.log("Unable to scan directory: " + err);
  }
  //listing all files using forEach
  const records = [];
  files.forEach(function(file) {
    // Do whatever you want to do with the file
    console.log(file);
    let json = require("./tickets/" + file);
    if (json.responses[0].textAnnotations) {
      let answer = handleResponseOCR(
        json.responses[0].textAnnotations,
        catalogs
      );
      let record = {};
      record.name = file;
      record.cif = answer.providerTypeSelected
        ? answer.providerTypeSelected.cif
        : "NaN";
      record.factura = answer.documentTypeSelected === 1 ? "No" : "Si";
      record.total = answer.price ? answer.price : 0;
      record.invoice = answer.invoiceNum ? answer.invoiceNum : "NaN";
      record.fecha = answer.startDate
        ? moment(answer.startDate).format("DD/MM/YYYY")
        : "NaN";
      record.iva1 = answer.iva
        ? answer.selectedIvas[0]
          ? answer.selectedIvas[0].IVA
          : "NaN"
        : "NaN";
      record.iva2 = answer.iva
        ? answer.selectedIvas[1]
          ? answer.selectedIvas[1].IVA
          : "NaN"
        : "NaN";
      records.push(record);
    }
  });
  csvWriter
    .writeRecords(records) // returns a promise
    .then(() => {
      console.log("...Done");
    });
});
