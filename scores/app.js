"use strict";

const $=id=>document.getElementById(id);

function valueNumber(id){
  const raw=$(id).value;
  if(raw==="")return null;
  const n=Number(raw);
  return Number.isFinite(n)?n:null;
}

function calcNEWS2(){
  const rr=valueNumber("n_rr");
  const sp=valueNumber("n_spo2");
  const temp=valueNumber("n_temp");
  const sbp=valueNumber("n_sbp");
  const hr=valueNumber("n_hr");

  const missing=[];
  if(rr===null)missing.push("FR");
  if(sp===null)missing.push("SpO₂");
  if(temp===null)missing.push("temperatura");
  if(sbp===null)missing.push("PAS");
  if(hr===null)missing.push("FC");

  const out=$("newsResult");
  if(missing.length){
    out.className="result warn";
    out.textContent="Preencha: "+missing.join(", ")+".";
    return;
  }

  let s=0;
  s+=rr<=8?3:rr<=11?1:rr<=20?0:rr<=24?2:3;
  s+=sp<=91?3:sp<=93?2:sp<=95?1:0;
  s+=Number($("n_o2").value);
  s+=temp<=35?3:temp<=36?1:temp<=38?0:temp<=39?1:2;
  s+=sbp<=90?3:sbp<=100?2:sbp<=110?1:sbp<=219?0:3;
  s+=hr<=40?3:hr<=50?1:hr<=90?0:hr<=110?1:hr<=130?2:3;
  s+=Number($("n_con").value);

  out.className="result ok";
  out.innerHTML=`NEWS2 = <strong>${s}</strong>.`;
}

function clearForm(){
  ["n_rr","n_spo2","n_temp","n_sbp","n_hr"].forEach(id=>$(id).value="");
  $("n_o2").value="0";
  $("n_con").value="0";
  const out=$("newsResult");
  out.className="result muted";
  out.textContent="Preencha os parâmetros acima.";
}

$("calcBtn").addEventListener("click",calcNEWS2);
$("clearBtn").addEventListener("click",clearForm);
