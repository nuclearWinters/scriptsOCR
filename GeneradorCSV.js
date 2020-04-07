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

  const regexCIF = /\d{2}.?\d{3}.?\d{3}[-\s]?[a-zA-Z](?![\da-zA-Z])|[KLMXYZ][-\s]?\d{7}[-\s]?[a-zA-Z](?![\da-zA-Z])|[ABCDEFGHJUV8][-\s]?\d{2}.?\d{3}.?\d{2}[-\s]?\d(?![\da-zA-Z])|[NPQRSW][-\s]?\d{7}[-\s]?[A-J](?![\da-zA-Z])/;

  const CIF = str.find((item) => regexCIF.test(item));

  //Not in RN Code
  let newStateCIF = CIF
    ? CIF.match(regexCIF)[0].replace("-", "").replace(/\s+/g, "")
    : "";

  if (newStateCIF.slice(0, 1) === "8") {
    newStateCIF = newStateCIF.replace("8", "B");
  }

  if (CIF) {
    const providerFound = catalogs.providerId.values.find(
      (i) => i.cif === newStateCIF
    );
    if (providerFound) {
      newState.providerTypeSelected = providerFound;
    }
  }

  //console.log("CIF: ", newStateCIF);

  newState.CIF = newStateCIF;

  newState.arrayCIF = str
    .filter((item) => regexCIF.test(item))
    .map((item) => {
      let itemReturned = item
        .match(regexCIF)[0]
        .replace("-", "")
        .replace(/\s+/g, "");
      if (itemReturned.slice(0, 1) === "8") {
        itemReturned = itemReturned.replace("8", "B");
      }
      return itemReturned;
    });

  const esFactura = str.filter((item) => regexCIF.test(item)).length > 1;

  //console.log(`Es factura: ${esFactura}`);

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

  //console.log(`Total : ${price || 0}`);
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

  //console.log(`Invoice Num: ${invoiceNum}`);
  newState.invoiceNum = invoiceNum;

  const fechaIndex = str.findIndex((item) =>
    item.toLowerCase().includes("fecha")
  );

  const dateReg1 = /[0-3]\d([./-])([0-1]?\d|[a-zA-Z]{3})\1(\d{4}|\d{2})/;
  const dateReg2 = /\d([./-])([0-1]?\d|[a-zA-Z]{3})\1(\d{4}|\d{2})/;

  let date;

  if (fechaIndex !== -1) {
    let listWithIndex = str
      .map((item, index) => ({
        description: item,
        index: Math.abs(index - fechaIndex),
      }))
      .sort((a, b) => a.index - b.index);
    let filteredListWithIndex = listWithIndex.filter((item) =>
      dateReg1.test(item.description)
    );
    if (filteredListWithIndex.length === 0) {
      filteredListWithIndex = listWithIndex.filter((item) =>
        dateReg2.test(item.description)
      );
      if (filteredListWithIndex.length === 0) {
        date = null;
      } else {
        date = filteredListWithIndex[0].description.match(dateReg2)[0];
      }
    } else {
      date = filteredListWithIndex[0].description.match(dateReg1)[0];
    }
  } else {
    let dateReg1Founded = dateReg1.test(data[0].description);
    let dateReg2Founded = dateReg2.test(data[0].description);
    if (dateReg1Founded) {
      date = data[0].description.match(dateReg1)[0];
    } else if (dateReg2Founded) {
      date = data[0].description.match(dateReg2)[0];
    } else {
      date = null;
    }
  }

  //console.log(`Fecha: ${date}`);

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

  let listIVAS = str.filter((item) => /(4|10|21).?%/.test(item));
  let has4IVA = listIVAS.find((item) => /4.?%/.test(item)) ? true : false;
  let has10IVA = listIVAS.find((item) => /10.?%/.test(item)) ? true : false;
  let has21IVA = listIVAS.find((item) => /21.?%/.test(item)) ? true : false;
  let listTrueIVAS = [has21IVA, has10IVA, has4IVA];
  let lengthTRUE = listTrueIVAS.filter((item) => item === true).length;

  if (lengthTRUE === 0) {
    listIVAS = str.filter((item) => /(4|10|21)[,.].{1,3}%/.test(item));
    has4IVA = listIVAS.find((item) => /4[,.].{1,3}%/.test(item)) ? true : false;
    has10IVA = listIVAS.find((item) => /10[,.].{1,3}%/.test(item))
      ? true
      : false;
    has21IVA = listIVAS.find((item) => /21[,.].{1,3}%/.test(item))
      ? true
      : false;
    listTrueIVAS = [has21IVA, has10IVA, has4IVA];
    lengthTRUE = listTrueIVAS.filter((item) => item === true).length;
    if (lengthTRUE === 0) {
      listIVAS = str.filter((item) =>
        /(?:^|\s)((4|10|21)[,.]0{2,2})(?=\s|$)/.test(item)
      );
      has4IVA = listIVAS.find((item) =>
        /(?:^|\s)(4[,.]0{2,2})(?=\s|$)/.test(item)
      )
        ? true
        : false;
      has10IVA = listIVAS.find((item) =>
        /(?:^|\s)(10[,.]0{2,2})(?=\s|$)/.test(item)
      )
        ? true
        : false;
      has21IVA = listIVAS.find((item) =>
        /(?:^|\s)(21[,.]0{2,2})(?=\s|$)/.test(item)
      )
        ? true
        : false;
      listTrueIVAS = [has21IVA, has10IVA, has4IVA];
      lengthTRUE = listTrueIVAS.filter((item) => item === true).length;
      if (lengthTRUE === 0) {
        listIVAS = str.filter((item) => /(4|10|21)[,.]0{2,2}/.test(item));
        has4IVA = listIVAS.find((item) => /4[,.]0{2,2}/.test(item))
          ? true
          : false;
        has10IVA = listIVAS.find((item) => /10[,.]0{2,2}/.test(item))
          ? true
          : false;
        has21IVA = listIVAS.find((item) => /21[,.]0{2,2}/.test(item))
          ? true
          : false;
        listTrueIVAS = [has21IVA, has10IVA, has4IVA];
        lengthTRUE = listTrueIVAS.filter((item) => item === true).length;
        if (lengthTRUE === 0) {
          listIVAS = str.filter((item) =>
            /(?:^|\s)(21|10|4)(?=\s|$)/.test(item)
          );
          has10IVA = listIVAS.find((item) => /(?:^|\s)(10)(?=\s|$)/.test(item))
            ? true
            : false;
          has21IVA = listIVAS.find((item) => /(?:^|\s)(21)(?=\s|$)/.test(item))
            ? true
            : false;
          listTrueIVAS = [has21IVA, has10IVA, has4IVA];
          lengthTRUE = listTrueIVAS.filter((item) => item === true).length;
        }
      }
    }
  }

  const selectedIvas = [];
  const dataIvas = catalogs.ivas.values.map((i) => ({
    ...i,
  }));
  if (lengthTRUE >= 1) {
    if (has21IVA) {
      selectedIvas.push(dataIvas.find((i) => i.IVA === "21"));
      newState.iva = 3;
    }
    if (has10IVA) {
      selectedIvas.push(dataIvas.find((i) => i.IVA === "10"));
      newState.iva = 2;
    }
    if (has4IVA) {
      selectedIvas.push(dataIvas.find((i) => i.IVA === "4"));
      newState.iva = 1;
    }
  } else {
    selectedIvas.push(dataIvas.find((i) => i.IVA === "0"));
    newState.iva = 0;
  }

  newState.selectedIvas = selectedIvas;
  newState.catalogs = { ...catalogs, ivas: { values: dataIvas } };
  return newState;
};

fs.readdir(directoryPath, function (err, files) {
  if (err) {
    return console.log("Unable to scan directory: " + err);
  }
  const records = [];
  const results = [];
  fs.createReadStream("GASTOScomprobado.csv")
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      files.forEach(function (file) {
        console.log(file);
        let json = require("./facturas75/" + file);
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
          /*console.log(answer.arrayCIF);
          console.log(results[id]["CIF PROVEEDOR"]);
          let hasCIF =
            results[id]["CIF PROVEEDOR"] !== ""
              ? answer.arrayCIF.find(
                  (item) => item == results[id]["CIF PROVEEDOR"]
                )
              : true;*/
          record.CIFPROVEEDOR =
            /*hasCIF
            ? results[id]["CIF PROVEEDOR"]
            : `Se esperaba ("${results[id]["CIF PROVEEDOR"]}") pero se obtuvo ("${answer.CIF}")`;*/
            answer.CIF !== results[id]["CIF PROVEEDOR"]
              ? `Se esperaba ("${results[id]["CIF PROVEEDOR"]}") pero se obtuvo ("${answer.CIF}")`
              : answer.CIF;
          records.push(record);
        }
      });
      csvWriter.writeRecords(records).then(() => {
        console.log("...Done");
      });
    });
});
