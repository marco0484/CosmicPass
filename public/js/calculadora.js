const ticketAmount = document.getElementById("ticketAmount");
const ticketQty = document.getElementById("ticketQty");
const feeMethod = document.getElementById("feeMethod");
const totalSold = document.getElementById("totalSold");
const realFee = document.getElementById("realFee");
const realNet = document.getElementById("realNet");
const suggestedPrice = document.getElementById("suggestedPrice");
const bestOption = document.getElementById("bestOption");
const differenceText = document.getElementById("differenceText");

const FEES = {
  mpCardInstant:{name:"Mercado Pago tarjeta - al instante",percent:0.0349,fixed:4.64},
  mpCard7:{name:"Mercado Pago tarjeta - 7 días",percent:0.0319,fixed:4.64},
  mpCard30:{name:"Mercado Pago tarjeta - 30 días",percent:0.0295,fixed:4.64},
  mpCash:{name:"Mercado Pago Oxxo / efectivo",percent:0.0379,fixed:4.64},
  stripe:{name:"Stripe tarjeta nacional",percent:0.036,fixed:3}
};

function money(value){
  return Number(value || 0).toLocaleString("es-MX",{
    style:"currency",
    currency:"MXN",
    minimumFractionDigits:2
  });
}

function calcularComisiones(){
  if(!ticketAmount || !ticketQty || !feeMethod) return;

  const precio = Number(ticketAmount.value || 0);
  const cantidad = Number(ticketQty.value || 1);
  const fee = FEES[feeMethod.value];

  if(precio <= 0 || cantidad <= 0){
    totalSold.textContent = "$0.00";
    realFee.textContent = "$0.00";
    realNet.textContent = "$0.00";
    suggestedPrice.textContent = "$0.00";
    bestOption.textContent = "Ingresa un precio para calcular";
    differenceText.textContent = "Usamos tarifas públicas de Mercado Pago y Stripe. Los montos son estimados.";
    return;
  }

  const ventaTotal = precio * cantidad;
  const comisionTotal = ((precio * fee.percent) + fee.fixed) * cantidad;
  const neto = ventaTotal - comisionTotal;
  const precioAbsorbido = (precio + fee.fixed) / (1 - fee.percent);

  totalSold.textContent = money(ventaTotal);
  realFee.textContent = money(comisionTotal);
  realNet.textContent = money(neto);
  suggestedPrice.textContent = `${money(precioAbsorbido)} c/u`;

  bestOption.textContent = `Con ${fee.name}, recibirías aprox. ${money(neto)}`;
  differenceText.textContent = `Si quieres absorber la comisión, publica el boleto en aprox. ${money(precioAbsorbido)} por boleto.`;
}

[ticketAmount,ticketQty,feeMethod].forEach(input=>{
  if(!input) return;
  input.addEventListener("input",calcularComisiones);
  input.addEventListener("change",calcularComisiones);
});

calcularComisiones();