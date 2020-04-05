//const json = require("./tickets/ticket9.json");
const path = require("path");
const fs = require("fs");

const moment = require("moment");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: "ResultadosFacturas75.csv",
  header: [
    { id: "ID", title: "ID" },
    { id: "FICHERO", title: "FICHERO" },
    { id: "FECHA", title: "FECHA" },
    { id: "IMPORTE", title: "IMPORTE" },
    { id: "TIPOIVA1", title: "TIPO IVA 1" },
    { id: "BASEIMPONIBLE1", title: "BASE IMPONIBLE 1" },
    { id: "TIPOIVA2", title: "TIPO IVA 2" },
    { id: "BASEIMPONIBLE2", title: "BASE IMPONIBLE 2" },
    { id: "TIPOIVA3", title: "TIPO IVA 3" },
    { id: "BASEIMPONIBLE3", title: "BASE IMPONIBLE 3" },
    { id: "NUMTICKET", title: "NUM. TICKET" },
    { id: "FACTURATICKET", title: "FACTURA/TICKET" },
    { id: "CIFPROVEEDOR", title: "CIF PROVEEDOR" },
  ],
});

const directoryPath = path.join(__dirname, "facturas75");

let compositionData = require("./composition.json");

compositionData = compositionData.data.elements;

const initializeCatalogs = (data) => {
  let object = {};
  data.map((i) => {
    if (i.composition.length === 1) {
      object[i.name] = i.composition[0];
    } else {
      i.composition.map((o) => {
        object[o.name] = o;
      });
    }
  });
  return object;
};

compositionData = {
  ...compositionData,
  composition: Object.entries(compositionData.composition).map((i) => ({
    name: i[1].info[0].name,
    ...i[1],
  })),
};

let catalogs = initializeCatalogs(compositionData.composition);

