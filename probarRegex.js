const dateReg = /\d{2}([./-\s])(\d{2}|[a-zA-Z]{3})([./-\s])\d{2,4}/;

let fecha1 = "227 jun/19";

console.log(fecha1.match(dateReg));
