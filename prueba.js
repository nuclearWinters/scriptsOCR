let json = require("./json.json");

let res = json.responses[0].textAnnotations;

//console.log(res[0].description);

let str = res[0].description.split("\n");

//console.log(str);

let regexEmpiezaLetra = /[a-zA-Z]\d{8}/;
let regexTerminaLetra = /\d{8}[a-zA-Z]/;

/*let cifEmpiezaConLetra = res[0].description.match(regexEmpiezaLetra);
let cifTerminaConLetra = res[0].description.match(regexTerminaLetra);

console.log(cifEmpiezaConLetra);
console.log(cifTerminaConLetra);*/

let indexTextoConPalabraCIF = str.findIndex(
  item =>
    item.toLowerCase().includes("cif") || item.toLowerCase().includes("c.i.f.")
);

//console.log(indexTextoConPalabraCIF);

if (indexTextoConPalabraCIF === -1) {
  let firstCIF = str.find(item => {
    item = item
      .replace("CIF", "")
      .replace(/-/g, "")
      .replace(/\s+/g, "");
    return (
      (item.match(regexEmpiezaLetra) !== null
        ? item.match(regexEmpiezaLetra)[0]
        : false) ||
      (item.match(regexTerminaLetra) !== null
        ? item.match(regexTerminaLetra)[0]
        : false)
    );
  });
  firstCIF = firstCIF
    .replace("CIF", "")
    .replace(/-/g, "")
    .replace(/\s+/g, "");
  if (firstCIF === -1) {
    console.log("CIF: NaN");
  } else {
    console.log(
      "CIF: " +
        (firstCIF.match(regexEmpiezaLetra) !== null
          ? firstCIF.match(regexEmpiezaLetra)[0]
          : firstCIF.match(regexTerminaLetra)[0])
    );
  }
} else {
  let strOrdenadoConIndexConPalabraCIF = str
    .map((item, index) => ({
      description: item,
      index: Math.abs(index - indexTextoConPalabraCIF)
    }))
    .sort((a, b) => a.index - b.index)
    .map(item => item.description);
  let firstCIF = strOrdenadoConIndexConPalabraCIF.find(item => {
    item = item
      .replace("CIF", "")
      .replace(/-/g, "")
      .replace(/\s+/g, "");
    return (
      (item.match(regexEmpiezaLetra) !== null
        ? item.match(regexEmpiezaLetra)[0]
        : false) ||
      (item.match(regexTerminaLetra) !== null
        ? item.match(regexTerminaLetra)[0]
        : false)
    );
  });
  firstCIF = firstCIF
    .replace("CIF", "")
    .replace(/-/g, "")
    .replace(/\s+/g, "");
  if (firstCIF === -1) {
    console.log("CIF: NaN");
  } else {
    console.log(
      "CIF: " +
        (firstCIF.match(regexEmpiezaLetra) !== null
          ? firstCIF.match(regexEmpiezaLetra)[0]
          : firstCIF.match(regexTerminaLetra)[0])
    );
  }
}

//CIF
/*let firstCIF = str.find(
  item =>
    (item
      .replace("CIF", "")
      .replace(/-/g, "")
      .replace(/\s+/g, "")
      .match(regexEmpiezaLetra) !== null
      ? item
          .replace("CIF", "")
          .replace(/-/g, "")
          .replace(/\s+/g, "")
          .match(regexEmpiezaLetra)[0]
      : false) ||
    (item
      .replace("CIF", "")
      .replace(/-/g, "")
      .replace(/\s+/g, "")
      .match(regexTerminaLetra) !== null
      ? item
          .replace("CIF", "")
          .replace(/-/g, "")
          .replace(/\s+/g, "")
          .match(regexTerminaLetra)[0]
      : false)
);

console.log("firstCIF", firstCIF);

if (firstCIF !== -1) {
  console.log(
    "CIF: " +
      firstCIF
        .replace("CIF", "")
        .replace(/-/g, "")
        .replace(/\s+/g, "")
  );
} else {
  console.log("CIF: NaN");
}*/

