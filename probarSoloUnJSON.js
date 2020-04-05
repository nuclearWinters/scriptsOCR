const json = require("./facturas/facturas100.json");

const moment = require("moment");

let compositionData = require("./composition.json");

compositionData = compositionData.data.elements;

const initializeCatalogs = data => {
  let object = {};
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

  const regexCIF = /(?<![\da-zA-Z])\d{2}.?\d{3}.?\d{3}[-\s]?[a-zA-Z](?![\da-zA-Z])|(?<![\da-zA-Z])[KLMXYZ][-\s]?\d{7}[-\s]?[a-zA-Z](?![\da-zA-Z])|(?<![\da-zA-RT-Z])[ABCDEFGHJUV][-\s]?\d{2}.?\d{3}.?\d{2}[-\s]?\d(?![\da-zA-Z])|(?<![\da-zA-RT-Z])[NPQRSW][-\s]?\d{7}[-\s]?[A-J](?![\da-zA-Z])/;

  const CIF = str.find(item => regexCIF.test(item));

  if (CIF) {
    const providerFound = catalogs.providerId.values.find(
      i =>
        i.cif ===
        CIF.match(regexCIF)[0]
          .replace("-", "")
          .replace(/\s+/g, "")
    );
    if (providerFound) {
      newState.providerTypeSelected = providerFound;
    }
  }
  console.log(
    `CIF: ${
      CIF
        ? CIF.match(regexCIF)[0]
            .replace("-", "")
            .replace(/\s+/g, "")
        : undefined
    }`
  );

  const esFactura = str.filter(item => regexCIF.test(item)).length > 1;

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

  const dateReg = /[0-3]\d([./-])([0-1]\d|[a-zA-Z]{3})\1(\d{4}|\d{2})/;

  let date =
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
      .replace(/[a-zA-Z]{3}/, x => x.charAt(0).toUpperCase() + x.slice(1));
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

  let firstIVA = str.findIndex(item =>
    /total iva|\biva|i\.v\.a|![a-z]\s\d\d%/gi.test(item)
  );
  const secondIVA = str.filter(item =>
    /total iva|\biva|i\.v\.a|![a-z]\s\d\d%/gi.test(item)
  );

  const resultSecondIVA = secondIVA.filter(i => {
    const a = i
      .split(" ")
      .map(o => parseFloat(o))
      .filter(o => !isNaN(o));
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
  const dataIvas = catalogs.ivas.values.map(i => ({
    ...i,
    value: hasSecondIVA
      ? "0.00"
      : ((price || 0) / (1 + Number(i.IVA) / 100)).toFixed(2)
  }));
  if (firstIVA !== -1 && !hasSecondIVA) {
    //console.log("str[firstIVA]", str[firstIVA]);
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
  } else if (hasSecondIVA) {
    resultSecondIVA
      .map(i => i.replace(/[a-z]|:|\d,\d\d/gi, ""))
      .forEach(i => {
        if (i.includes("21")) {
          console.log("IVA: 21%");
          selectedIvas.push(dataIvas.find(o => o.IVA === "21"));
        } else if (i.includes("10")) {
          console.log("IVA: 10%");
          selectedIvas.push(dataIvas.find(o => o.IVA === "10"));
        } else if (i.includes("4")) {
          console.log("IVA: 4%");
          selectedIvas.push(dataIvas.find(o => o.IVA === "4"));
        } else {
          console.log("IVA: 0%");
          selectedIvas.push(dataIvas.find(o => o.IVA === "0"));
        }
      });
  } else {
    console.log("IVA: 0%");
    selectedIvas.push(dataIvas.find(i => i.IVA === "0"));
    newState.iva = 0;
  }
  newState.selectedIvas = selectedIvas;
  newState.catalogs = { ...catalogs, ivas: { values: dataIvas } };
  return newState;
};

let answer = handleResponseOCR(json.responses[0].textAnnotations, catalogs);
console.log(answer.selectedIvas);

//console.log(answer);