const handleResponseOCR = (data, catalogs) => {
  const newState = {};

  const str = data[0].description.split("\n");

  const regexCIF = /(?<![\da-zA-Z])\d{2}.?\d{3}.?\d{3}[-\s]?[a-zA-Z](?![\da-zA-Z])|(?<![\da-zA-Z])[KLMXYZ][-\s]?\d{7}[-\s]?[a-zA-Z](?![\da-zA-Z])|(?<![\da-zA-RT-Z])[ABCDEFGHJUV][-\s]?\d{2}.?\d{3}.?\d{2}[-\s]?\d(?![\da-zA-Z])|(?<![\da-zA-RT-Z])[NPQRSW][-\s]?\d{7}[-\s]?[A-J](?![\da-zA-Z])/;

  const CIF = str.find(
    (item) =>
      regexCIF.test(item) &&
      (item.match(regexCIF) ? item.match(regexCIF)[0] !== "B18905182" : false)
  );

  if (CIF) {
    const providerFound = catalogs.providerId.values.find(
      (i) =>
        i.cif === CIF.match(regexCIF)[0].replace("-", "").replace(/\s+/g, "")
    );
    if (providerFound) {
      newState.providerTypeSelected = providerFound;
    }
  }
  console.log(
    `CIF: ${
      CIF
        ? CIF.match(regexCIF)[0].replace("-", "").replace(/\s+/g, "")
        : undefined
    }`
  );

  //Not in RN Code
  newState.CIF = CIF
    ? CIF.match(regexCIF)[0].replace("-", "").replace(/\s+/g, "")
    : "";

  const esFactura = str.filter((item) => item.match(regexCIF)).length > 1;
  console.log(`Es factura: ${esFactura}`);

  newState.documentTypeSelected = esFactura ? 0 : 1;

  const formatPrices = (string) =>
    string
      .replace(",", ".")
      .replace(/€|\*|Total:|\d[a-zA-Z]|[a-zA-Z]|/g || /\s+/g, "");

  const price = str
    .filter((i) => /\.|,|€|\*|Total:/.test(i) && !isNaN(formatPrices(i)))
    .map((i) => Number(formatPrices(i)))
    .sort((a, b) => b - a)[
    str.filter((i) => i.toLowerCase().includes("cambio")).length > 0 ? 1 : 0
  ];

  console.log(`Total : ${price || 0}`);
  newState.price = price || 0;

  const invoiceNumberIndex = str.findIndex((item) =>
    /n°|ticket|tiquet|nº|fact\.|f\/s|número|numero|factura:|#/g.test(
      item.toLowerCase()
    )
  );

  const formatInvoiceNum = (string) =>
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

  const fechaIndex = str.findIndex((item) =>
    item.toLowerCase().includes("fecha")
  );

  const dateReg = /[0-3]\d([./-])([0-1]\d|[a-zA-Z]{3})\1(\d{4}|\d{2})/;

  let date =
    fechaIndex !== -1
      ? str
          .map((item, index) => ({
            description: item,
            index: Math.abs(index - fechaIndex),
          }))
          .filter((item) => item.description.match(dateReg))
          .sort((a, b) => a.index - b.index).length > 0
        ? str
            .map((item, index) => ({
              description: item,
              index: Math.abs(index - fechaIndex),
            }))
            .filter((item) => item.description.match(dateReg))
            .sort((a, b) => a.index - b.index)[0]
            .description.match(dateReg)[0]
        : null
      : (data[0].description.match(dateReg) &&
          data[0].description.match(dateReg)[0]) ||
        null;

  console.log(`Fecha: ${date}`);

  if (date) {
    date = date
      .toLowerCase()
      .replace("ene", "jan")
      .replace("feb", "feb")
      .replace("mar", "mar")
      .replace("abr", "apr")
      .replace("may", "may")
      .replace("jun", "jun")
      .replace("jul", "jul")
      .replace("ago", "aug")
      .replace("sep", "sep")
      .replace("oct", "oct")
      .replace("nov", "nov")
      .replace("dic", "dec")
      .replace(/[a-zA-Z]{3}/, (x) => x.charAt(0).toUpperCase() + x.slice(1));
  }
  newState.startDate = new Date(
    date
      ? /[a-zA-Z]/.test(date)
        ? moment(date, "DD-MMM-YYYY")
        : moment(date, "DD-MM-YYYY")
      : moment()
  );

  function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
  }

  if (!isValidDate(newState.startDate)) {
    newState.startDate = new Date(moment());
  }

  let firstIVA = str.findIndex((item) =>
    /total iva|\biva|i\.v\.a|![a-z]\s\d\d%/gi.test(item)
  );
  const secondIVA = str.filter((item) =>
    /total iva|\biva|i\.v\.a|![a-z]\s\d\d%/gi.test(item)
  );

  const resultSecondIVA = secondIVA.filter((i) => {
    const a = i
      .split(" ")
      .map((o) => parseFloat(o))
      .filter((o) => !isNaN(o));
    if (a.length) {
      return a.reduce((b, c) => b * c);
    }
    return false;
  });

  const hasSecondIVA =
    resultSecondIVA.length &&
    resultSecondIVA.length > 1 &&
    resultSecondIVA.reduce((a, b) => a !== b);

  console.log("hasSecondIVA", hasSecondIVA);
  const selectedIvas = [];
  const dataIvas = catalogs.ivas.values.map((i) => ({
    ...i,
    value: hasSecondIVA
      ? "0.00"
      : ((price || 0) / (1 + Number(i.IVA) / 100)).toFixed(2),
  }));
  if (firstIVA !== -1 && !hasSecondIVA) {
    if (!str[firstIVA].match(/\d+/g)) {
      firstIVA = firstIVA + 1;
    }

    str[firstIVA].replace("%", "");
    const test = str[firstIVA].split(",");

    if (Number(test[0]) <= 0) {
      firstIVA = str.findIndex((item) => item.includes("%"));
      if (firstIVA !== -1) {
        if (!str[firstIVA].match(/\d+/g)) {
          firstIVA = firstIVA + 1;
        }
      }
    }
    if (str[firstIVA]) {
      if (str[firstIVA].includes("21")) {
        console.log("IVA: 21%");
        selectedIvas.push(dataIvas.find((i) => i.IVA === "21"));
        newState.iva = 3;
      } else if (str[firstIVA].includes("10")) {
        console.log("IVA: 10%");
        selectedIvas.push(dataIvas.find((i) => i.IVA === "10"));
        newState.iva = 2;
      } else if (str[firstIVA].includes("4")) {
        console.log("IVA: 4%");
        selectedIvas.push(dataIvas.find((i) => i.IVA === "4"));
        newState.iva = 1;
      } else {
        console.log("IVA: 0%");
        selectedIvas.push(dataIvas.find((i) => i.IVA === "0"));
        newState.iva = 0;
      }
    } else {
      console.log("IVA: 0%");
      selectedIvas.push(dataIvas.find((i) => i.IVA === "0"));
      newState.iva = 0;
    }
  } else if (hasSecondIVA) {
    resultSecondIVA
      .map((i) => i.replace(/[a-z]|:|\d,\d\d/gi, ""))
      .forEach((i) => {
        if (i.includes("21")) {
          console.log("IVA: 21%");
          selectedIvas.push(dataIvas.find((o) => o.IVA === "21"));
        } else if (i.includes("10")) {
          console.log("IVA: 10%");
          selectedIvas.push(dataIvas.find((o) => o.IVA === "10"));
        } else if (i.includes("4")) {
          console.log("IVA: 4%");
          selectedIvas.push(dataIvas.find((o) => o.IVA === "4"));
        } else {
          console.log("IVA: 0%");
          selectedIvas.push(dataIvas.find((o) => o.IVA === "0"));
        }
      });
  } else {
    console.log("IVA: 0%");
    selectedIvas.push(dataIvas.find((i) => i.IVA === "0"));
    newState.iva = 0;
  }
  newState.selectedIvas = selectedIvas;
  newState.catalogs = { ...catalogs, ivas: { values: dataIvas } };
  return newState;
};

