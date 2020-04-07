//const dateReg = /(?<![\S])\d{2}([./-\s])(\d{2}|[a-zA-Z]{3})\1\d{2,4}(?!\S)/;
const dateReg = /[0-3]\d([./-])([0-1]\d|[a-zA-Z]{3})\1(\d{4}|\d{2})/;

let fecha1 = "29-10-2019";

//regex = /(?<![aeiou])\w/;

//console.log(fecha1.match(dateReg));

//console.log(/(?<![\d])[a-zA-Z]/.exec("1djbfsldffjsdbsdbg"));

const moment = require("moment");

let date = "02-19-2019";

date = date.replace(
  /[a-zA-Z]{3}/,
  (x) => x.charAt(0).toUpperCase() + x.slice(1)
);

//console.log(moment());

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

//console.log(isValidDate(date));

//console.log(moment().format("DD-MMM-YYYY"));

let cif = " E-16.292.278";

//const regexCIF = /[a-zA-Z]{3}-?\d{8}(?!\d)|[a-zA-Z]-?\d{2}.?\d{3}.?\d{3}(?!\d)|\d{2}.?\d{3}.?\d{3}-?[a-zA-Z](?!\d)/;
//const regexCIF = /(?<![\da-zA-Z])[a-zA-Z][-\s]?\d{2}.?\d{3}.?\d{3}(?![\da-zA-Z])|(?<![\da-zA-Z])\d{2}.?\d{3}.?\d{3}[-\s]?[a-zA-Z](?![\da-zA-Z])/;
//const regexCIF = /[a-zA-Z]{3}[-]?\d{8}(?!\S)|(?<![\da-zA-Z])[a-zA-Z][-\s]?\d{2}.?\d{3}.?\d{3}(?![\da-zA-Z])|(?<![\da-zA-Z])\d{2}.?\d{3}.?\d{3}[-\s]?[a-zA-Z](?![\da-zA-Z])/;

const regexCIF = /(?<![\da-zA-Z])\d{2}.?\d{3}.?\d{3}[-\s]?[a-zA-Z](?![\da-zA-Z])|(?<![\da-zA-Z])[KLMXYZ][-\s]?\d{7}[-\s]?[a-zA-Z](?![\da-zA-Z])|(?<![\da-zA-RT-Z])[ABCDEFGHJUV][-\s]?\d{2}.?\d{3}.?\d{2}[-\s]?\d(?![\da-zA-Z])|(?<![\da-zA-RT-Z])[NPQRSW][-\s]?\d{7}[-\s]?[A-J](?![\da-zA-Z])/;

//let DNI = /(?<![\da-zA-Z])\d{2}.?\d{3}.?\d{3}[-\s]?[a-zA-Z](?![\da-zA-Z])/;
//let NIFKLMXYZ = /(?<![\da-zA-Z])[KLMXYZ][-\s]?\d{7}[-\s]?[a-zA-Z](?![\da-zA-Z])/;
let NIFNumero = /(?<![\da-zA-RT-Z])[ABCDEFGHJUV][-\s]?\d{2}.?\d{3}.?\d{2}[-\s]?\d(?![\da-zA-Z])/;
//let NIFLetra = /(?<![\da-zA-RT-Z])[NPQRSW][-\s]?\d{7}[-\s]?[A-J](?![\da-zA-Z])/;

//console.log(regexCIF.test(cif));

//console.log(cif.match(regexCIF)[0]);

let hasIVA = /\d([./-])([0-1]?\d|[a-zA-Z]{3})\1(\d{4}|\d{2})/.test(
  "6/02/20 16:23 Caja:"
);

console.log(hasIVA);