//let esFactura = str.find(item => item.toLowerCase().includes("factura"));
/*let string = "CIF-E-27034602".replace(/[a-zA-Z]{2,}/g, " ").replace(/-/g, " ");
console.log(string);
*/

let esFactura = str.filter(item => {
  item = item
    .replace(/-/g, " ")
    .replace(/[a-zA-Z]{2,}/g, " ")
    .replace(/\s+/g, "");
  if (
    (item.match(regexEmpiezaLetra) !== null
      ? item.match(regexEmpiezaLetra)[0]
      : false) ||
    (item.match(regexTerminaLetra) !== null
      ? item.match(regexTerminaLetra)[0]
      : false)
  ) {
    console.log(item);
  }
  return (
    (item.match(regexEmpiezaLetra) !== null
      ? item.match(regexEmpiezaLetra)[0]
      : false) ||
    (item.match(regexTerminaLetra) !== null
      ? item.match(regexTerminaLetra)[0]
      : false)
  );
});

console.log("Facturas", esFactura);

if (esFactura.length > 1) {
  console.log("Es factura: true");
} else {
  console.log("Es factura: false");
}

/*let textosCenter = res.map((item, index) => ({
  ...item,
  index,
  center: item.boundingPoly.vertices.reduce(
    (prev, curr, i) => {
      curr.x += prev.x;
      curr.y += prev.y;
      return curr;
    },
    { x: 0, y: 0 }
  )
}));*/

/*

/*let totalText = textosCenter.filter(
  item =>
    item.description.toLowerCase().includes("total") &&
    item.locale === undefined
);

let facturaText = textosCenter.filter(
  item =>
    item.description.toLowerCase().includes("factura") &&
    item.locale === undefined
);

//console.log(totalText);
//
//console.log(facturaText);

let arrayDistances = [];
for (totalTextUnit in totalText) {
  for (facturaTextUnit in facturaText) {
    arrayDistances.push({
      distance: Math.sqrt(
        Math.pow(
          facturaText[facturaTextUnit].center.x -
            totalText[totalTextUnit].center.x,
          2
        ) +
          Math.pow(
            facturaText[facturaTextUnit].center.y -
              totalText[totalTextUnit].center.y,
            2
          )
      ),
      indexFactura: facturaText[facturaTextUnit].index,
      indexTotal: totalText[totalTextUnit].index
    });
  }
}

arrayDistances = arrayDistances.sort((a, b) => a.distance - b.distance);

let centerTotalFactura = {
  x:
    (textosCenter[arrayDistances[0].indexFactura].center.x +
      textosCenter[arrayDistances[0].indexTotal].center.x) /
    2,
  y:
    (textosCenter[arrayDistances[0].indexFactura].center.y +
      textosCenter[arrayDistances[0].indexTotal].center.y) /
    2
};

let horizontalAling = textosCenter
  .filter(item =>
    item.index === arrayDistances[0].indexFactura
      ? false
      : item.index === arrayDistances[0].indexTotal
      ? false
      : true
  )
  .map(item => ({
    ...item,
    align: Math.abs(item.center.y - centerTotalFactura.y)
  }));

horizontalAling = horizontalAling.sort((a, b) => a.align - b.align);

while (!horizontalAling[0].description.match(/\d+/g)) {
  horizontalAling.shift();
}

//horizontalAling.map(item => console.log(item));

let totalPrice = "";

for (horizontalAlingUnit in horizontalAling) {
  if (horizontalAlingUnit === "0") {
    totalPrice = totalPrice + horizontalAling[horizontalAlingUnit].description;
  } else if (
    Math.pow(
      horizontalAling[Number(horizontalAlingUnit)].align -
        horizontalAling[Number(horizontalAlingUnit) - 1].align,
      2
    ) < 25
  ) {
    totalPrice = totalPrice + horizontalAling[horizontalAlingUnit].description;
  } else {
    break;
  }
}

console.log("total", totalPrice.replace(",", ".").replace(/[^\d.-]/g, ""));*/