fs.readdir(directoryPath, function (err, files) {
  //handling error
  if (err) {
    return console.log("Unable to scan directory: " + err);
  }
  //listing all files using forEach
  const records = [];
  const results = [];
  fs.createReadStream("GASTOScomprobado.csv")
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      console.log(results);
      files.forEach(function (file) {
        // Do whatever you want to do with the file
        console.log(file);
        let json = require("./facturas75/" + file);
        const dataIvas = catalogs.ivas.values.map((i) => ({
          ...i,
        }));
        if (json.responses[0].textAnnotations) {
          let answer = handleResponseOCR(
            json.responses[0].textAnnotations,
            catalogs
          );
          let record = {};
          let id =
            Number(file.replace(".json", "").replace("facturas", "")) - 2;
          record.ID = id + 2;
          record.FICHERO = results[id].FICHERO;
          record.FECHA = answer.startDate
            ? moment(answer.startDate).format("DD/MM/YYYY") !==
              results[id].FECHA
              ? `Se esperaba ("${results[id].FECHA}") pero se obtuvo ("${moment(
                  answer.startDate
                ).format("DD/MM/YYYY")}")`
              : moment(answer.startDate).format("DD/MM/YYYY")
            : "";
          record.IMPORTE = answer.price
            ? answer.price.toFixed(2) !== String(results[id].IMPORTE)
              ? `Se esperaba ("${String(
                  results[id].IMPORTE
                )}") pero se obtuvo ("${answer.price.toFixed(2)}")`
              : answer.price.toFixed(2)
            : "";
          console.log(results[id]);
          record.TIPOIVA1 = answer.selectedIvas[0]
            ? (answer.selectedIvas[0].IVA === "0"
                ? ""
                : answer.selectedIvas[0].IVA) !== results[id]["TIPO IVA 1"]
              ? `Se esperaba ("${
                  results[id]["TIPO IVA 1"]
                }") pero se obtuvo ("${
                  answer.selectedIvas[0].IVA === "0"
                    ? ""
                    : answer.selectedIvas[0].IVA
                }")`
              : answer.selectedIvas[0].IVA === "0"
              ? ""
              : answer.selectedIvas[0].IVA
            : results[id]["TIPO IVA 1"] === ""
            ? ""
            : `Se esperaba ("${results[id]["TIPO IVA 1"]}") pero se obtuvo ("")`;
          record.TIPOIVA2 = answer.selectedIvas[1]
            ? (answer.selectedIvas[1].IVA === "0"
                ? ""
                : answer.selectedIvas[1].IVA) !== results[id]["TIPO IVA 2"]
              ? `Se esperaba ("${
                  results[id]["TIPO IVA 2"]
                }") pero se obtuvo ("${
                  answer.selectedIvas[1].IVA === "0"
                    ? ""
                    : answer.selectedIvas[1].IVA
                }")`
              : answer.selectedIvas[1].IVA === "0"
              ? ""
              : answer.selectedIvas[1].IVA
            : results[id]["TIPO IVA 2"] === ""
            ? ""
            : `Se esperaba ("${results[id]["TIPO IVA 2"]}") pero se obtuvo ("")`;
          record.TIPOIVA3 = answer.selectedIvas[2]
            ? (answer.selectedIvas[2].IVA === "0"
                ? ""
                : answer.selectedIvas[2].IVA) !== results[id]["TIPO IVA 3"]
              ? `Se esperaba ("${
                  results[id]["TIPO IVA 3"]
                }") pero se obtuvo ("${
                  answer.selectedIvas[2].IVA === "0"
                    ? ""
                    : answer.selectedIvas[2].IVA
                }")`
              : answer.selectedIvas[2].IVA === "0"
              ? ""
              : answer.selectedIvas[2].IVA
            : results[id]["TIPO IVA 3"] === ""
            ? ""
            : `Se esperaba ("${results[id]["TIPO IVA 3"]}") pero se obtuvo ("")`;
          record.NUMTICKET = answer.invoiceNum
            ? answer.invoiceNum !== results[id]["NUM. TICKET"]
              ? `Se esperaba ("${results[id]["NUM. TICKET"]}") pero se obtuvo ("${answer.invoiceNum}")`
              : answer.invoiceNum
            : results[id]["NUM. TICKET"] === ""
            ? ""
            : `Se esperaba ("${results[id]["NUM. TICKET"]}") pero se obtuvo ("")`;
          record.FACTURATICKET =
            (answer.documentTypeSelected === 1 ? "TICKET" : "FACTURA") ===
            results[id]["FACTURA/TICKET"]
              ? answer.documentTypeSelected === 1
                ? "TICKET"
                : "FACTURA"
              : `Se esperaba ("${
                  results[id]["FACTURA/TICKET"]
                }") pero se obtuvo ("${
                  answer.documentTypeSelected === 1 ? "TICKET" : "FACTURA"
                }")`;
          record.CIFPROVEEDOR =
            answer.CIF !== results[id]["CIF PROVEEDOR"]
              ? `Se esperaba ("${results[id]["CIF PROVEEDOR"]}") pero se obtuvo ("${answer.CIF}")`
              : answer.CIF;
          records.push(record);
        }
      });
      csvWriter
        .writeRecords(records) // returns a promise
        .then(() => {
          console.log("...Done");
        });
    });
});