/*let distances = textosCenter.map(item => ({
  ...item,
  distance: Math.sqrt(
    Math.pow(item.center.x - factura.center.x, 2) +
      Math.pow(item.center.y - factura.center.y, 2)
  )
}));

//console.log(distances);

let distanceFirst = distances.sort((a, b) => a.distance - b.distance);

console.log(distanceFirst[2]);*/

//let str = res[0].description.split("\n");

let totales = str.filter(
  item =>
    (item.includes(".") ||
      item.includes(",") ||
      item.includes("€") ||
      item.includes("*")) &&
    !isNaN(
      item
        .replace(",", ".")
        .replace("€", "")
        .replace("*", "")
        .replace(/\s+/g, "")
    )
);

//console.log(totales);

console.log(
  "Total: " +
    totales
      .map(item =>
        Number(
          item
            .replace(",", ".")
            .replace("€", "")
            .replace("*", "")
            .replace(/\s+/g, "")
        )
      )
      .sort((a, b) => b - a)[0]
);

//console.log(str);

let noFacturaIndex = str.findIndex(
  item =>
    item.toLowerCase().includes("n°") ||
    item.toLowerCase().includes("nº") ||
    item.toLowerCase().includes("número") ||
    item.toLowerCase().includes("numero") ||
    item.toLowerCase().includes("#")
);

//console.log(noFacturaIndex);

//console.log(str[noFacturaIndex]);
if (noFacturaIndex === -1) {
  console.log("Invoice Num: NaN");
} else {
  //Invoice Num
  console.log(
    "Invoice Num: " +
      (str[noFacturaIndex]
        .replace("Factura", "")
        .replace("FACTURA", "")
        .replace("factura", "")
        .replace("n°", "")
        .replace("N°", "")
        .replace("Nº", "")
        .replace("nº", "")
        .replace("numero", "")
        .replace("número", "")
        .replace("Numero", "")
        .replace("Número", "")
        .replace("NUMERO", "")
        .replace("NÚMERO", "")
        .replace(":", "")
        .replace(/\./g, "")
        .replace(/\s+/g, "")
        .replace("#", "").length > 4
        ? str[noFacturaIndex]
            .replace("Factura", "")
            .replace("FACTURA", "")
            .replace("factura", "")
            .replace("n°", "")
            .replace("N°", "")
            .replace("Nº", "")
            .replace("nº", "")
            .replace("numero", "")
            .replace("número", "")
            .replace("Numero", "")
            .replace("Número", "")
            .replace("NUMERO", "")
            .replace("NÚMERO", "")
            .replace(":", "")
            .replace(/\./g, "")
            .replace(/\s+/g, "")
            .replace("#", "")
        : str[noFacturaIndex + 1])
  );
}

//let total = str.find(
//  item => item.toLowerCase().includes("€") && item.match(/\d+/g)
//);

//Total
//console.log("Total: " + total.replace(",", ".").replace(/[^\d.-]/g, ""));

let fechaIndex = str.findIndex(item => item.toLowerCase().includes("fecha"));
let dateReg = /\d{2}([./-])\d{2}\1\d{2,4}/;

//console.log(fechaIndex);

if (fechaIndex === -1) {
  console.log(
    "Fecha: " +
      (res[0].description.match(dateReg) === null
        ? "NaN"
        : res[0].description.match(dateReg)[0])
  );
} else {
  //Fecha
  let formatoFechas = str
    .map((item, index) => ({
      description: item,
      index: Math.abs(index - fechaIndex)
    }))
    .filter(item => item.description.match(dateReg))
    .sort((a, b) => a.index - b.index);
  console.log("Fecha: " + formatoFechas[0].description.match(dateReg)[0]);
}

let firstIVA = str.findIndex(item => item.includes("%"));

console.log(str[firstIVA]);

if (!str[firstIVA].match(/\d+/g)) {
  firstIVA = firstIVA + 1;
}

if (str[firstIVA]) {
  if (str[firstIVA].includes("4")) {
    console.log("IVA: 4%");
  } else if (str[firstIVA].includes("10")) {
    console.log("IVA: 10%");
  } else if (str[firstIVA].includes("21")) {
    console.log("IVA: 21%");
  } else {
    console.log("IVA: 0%");
  }
} else {
  console.log("IVA: 0%");
}
