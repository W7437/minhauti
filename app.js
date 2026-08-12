"use strict";
const form=document.getElementById("form");
const labs=[
  ["hb","Hemoglobina","g/dL"],["wbc","Leucócitos","/mm³"],["platelets","Plaquetas","/mm³"],
  ["sodium","Sódio","mEq/L"],["potassium","Potássio","mEq/L"],["magnesium","Magnésio","mg/dL"],
  ["phosphorus","Fósforo","mg/dL"],["ionized_calcium","Ca ionizado","mmol/L"],
  ["bilirubin","Bilirrubina","mg/dL"],["inr","INR",""]
];
let currentBed=1;
let beds={};


function setup(){
  document.getElementById("bedList").innerHTML=Array.from({length:10},(_,i)=>`
    <button type="button" class="bed-btn" id="bedBtn${i+1}" onclick="switchBed(${i+1})">
      <span class="bed-dot"></span><span>Leito ${i+1}</span>
    </button>`).join("");

  document.getElementById("labTable").innerHTML=
    `<div></div><div class="lab-head">Atual</div>`+
    labs.map(([k,n,u])=>`
      <div class="lab-label">${n}<small>${u}</small></div>
      <input name="${k}_now" type="number" step="any">`).join("");

  document.querySelectorAll(".subtabs button").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".subtabs button").forEach(x=>x.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-"+btn.dataset.panel).classList.add("active");
    });
  });

  form.addEventListener("input",()=>{
    updateDvaPreview();
    updateRenalPreview();
    updateGlyTempSummary();
    updatePhysicalExamSuggestion();
    assessPTEV();
    assessABG();
    assessCVG();
  });
  document.getElementById("dvaEnabled").addEventListener("change",updateDvaVisibility);
  document.getElementById("abgCollected").addEventListener("change",updateGasVisibility);
  document.getElementById("cvgCollected").addEventListener("change",updateGasVisibility);
  form.addEventListener("change",()=>{assessPTEV();assessABG();assessCVG();});
  form.addEventListener("change",updatePhysicalExamSuggestion);
  document.getElementById("tempStatus").addEventListener("change",updateGlyTempSummary);
  const tempSeriesEl=document.getElementById("tempSeries");
  if(tempSeriesEl)tempSeriesEl.addEventListener("input",updateGlyTempSummary);
  document.getElementById("hgtSeries").addEventListener("input",updateGlyTempSummary);

  const nursingAuxEl=document.getElementById("nursingAuxText");
  if(nursingAuxEl){
    let nursingExtractTimer=null;
    nursingAuxEl.addEventListener("input",()=>{
      clearTimeout(nursingExtractTimer);
      nursingExtractTimer=setTimeout(()=>extractNursingData({auto:true}),250);
    });
  }
  loadLocal();
  switchBed(1,false);
  updatePhysicalExamSuggestion();
}

function num(data,key){
  const v=data[key];
  return v===null||v===undefined||v===""?null:Number(v);
}


function getData(){
  const d={};
  new FormData(form).forEach((v,k)=>d[k]=v);
  form.querySelectorAll('input[type="checkbox"]').forEach(x=>d[x.name]=x.checked);
  form.querySelectorAll('input[type="number"]').forEach(x=>d[x.name]=x.value===""?null:Number(x.value));
  
  
  d.generated_evolution=document.getElementById("evolutionText").value;
  return d;
}

function fill(data={}){
  form.reset();
  form.elements.urine_hours.value=24;
  for(const [k,v] of Object.entries(data)){
    const el=form.elements[k];
    if(!el||k.endsWith("_measurements"))continue;
    if(el.type==="checkbox")el.checked=!!v;
    else el.value=v??"";
  }
  document.getElementById("evolutionText").value=data.generated_evolution||"";
  updateDvaPreview();
  updateRenalPreview();
  updateGlyTempSummary();
  updateDvaVisibility();
  updatePhysicalExamSuggestion();
  updateGasVisibility();
  assessPTEV();
}

function loadLocal(){
  try{
    const current=localStorage.getItem("uti_portatil_v7");
    const legacy=localStorage.getItem("uti_portatil_v3");
    beds=JSON.parse(current||legacy||"{}")||{};
    if(!current&&legacy)localStorage.setItem("uti_portatil_v7",JSON.stringify(beds));
  }catch{
    beds={};
  }
}

function saveCurrent(show=true){
  beds[currentBed]=getData();
  localStorage.setItem("uti_portatil_v7",JSON.stringify(beds));
  updateSidebarLabels();
  if(show)alert(`Leito ${currentBed} salvo.`);
}

function switchBed(bed,saveBefore=true){
  try{
    if(saveBefore&&currentBed)saveCurrent(false);
    currentBed=bed;

    document.querySelectorAll(".bed-btn").forEach(x=>x.classList.remove("active"));
    const button=document.getElementById("bedBtn"+bed);
    if(button)button.classList.add("active");

    const label=document.getElementById("currentBedLabel");
    if(label)label.textContent="Leito "+bed;

    fill(beds[bed]||{});
    closeScores();
    window.scrollTo({top:0,behavior:"smooth"});
  }catch(err){
    console.error("Erro ao trocar de leito:",err);
    alert("Houve um erro ao carregar o leito. Os demais leitos continuam disponíveis.");
  }
}

function updateSidebarLabels(){
  for(let i=1;i<=10;i++){
    const btn=document.getElementById("bedBtn"+i);
    if(!btn)continue;
    btn.querySelector("span:last-child").textContent=`Leito ${i}`;
  }
}

function clearBed(){
  if(!confirm(`Limpar todos os dados do leito ${currentBed}?`))return;
  beds[currentBed]={};
  localStorage.setItem("uti_portatil_v7",JSON.stringify(beds));
  fill({});
  updateSidebarLabels();
}

function exportData(){
  saveCurrent(false);
  const blob=new Blob([JSON.stringify({version:3,beds},null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="assistente_uti_dados.json";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function importData(ev){
  const f=ev.target.files[0];
  if(!f)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const obj=JSON.parse(reader.result);
      beds=obj.beds||obj;
      localStorage.setItem("uti_portatil_v7",JSON.stringify(beds));
      updateSidebarLabels();
      switchBed(1,false);
      alert("Dados importados.");
    }catch{alert("Arquivo inválido.");}
  };
  reader.readAsText(f);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}




function parseHgtSeries(raw){
  if(raw===null||raw===undefined)return [];
  const text=String(raw).trim();
  if(!text)return [];

  // Accepts: 116-120-130-140, 116 / 120 / 130, 116;120;130, or spaces.
  const matches=text.match(/\d+(?:[.,]\d+)?/g)||[];
  return matches
    .map(x=>Number(x.replace(",",".")))
    .filter(x=>Number.isFinite(x) && x>0);
}

function summarizeHgt(data=getData()){
  const values=parseHgtSeries(data.hgt_series);
  if(!values.length)return {text:"",values};

  const highs=values.filter(v=>v>=180);
  const lows=values.filter(v=>v<70);

  if(highs.length>=2)return {text:"múltiplos picos de hiperglicemia",values};
  if(lows.length>=2)return {text:"hipoglicemia persistente",values};
  if(highs.length===1)return {text:"pico isolado de hiperglicemia",values};
  if(lows.length===1)return {text:"episódio isolado de hipoglicemia",values};
  return {text:"sem disglicemias",values};
}

function parseTempSeries(raw){
  if(raw===null||raw===undefined)return [];
  const matches=String(raw).match(/\d+(?:[.,]\d+)?/g)||[];
  return matches
    .map(x=>Number(x.replace(",",".")))
    .filter(x=>Number.isFinite(x)&&x>=25&&x<=45);
}

function summarizeTemperature(data=getData()){
  const values=parseTempSeries(data.temp_series);

  if(values.length){
    const min=Math.min(...values);
    const max=Math.max(...values);
    const parts=[];

    if(min<35)parts.push(`apresentou hipotermia de ${min.toFixed(1).replace(".",",")}°C`);
    if(max>=38)parts.push(`apresentou febre de ${max.toFixed(1).replace(".",",")}°C`);

    return {
      text:parts.length?parts.join(" e "):"sem distermias",
      values
    };
  }

  if(data.temp_status==="afebrile")return {text:"sem distermias",values:[]};

  if(data.temp_status==="fever"){
    const temp=num(data,"fever_temp");
    const time=data.fever_time||"";
    if(temp!==null){
      let text=`apresentou febre de ${temp.toFixed(1).replace(".",",")}°C`;
      if(time)text+=` às ${time}`;
      return {text,values:[temp]};
    }
    return {text:"apresentou febre",values:[]};
  }

  return {text:"",values:[]};
}

function updateGlyTempSummary(){
  const data=getData();

  const hgt=summarizeHgt(data);
  const hgtBox=document.getElementById("hgtSummary");
  if(hgtBox){
    hgtBox.className="result "+(hgt.text&&hgt.text!=="sem disglicemias"?"warn":"muted");
    hgtBox.textContent=hgt.text
      ? `${hgt.text.charAt(0).toUpperCase()+hgt.text.slice(1)}. Valores: ${hgt.values.join(" - ")}.`
      : "Nenhum HGT informado.";
  }

  const temp=summarizeTemperature(data);
  const tempBox=document.getElementById("tempSummary");
  if(tempBox){
    tempBox.className="result "+(temp.text&&temp.text!=="sem distermias"?"warn":"muted");
    if(temp.text){
      let text=temp.text.charAt(0).toUpperCase()+temp.text.slice(1)+".";
      if(Array.isArray(temp.values)&&temp.values.length){
        text+=` Valores: ${temp.values.map(v=>v.toFixed(1).replace(".",",")).join(" - ")} °C.`;
      }
      tempBox.textContent=text;
    }else{
      tempBox.textContent="Nenhuma informação de temperatura.";
    }
  }

  const fields=document.getElementById("feverFields");
  if(fields)fields.classList.toggle("hidden",data.temp_status!=="fever");
}

function temperatureEvolutionNarrative(data=getData()){
  const values=parseTempSeries(data.temp_series);

  if(values.length){
    const min=Math.min(...values);
    const max=Math.max(...values);

    // Na EG, não narrar hipotermia.
    if(max>=38){
      return `apresentou febre de ${max.toFixed(1).replace(".",",")}°C`;
    }

    // Só afirmar "sem distermias" quando não houve hipotermia.
    if(min>=35)return "sem distermias";

    return "";
  }

  if(data.temp_status==="afebrile")return "sem distermias";

  if(data.temp_status==="fever"){
    const temp=num(data,"fever_temp");
    const time=data.fever_time||"";
    if(temp!==null){
      let text=`apresentou febre de ${temp.toFixed(1).replace(".",",")}°C`;
      if(time)text+=` às ${time}`;
      return text;
    }
    return "apresentou febre";
  }

  return "";
}

function glyTempNarrative(data=getData()){
  const temp=temperatureEvolutionNarrative(data);
  const hgt=summarizeHgt(data).text;
  const parts=[];
  if(temp)parts.push(temp.charAt(0).toUpperCase()+temp.slice(1));
  if(hgt)parts.push(hgt.charAt(0).toUpperCase()+hgt.slice(1));
  return parts.length?parts.join(". ")+".":"";
}



function parseAuxiliarNursingText(raw){
  const text=String(raw||"")
    .replace(/\r/g,"")
    .replace(/[–—]/g,"-");

  const result={hgt:[],temp:[],du:null,bh:null};

  const hgtLine=text.match(/(?:^|\n)\s*HGT\s+([^\n]+)/i);
  if(hgtLine){
    result.hgt=(hgtLine[1].match(/\d+(?:[.,]\d+)?/g)||[])
      .map(x=>Number(x.replace(",",".")))
      .filter(x=>Number.isFinite(x)&&x>0&&x<=1000);
  }

  const tempMatch=text.match(/(?:^|\n)\s*T\s+(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?/i);
  if(tempMatch){
    result.temp=[tempMatch[1],tempMatch[2]]
      .filter(Boolean)
      .map(x=>Number(x.replace(",",".")))
      .filter(x=>Number.isFinite(x)&&x>=25&&x<=45);
  }

  const duMatch=text.match(/\bDU\s+(\d+(?:[.,]\d+)?)\s*mL\b/i);
  if(duMatch){
    const v=Number(duMatch[1].replace(",","."));
    if(Number.isFinite(v)&&v>=0)result.du=v;
  }

  const bhMatch=text.match(/\bBH\s*([+-]?\s*\d+(?:[.,]\d+)?)\s*mL\b/i);
  if(bhMatch){
    const v=Number(bhMatch[1].replace(/\s/g,"").replace(",","."));
    if(Number.isFinite(v))result.bh=v;
  }

  return result;
}

function extractNursingData(options={}){
  const source=document.getElementById("nursingAuxText");
  const status=document.getElementById("nursingExtractStatus");
  if(!source||!status)return;

  const auto=!!options.auto;
  const force=!!options.force;
  const raw=source.value.trim();

  if(!raw){
    status.className="result muted";
    status.textContent="Cole os dados do Auxiliar; a extração será tentada automaticamente.";
    return;
  }

  const parsed=parseAuxiliarNursingText(raw);
  const period=Number(document.getElementById("nursingPeriod")?.value)||24;

  const found=[];
  if(parsed.hgt.length)found.push(["hgt_series",parsed.hgt.join("-"),"HGT"]);
  if(parsed.temp.length)found.push([
    "temp_series",
    parsed.temp.map(v=>String(v).replace(".",",")).join("-"),
    "temperatura"
  ]);
  if(parsed.du!==null)found.push(["urine_volume",parsed.du,"diurese"]);
  if(parsed.bh!==null)found.push(["fluid_balance",parsed.bh,"balanço hídrico"]);

  if(!found.length){
    status.className="result warn";
    status.textContent="Não foi possível reconhecer HGT, temperatura, diurese ou balanço hídrico no texto.";
    return;
  }

  const existing=found.filter(([name])=>{
    const el=form.elements[name];
    return el&&String(el.value??"").trim()!=="";
  });

  if(force&&existing.length){
    const names=existing.map(x=>x[2]).join(", ");
    if(!confirm(`Já existem valores preenchidos para: ${names}. Deseja substituí-los pelos dados do Auxiliar?`)){
      status.className="result muted";
      status.textContent="Os valores atuais foram mantidos.";
      return;
    }
  }

  const applied=[];
  const preserved=[];

  for(const [name,value,label] of found){
    const el=form.elements[name];
    if(!el)continue;

    const hasValue=String(el.value??"").trim()!=="";

    if(auto&&hasValue){
      preserved.push(label);
      continue;
    }

    if(!auto||!hasValue){
      el.value=value;
      applied.push(label);
    }
  }

  if(parsed.du!==null&&form.elements.urine_hours){
    const hasHours=String(form.elements.urine_hours.value??"").trim()!=="";
    if(force||!hasHours||auto){
      form.elements.urine_hours.value=period;
    }
  }

  // Mantém compatibilidade com a interface manual de temperatura.
  if(parsed.temp.length&&(applied.includes("temperatura")||force)){
    const min=Math.min(...parsed.temp);
    const max=Math.max(...parsed.temp);

    if(max>=38){
      form.elements.temp_status.value="fever";
      form.elements.fever_temp.value=max;
    }else if(min>=35){
      form.elements.temp_status.value="afebrile";
      form.elements.fever_temp.value="";
      form.elements.fever_time.value="";
    }else{
      // A hipotermia fica disponível para conferência na tela,
      // mas não é narrada automaticamente na evolução final.
      form.elements.temp_status.value="";
      form.elements.fever_temp.value="";
      form.elements.fever_time.value="";
    }
  }

  updateRenalPreview();
  updateGlyTempSummary();
  updatePhysicalExamSuggestion();

  const details=[];
  if(parsed.hgt.length)details.push(`HGT ${parsed.hgt.join("-")}`);
  if(parsed.temp.length)details.push(`T ${parsed.temp.map(v=>v.toFixed(1).replace(".",",")).join("-")} °C`);
  if(parsed.du!==null)details.push(`DU ${parsed.du} mL/${period}h`);
  if(parsed.bh!==null)details.push(`BH ${parsed.bh>0?"+":""}${parsed.bh} mL`);

  if(applied.length){
    status.className="result ok";
    status.textContent="Extração automática: "+details.join(" | ")+".";
  }else if(preserved.length){
    status.className="result warn";
    status.textContent=
      "Dados reconhecidos, mas os campos já possuem valores. "+
      "Clique em “Extrair novamente” se quiser substituí-los.";
  }else{
    status.className="result muted";
    status.textContent="Dados reconhecidos.";
  }
}

function updateDvaVisibility(){
  const enabled=!!form.elements.dva_enabled?.checked;
  const fields=document.getElementById("dvaFields");
  if(fields)fields.classList.toggle("hidden",!enabled);
  updateDvaPreview();
}

function calcDva(data=getData()){
  if(!data.dva_enabled){
    return {norepi:null,vaso:null,dobut:null,nipride:null,tridil:null};
  }

  const weight=num(data,"weight");

  function calcWeighted(prefix,amountKey,factor){
    const amp=num(data,prefix+"_ampoules");
    const amount=num(data,amountKey);
    const vol=num(data,prefix+"_volume");
    const rate=num(data,prefix+"_rate");
    if(!(amp>0&&amount>0&&vol>0&&rate>0&&weight>0))return null;
    const perMin=(amp*amount*factor/vol)*rate/60;
    return perMin/weight;
  }

  function calcUnweighted(prefix,amountKey,factor){
    const amp=num(data,prefix+"_ampoules");
    const amount=num(data,amountKey);
    const vol=num(data,prefix+"_volume");
    const rate=num(data,prefix+"_rate");
    if(!(amp>0&&amount>0&&vol>0&&rate>0))return null;
    return (amp*amount*factor/vol)*rate/60;
  }

  return {
    norepi:calcWeighted("norepi","norepi_mg_ampoule",1000),
    vaso:calcUnweighted("vaso","vaso_units_ampoule",1),
    dobut:calcWeighted("dobut","dobut_mg_ampoule",1000),
    nipride:calcWeighted("nipride","nipride_mg_ampoule",1000),
    tridil:calcUnweighted("tridil","tridil_mg_ampoule",1000)
  };
}

function updateDvaPreview(){
  const enabled=!!form.elements.dva_enabled?.checked;
  const d=calcDva(),fd=getData();
  const defs=[
    ["norepiPreview",d.norepi,"mcg/kg/min",0.05,2.5,3,"norepi",true],
    ["vasoPreview",d.vaso,"UI/min",0.01,0.07,3,"vaso",false],
    ["dobutPreview",d.dobut,"mcg/kg/min",2.5,15,2,"dobut",true],
    ["nipridePreview",d.nipride,"mcg/kg/min",0.3,10,2,"nipride",true],
    ["tridilPreview",d.tridil,"mcg/min",null,null,1,"tridil",false]
  ];
  defs.forEach(([id,value,unit,min,max,dec,prefix,weighted])=>{
    const el=document.getElementById(id);if(!el)return;
    if(!enabled){el.className="result muted";el.textContent="DVA desmarcada.";return;}
    if(value===null){el.className="result muted";el.textContent="Sem cálculo.";return;}
    const outside=min!==null&&(value<min||value>max);
    el.className="result "+(outside?"warn":"ok");
    const amp=fd[prefix+"_ampoules"],vol=fd[prefix+"_volume"],rate=fd[prefix+"_rate"];
    const amountKey=prefix==="vaso"?"vaso_units_ampoule":prefix+"_mg_ampoule";
    const amount=fd[amountKey];
    let text=`<strong>Dose calculada: ${value.toFixed(dec)} ${unit}</strong>${outside?" — revisar faixa.":""}`;
    text+=`<div class="small-note"><strong>Dados usados:</strong> ${amp} ampola(s), ${amount} ${prefix==="vaso"?"UI":"mg"}/ampola, volume final ${vol} mL e vazão ${rate} mL/h — origem: seção DVA.`;
    if(weighted)text+=` Peso ${fd.weight} kg — origem: Paciente.`;
    text+=`</div><div class="small-note"><strong>Conta:</strong> dose total ÷ volume final × vazão ÷ 60${weighted?" ÷ peso":""}. Confira a apresentação real disponível no serviço.</div>`;
    el.innerHTML=text;
  });
}

function analyzeRenal(data=getData()){
  const actualWeight=num(data,"weight");
  const idealWeight=num(data,"renal_ideal_weight");
  const volume=num(data,"urine_volume");
  const hours=num(data,"urine_hours");
  const onHD=!!data.hemodialysis;

  // Clinical narrative can still show mL/kg/h using the recorded actual weight.
  let urineActualRate=null;
  if(actualWeight>0&&volume!==null&&hours>0)urineActualRate=volume/actualWeight/hours;

  // KDIGO 2026 public-review draft specifies IDEAL body weight for the urine-output criterion.
  let urine=null;
  if(idealWeight>0&&volume!==null&&hours>0){
    const rate=volume/idealWeight/hours;
    let label="diurese preservada",stage=null;

    if(volume===0){
      label="anúrico";
      if(!onHD&&hours>12)stage=3;
      else if(!onHD&&hours>=6)stage=1;
    }else if(rate<0.3){
      label="oligoanúrico";
      if(!onHD){
        if(hours>24)stage=3;
        else if(hours>12)stage=2;
        else if(hours>=6)stage=1;
      }
    }else if(rate<0.5){
      label="oligúrico";
      if(!onHD){
        if(hours>12)stage=2;
        else if(hours>=6)stage=1;
      }
    }
    urine={rate,label,stage,volume,hours,weight:idealWeight};
  }else if(volume!==null&&hours>0){
    let label="diurese informada";
    if(volume===0)label="anúrico";
    else if(urineActualRate!==null&&urineActualRate<0.3)label="oligoanúrico";
    else if(urineActualRate!==null&&urineActualRate<0.5)label="oligúrico";
    else if(urineActualRate!==null)label="diurese preservada";
    urine={rate:null,label,stage:null,volume,hours,weight:null};
  }

  const cp=num(data,"creatinine_prev"),cn=num(data,"creatinine_now");
  const up=num(data,"urea_prev"),un=num(data,"urea_now");
  const interval=data.creatinine_interval||"";
  const valid48=interval==="le48";
  const valid7=interval==="le48"||interval==="d3_7";

  let cStage=null,worse=false,creatinineTimingValid=false,creatinineReason="";
  if(cp>0&&cn!==null){
    const ratio=cn/cp,delta=cn-cp;
    worse=delta>0;

    if(!onHD){
      // AKI definition must first satisfy the relevant time window:
      const qualifiesDelta=valid48&&delta>=0.3;
      const qualifiesRatio=valid7&&ratio>=1.5;
      creatinineTimingValid=qualifiesDelta||qualifiesRatio;

      if(creatinineTimingValid){
        if(cn>=4||ratio>=3)cStage=3;
        else if(ratio>=2)cStage=2;
        else if(ratio>=1.5||qualifiesDelta)cStage=1;
      }else if(interval==="gt7"||interval==="unknown"||interval===""){
        creatinineReason="Há variação de creatinina, mas o intervalo informado não permite classificar automaticamente LRA pelo critério temporal.";
      }
    }
  }

  const finalStage=Math.max(urine?.stage||0,cStage||0)||null;
  let source=null;
  if(finalStage){
    const sources=[];
    if(cStage===finalStage)sources.push("creatinine");
    if(urine?.stage===finalStage)sources.push("urine");
    source=sources.join("+");
  }

  return {
    urine,urineActualRate,actualWeight,idealWeight,
    cp,cn,up,un,cStage,worse,onHD,finalStage,source,
    interval,valid48,valid7,creatinineTimingValid,creatinineReason,
    ratio:(un!==null&&cn>0)?un/cn:null,
    ureaAboveRef:!!data.urea_above_ref
  };
}

function updateRenalPreview(){
  const d=getData(),r=analyzeRenal(d),el=document.getElementById("renalPreview");
  const parts=[];

  if(r.onHD)parts.push("Paciente em HD.");

  if(r.urine){
    let urText=r.urine.label;
    if(r.urine.rate!==null){
      urText+=`: ${r.urine.rate.toFixed(2)} mL/kg/h pelo peso ideal`;
      if(r.urine.stage)urText+=` — U${r.urine.stage}`;
    }else if(r.urineActualRate!==null){
      urText+=`: ${r.urineActualRate.toFixed(2)} mL/kg/h pelo peso real; sem estágio U porque o peso ideal não foi informado`;
    }else{
      urText+="; sem cálculo em mL/kg/h";
    }
    parts.push(urText+".");
  }

  if(r.worse)parts.push(`Creatinina ${r.cp} → ${r.cn} mg/dL.`);
  if(r.cStage)parts.push(`Critério por creatinina: C${r.cStage}.`);
  if(r.creatinineReason)parts.push(r.creatinineReason);

  if(r.finalStage){
    const c=r.cStage?`C${r.cStage}`:"C–";
    const u=r.urine?.stage?`U${r.urine.stage}`:"U–";
    parts.push(`<strong>LRA funcional: estágio ${r.finalStage} (${c}/${u}).</strong>`);
  }

  // Urea: azotemia only when the user marks that the result is above the LOCAL lab reference.
  if(r.un!==null){
    if(r.ureaAboveRef)parts.push(`Azotemia: ureia ${r.un} mg/dL, marcada como acima do VR do laboratório.`);
    else parts.push(`Ureia atual: ${r.un} mg/dL.`);
  }

  if(r.onHD){
    parts.push("Relação ureia/creatinina não utilizada para sugerir etiologia em paciente em HD.");
  }else if(r.ratio!==null){
    if(r.ratio>=40)parts.push(`Relação ureia/creatinina ${r.ratio.toFixed(1)}: pode favorecer componente pré-renal, mas tem baixa acurácia quando usada isoladamente.`);
    else parts.push(`Relação ureia/creatinina ${r.ratio.toFixed(1)}: não favorece claramente padrão pré-renal e não separa de forma confiável causa renal intrínseca de pós-renal.`);
  }

  if(r.urine&&r.urine.rate!==null){
    parts.push(`<div class="small-note"><strong>Conta do critério urinário:</strong> ${d.urine_volume} mL ÷ ${d.renal_ideal_weight} kg (peso ideal informado) ÷ ${d.urine_hours} h = ${r.urine.rate.toFixed(2)} mL/kg/h. <strong>Origem:</strong> DU/período/peso ideal — Função Renal.</div>`);
  }else if(r.urineActualRate!==null){
    parts.push(`<div class="small-note"><strong>Conta apenas descritiva do DU:</strong> ${d.urine_volume} mL ÷ ${d.weight} kg (peso real) ÷ ${d.urine_hours} h = ${r.urineActualRate.toFixed(2)} mL/kg/h. Este valor não é usado para estadiar U no módulo atualizado.</div>`);
  }

  if(r.cp!==null&&r.cn!==null){
    const intervalLabel={le48:"≤48 h",d3_7:"3–7 dias",gt7:">7 dias",unknown:"desconhecido","":"não informado"}[r.interval];
    parts.push(`<div class="small-note"><strong>Dados da creatinina:</strong> basal/anterior ${r.cp} mg/dL; atual ${r.cn} mg/dL; intervalo ${intervalLabel} — origem: Função Renal. O aumento absoluto ≥0,3 mg/dL só é aplicado se ≤48 h; razão ≥1,5× apenas se dentro de 7 dias.</div>`);
  }

  if(r.ratio!==null){
    parts.push(`<div class="small-note"><strong>Conta:</strong> ureia ${r.un} ÷ creatinina ${r.cn} = ${r.ratio.toFixed(1)}. <strong>Origem:</strong> Função Renal.</div>`);
    parts.push(clinicalSource("Manoeuvrier et al., BMC Nephrology 2017 — baixa capacidade discriminativa da relação ureia/creatinina",SOURCE_LINKS.buncr));
  }

  parts.push(clinicalSource("KDIGO 2026 AKI/AKD — Public Review Draft: critérios funcionais C/U e uso de peso ideal no critério urinário",SOURCE_LINKS.kdigoDraft));
  parts.push(`<div class="small-note"><strong>Status da fonte:</strong> o KDIGO informa que a versão 2026 está em revisão pública e ainda não é guideline final. O app identifica isso explicitamente para evitar tratar o draft como recomendação definitiva. <a href="${SOURCE_LINKS.kdigoAkiPage}" target="_blank" rel="noopener">Página oficial do KDIGO AKI/AKD</a>.</div>`);

  el.className="result "+((r.finalStage||r.worse||r.ureaAboveRef)?"warn":"muted");
  el.innerHTML=parts.length?parts.join("<br>"):"Sem dados suficientes.";
}

function calcSOFA(data,renal,dva){
  const p={resp:0,coag:0,liver:0,cardio:0,cns:0,renal:0};
  const pa=(data.abg_collected&&num(data,"abg_pao2")!==null)?num(data,"abg_pao2"):num(data,"pao2"),fio=num(data,"fio2");
  if(pa>0&&fio>0){
    const pf=pa/(fio/100);
    p.resp=pf<100?4:pf<200?3:pf<300?2:pf<400?1:0;
  }
  const pl=num(data,"platelets_now");
  if(pl!==null)p.coag=pl<20000?4:pl<50000?3:pl<100000?2:pl<150000?1:0;
  const bil=num(data,"bilirubin_now");
  if(bil!==null)p.liver=bil>=12?4:bil>=6?3:bil>=2?2:bil>=1.2?1:0;

  const map=num(data,"map")??((num(data,"sbp")!==null&&num(data,"dbp")!==null)?(num(data,"sbp")+2*num(data,"dbp"))/3:null);
  if(dva.norepi!==null)p.cardio=dva.norepi>0.1?4:3;
  else if(dva.dobut!==null|| (map!==null&&map<70))p.cardio=2;

  const g=num(data,"gcs");
  if(g!==null)p.cns=g<6?4:g<10?3:g<13?2:g<15?1:0;

  if(renal.onHD)p.renal=4;
  else if(renal.cn!==null)p.renal=renal.cn>=5?4:renal.cn>=3.5?3:renal.cn>=2?2:renal.cn>=1.2?1:0;

  return {parts:p,total:Object.values(p).reduce((a,b)=>a+b,0)};
}


const SOURCE_LINKS={
  ash:"https://ashpublications.org/bloodadvances/article/2/22/3198/16115/American-Society-of-Hematology-2018-guidelines-for",
  kdigoDraft:"https://kdigo.org/wp-content/uploads/2026/03/KDIGO-2026-AKI-AKD-Guideline-Public-Review-Draft-March-2026.pdf",
  kdigoAkiPage:"https://kdigo.org/guidelines/acute-kidney-injury/",
  winter:"https://www.ncbi.nlm.nih.gov/books/NBK507807/",
  merckAcidBase:"https://www.merckmanuals.com/professional/nephrology/acid-base-regulation-and-disorders/acid-base-disorders",
  co2gap:"https://link.springer.com/article/10.1186/s13054-021-03671-w",
  buncr:"https://bmcnephrol.biomedcentral.com/articles/10.1186/s12882-017-0591-9"
};

function sourceLine(label,value,unit,origin){
  if(value===null||value===undefined||value==="")return "";
  return `<div class="small-note"><strong>Dado utilizado:</strong> ${label} = ${value}${unit||""} — <strong>origem:</strong> ${origin}.</div>`;
}

function clinicalSource(text,url){
  return `<div class="small-note"><strong>Fonte clínica:</strong> <a href="${url}" target="_blank" rel="noopener">${text}</a>.</div>`;
}

function assessPTEV(){
  const d=getData(), el=document.getElementById("ptevAssessment");
  if(!el)return;
  const plt=num(d,"platelets_now");
  const bleeding=!!d.active_bleeding||!!d.high_bleeding_risk||(plt!==null&&plt<50000);
  let lines=[], cls="ok";

  if(d.full_anticoag){
    lines.push("<strong>Anticoagulação plena marcada.</strong> Não acrescentar profilaxia farmacológica adicional.");
    if(d.ptev_in_use){cls="warn";lines.push("⚠ PTEV também está marcada: revisar possível duplicidade.");}
  }else if(d.ptev_in_use){
    if(bleeding){
      cls="warn";
      const r=[];
      if(d.active_bleeding)r.push("sangramento ativo");
      if(d.high_bleeding_risk)r.push("alto risco hemorrágico/procedimento de alto risco");
      if(plt!==null&&plt<50000)r.push(`plaquetas ${plt}/mm³`);
      lines.push(`<strong>⚠ Reavaliar segurança da PTEV farmacológica.</strong> Marcadores: ${r.join(", ")}.`);
    }else{
      lines.push("<strong>PTEV farmacológica em uso.</strong> Nenhum marcador de alto risco hemorrágico foi registrado neste formulário.");
    }
  }else{
    if(bleeding){
      cls="warn";
      lines.push("<strong>⚠ PTEV farmacológica não marcada.</strong> Há possível contraindicação/alto risco hemorrágico; considerar profilaxia mecânica quando apropriada e reavaliar diariamente.");
    }else{
      cls="warn";
      lines.push("<strong>⚠ Considerar PTEV farmacológica.</strong> Paciente crítico sem anticoagulação plena e sem contraindicação evidente registrada neste formulário.");
    }
  }

  if(plt!==null)lines.push(sourceLine("Plaquetas",plt,"/mm³","Laboratório atual"));
  lines.push(clinicalSource("ASH 2018 — profilaxia de TEV em pacientes clínicos hospitalizados",SOURCE_LINKS.ash));
  lines.push('<div class="small-note">Plaquetas &lt;50.000/mm³ são usadas aqui como marcador de maior risco hemorrágico, e não como contraindicação absoluta isolada.</div>');
  el.className="result "+cls;
  el.innerHTML=lines.join("<br>");
}

function abgEtiology(primary,ag,lact,data=getData()){
  const out=[];
  const renal=analyzeRenal(data);

  if(primary.includes("Acidose metabólica")){
    if(lact!==null&&lact>2)out.push("lactato elevado pode contribuir para a acidose");

    if(ag!==null&&ag>12){
      out.push("AG elevado: considerar acidose láctica, cetoacidose, intoxicações e retenção de ácidos não mensurados conforme contexto");

      if(renal.ureaAboveRef&&renal.un!==null){
        out.push(`ureia ${renal.un} mg/dL acima do VR + acidose metabólica com AG aumentado: considerar retenção de ácidos urêmicos no contexto de disfunção renal como etiologia possível (a ureia é marcador de azotemia; não é, isoladamente, diagnóstico de síndrome urêmica)`);
      }
    }else if(ag!==null){
      out.push("AG não elevado: considerar perdas gastrointestinais de bicarbonato, acidose tubular renal ou carga de cloreto conforme contexto");
    }else{
      out.push("considerar causas de AG elevado e causas hiperclorêmicas após avaliação do contexto");
    }
  }

  if(primary.includes("Alcalose metabólica"))out.push("considerar vômitos/aspiração gástrica, diuréticos, contração volêmica ou excesso mineralocorticoide");
  if(primary.includes("Acidose respiratória"))out.push("considerar hipoventilação por sedação/CNS, DPOC/asma grave, doença neuromuscular, obstrução ou ventilação inadequada");
  if(primary.includes("Alcalose respiratória"))out.push("considerar dor/agitação, sepse, hipoxemia, TEP, hepatopatia ou hiperventilação em VM");
  return out;
}

function assessABG(){
  const d=getData(),el=document.getElementById("abgAssessment");
  if(!el)return;
  if(!d.abg_collected){el.className="result muted";el.textContent="Gasometria arterial não marcada.";return;}

  const ph=num(d,"abg_ph"),pco2=num(d,"abg_paco2"),hco3=num(d,"abg_hco3");
  const pao2=num(d,"abg_pao2"),ag=num(d,"abg_ag"),be=num(d,"abg_be"),lact=num(d,"abg_lactate"),sao2=num(d,"abg_sao2");
  const fio2=num(d,"fio2"),pfInput=num(d,"abg_pf");
  let lines=[],cls="ok",primary="";

  if(ph!==null&&pco2!==null&&hco3!==null){
    if(ph<7.35){
      if(hco3<22&&pco2>45)primary="Acidose metabólica + acidose respiratória (distúrbio misto).";
      else if(hco3<22)primary="Acidose metabólica.";
      else if(pco2>45)primary="Acidose respiratória.";
      else primary="Acidemia sem padrão simples definido pelos valores informados.";
    }else if(ph>7.45){
      if(hco3>26&&pco2<35)primary="Alcalose metabólica + alcalose respiratória (distúrbio misto).";
      else if(hco3>26)primary="Alcalose metabólica.";
      else if(pco2<35)primary="Alcalose respiratória.";
      else primary="Alcalemia sem padrão simples definido pelos valores informados.";
    }else{
      if(hco3<22&&pco2<35)primary="pH normal com HCO₃⁻ e PCO₂ baixos: distúrbio compensado ou misto.";
      else if(hco3>26&&pco2>45)primary="pH normal com HCO₃⁻ e PCO₂ altos: distúrbio compensado ou misto.";
      else primary="Sem distúrbio ácido-básico evidente pelos valores informados.";
    }
    lines.push(`<strong>${primary}</strong>`);

    if(hco3<22){
      const center=1.5*hco3+8,lo=center-2,hi=center+2;
      const comp=pco2<lo?"PCO₂ abaixo do esperado → alcalose respiratória associada.":pco2>hi?"PCO₂ acima do esperado → acidose respiratória associada.":"Compensação respiratória adequada pela Fórmula de Winter.";
      if(pco2<lo||pco2>hi)cls="warn";
      lines.push(`PCO₂ esperada = ${center.toFixed(1)} ± 2 mmHg (${lo.toFixed(1)}–${hi.toFixed(1)}). ${comp}`);
      lines.push(`<div class="small-note"><strong>Conta:</strong> 1,5 × ${hco3} + 8 ± 2. <strong>Dados:</strong> HCO₃⁻ ${hco3} mEq/L e PCO₂ ${pco2} mmHg — origem: Gasometria Arterial.</div>`);
      lines.push(clinicalSource("Fórmula de Winter — StatPearls/NCBI",SOURCE_LINKS.winter));
    }else if(hco3>26){
      const center=40+0.7*(hco3-24),lo=center-5,hi=center+5;
      const comp=pco2<lo?"PCO₂ abaixo do esperado → alcalose respiratória associada.":pco2>hi?"PCO₂ acima do esperado → acidose respiratória associada.":"Compensação respiratória compatível com o esperado.";
      if(pco2<lo||pco2>hi)cls="warn";
      lines.push(`PCO₂ esperada ≈ ${center.toFixed(1)} mmHg (aprox. ${lo.toFixed(1)}–${hi.toFixed(1)}). ${comp}`);
      lines.push(`<div class="small-note"><strong>Conta:</strong> 40 + 0,7 × (${hco3} − 24). <strong>Dados:</strong> HCO₃⁻ ${hco3} mEq/L e PCO₂ ${pco2} mmHg — origem: Gasometria Arterial.</div>`);
      lines.push(clinicalSource("Compensação da alcalose metabólica — Merck Manual Professional",SOURCE_LINKS.merckAcidBase));
    }else if(pco2>45){
      const delta=(pco2-40)/10,acute=24+delta,chronic=24+3.5*delta;
      const da=Math.abs(hco3-acute),dc=Math.abs(hco3-chronic);
      const comp=Math.min(da,dc)<=3?`Mais compatível com padrão ${da<=dc?"agudo":"crônico"} de acidose respiratória.`:"HCO₃⁻ fora do esperado para distúrbio respiratório simples → considerar componente metabólico associado.";
      if(Math.min(da,dc)>3)cls="warn";
      lines.push(`${comp} HCO₃⁻ esperado: agudo ≈ ${acute.toFixed(1)}; crônico ≈ ${chronic.toFixed(1)} mEq/L.`);
      lines.push(`<div class="small-note"><strong>Dados:</strong> PCO₂ ${pco2} mmHg e HCO₃⁻ ${hco3} mEq/L — origem: Gasometria Arterial. <strong>Regra:</strong> HCO₃⁻ sobe ~1 mEq/L/10 mmHg na forma aguda e ~3,5–4/10 na crônica.</div>`);
      lines.push(clinicalSource("Regras de compensação ácido-básica — Merck Manual Professional",SOURCE_LINKS.merckAcidBase));
    }else if(pco2<35){
      const delta=(40-pco2)/10,acute=24-2*delta,chronic=24-4*delta;
      const da=Math.abs(hco3-acute),dc=Math.abs(hco3-chronic);
      const comp=Math.min(da,dc)<=3?`Mais compatível com padrão ${da<=dc?"agudo":"crônico"} de alcalose respiratória.`:"HCO₃⁻ fora do esperado para distúrbio respiratório simples → considerar componente metabólico associado.";
      if(Math.min(da,dc)>3)cls="warn";
      lines.push(`${comp} HCO₃⁻ esperado: agudo ≈ ${acute.toFixed(1)}; crônico ≈ ${chronic.toFixed(1)} mEq/L.`);
      lines.push(`<div class="small-note"><strong>Dados:</strong> PCO₂ ${pco2} mmHg e HCO₃⁻ ${hco3} mEq/L — origem: Gasometria Arterial. <strong>Regra:</strong> HCO₃⁻ cai ~2 mEq/L/10 mmHg na forma aguda e ~4/10 na crônica.</div>`);
      lines.push(clinicalSource("Regras de compensação ácido-básica — Merck Manual Professional",SOURCE_LINKS.merckAcidBase));
    }

    const eti=abgEtiology(primary,ag,lact,d);
    if(eti.length)lines.push("<strong>Possíveis etiologias:</strong> "+eti.join("; ")+".");
    lines.push(sourceLine("pH",ph,"","Gasometria Arterial"));
    lines.push(sourceLine("PCO₂",pco2," mmHg","Gasometria Arterial"));
    lines.push(sourceLine("Bicarbonato",hco3," mEq/L","Gasometria Arterial"));
  }else{
    cls="warn";
    lines.push("<strong>Preencha pH, PCO₂ e bicarbonato para interpretação ácido-básica completa.</strong>");
  }

  if(ag!==null){
    lines.push(ag>12?"Anion Gap elevado.":"Anion Gap não elevado pelo ponto de referência usado no programa (12 mEq/L).");
    lines.push(sourceLine("Anion Gap",ag," mEq/L","Gasometria Arterial — valor informado"));
  }
  if(lact!==null){
    if(lact>2){cls="warn";lines.push(`Lactato elevado (${lact} mmol/L): correlacionar com perfusão, sepse, hipóxia, fármacos e outras causas.`);}
    lines.push(sourceLine("Lactato",lact," mmol/L","Gasometria Arterial"));
  }

  let pf=pfInput,calculated=false;
  if(pf===null&&pao2!==null&&fio2!==null&&fio2>0){pf=pao2/(fio2/100);calculated=true;}
  if(pf!==null){
    lines.push(`PaO₂/FiO₂ = ${pf.toFixed(0)}.`);
    if(calculated)lines.push(`<div class="small-note"><strong>Conta:</strong> ${pao2} ÷ (${fio2}/100) = ${pf.toFixed(0)}. <strong>Origem:</strong> PO₂ — Gasometria Arterial; FiO₂ — Função Respiratória.</div>`);
    else lines.push(sourceLine("PaO₂/FiO₂",pf.toFixed(0),"","Gasometria Arterial — valor informado"));
  }
  if(pao2!==null)lines.push(sourceLine("PO₂",pao2," mmHg","Gasometria Arterial"));
  if(sao2!==null)lines.push(sourceLine("SO₂",sao2,"%","Gasometria Arterial"));
  if(be!==null)lines.push(sourceLine("BE",be," mEq/L","Gasometria Arterial"));

  el.className="result "+cls;
  el.innerHTML=lines.filter(Boolean).join("<br>");
}

function assessCVG(){
  const d=getData(),el=document.getElementById("cvgAssessment");
  if(!el)return;
  if(!d.cvg_collected){el.className="result muted";el.textContent="Gasometria Venosa Central não marcada.";return;}
  const pv=num(d,"cvg_pvco2"),scv=num(d,"cvg_scvo2"),pa=d.abg_collected?num(d,"abg_paco2"):null;
  let lines=[],cls="ok";

  if(pv!==null&&pa!==null){
    const gap=pv-pa;
    lines.push(`<strong>Gap CO₂ = ${gap.toFixed(1)} mmHg.</strong>`);
    if(gap>6){cls="warn";lines.push("Gap CO₂ >6 mmHg: pode sugerir fluxo sanguíneo inadequado em relação à produção de CO₂/microcirculação alterada; correlacionar com perfusão e débito cardíaco.");}
    else lines.push("Gap CO₂ ≤6 mmHg.");
    lines.push(`<div class="small-note"><strong>Conta:</strong> PCO₂ venosa central ${pv} − PCO₂ arterial ${pa} = ${gap.toFixed(1)} mmHg. <strong>Origem:</strong> Gasometria Venosa Central + Gasometria Arterial.</div>`);
    lines.push(clinicalSource("Ltaief et al., Critical Care 2021 — Pv-aCO₂ gap",SOURCE_LINKS.co2gap));
  }else{
    cls="warn";
    lines.push("Para calcular o Gap CO₂, informe PCO₂ venosa central e PCO₂ arterial.");
  }

  if(scv!==null){
    if(scv<70){cls="warn";lines.push(`ScvO₂ ${scv}%: baixa; pode indicar desequilíbrio entre oferta e consumo de O₂.`);}
    else if(scv>80)lines.push(`ScvO₂ ${scv}%: elevada. Valor alto não exclui hipoperfusão e pode ocorrer com baixa extração de O₂/microcirculação alterada.`);
    else lines.push(`ScvO₂ ${scv}%: faixa prática de 70–80%. Interpretar no contexto clínico.`);
    lines.push(sourceLine("ScvO₂",scv,"%","Gasometria Venosa Central"));
    lines.push(clinicalSource("Revisão fisiológica de ScvO₂ e Pv-aCO₂ em cuidados críticos",SOURCE_LINKS.co2gap));
  }

  el.className="result "+cls;
  el.innerHTML=lines.filter(Boolean).join("<br>");
}

function updateGasVisibility(){
  const a=!!form.elements.abg_collected?.checked;
  const v=!!form.elements.cvg_collected?.checked;
  document.getElementById("abgFields")?.classList.toggle("hidden",!a);
  document.getElementById("cvgFields")?.classList.toggle("hidden",!v);
  assessABG();
  assessCVG();
}

function analyze(){
  const data=getData();
  const renal=analyzeRenal(data);
  const dva=calcDva(data);
  const alerts=[];
  const map=num(data,"map")??((num(data,"sbp")!==null&&num(data,"dbp")!==null)?(num(data,"sbp")+2*num(data,"dbp"))/3:null);

  if(map!==null&&map<65)alerts.push(["high","PAM abaixo de 65 mmHg."]);
  if(num(data,"sbp")>=180||num(data,"dbp")>=120||(map!==null&&map>=130))
    alerts.push(["high","PA muito elevada: revisar dor/agitação e possibilidade de emergência hipertensiva."]);

  if(dva.norepi!==null&&(dva.norepi<0.05||dva.norepi>2.5))
    alerts.push([dva.norepi>2.5?"high":"medium",`Noradrenalina ${dva.norepi.toFixed(3)} mcg/kg/min fora da faixa automática.`]);

  if(renal.urine&&renal.urine.label!=="diurese preservada")
    alerts.push([renal.urine.label==="oligúrico"?"medium":"high",`${renal.urine.label}: ${renal.urine.rate.toFixed(2)} mL/kg/h.`]);

  if(renal.worse)alerts.push(["high",`Piora laboratorial da função renal: creatinina ${renal.cp} → ${renal.cn}.`]);
  if(renal.un!==null&&renal.ureaAboveRef)alerts.push(["medium",`Azotemia: ureia ${renal.un} mg/dL, marcada como acima do VR do laboratório.`]);

  [["potassium","K",3.5,5],["phosphorus","P",2.5,4.5],["magnesium","Mg",1.7,2.4],["sodium","Na",135,145]].forEach(([key,label,min,max])=>{
    const v=num(data,key+"_now");
    if(v!==null&&(v<min||v>max))alerts.push(["medium",`${label} alterado: ${v}.`]);
  });

  const plt=num(data,"platelets_now");
  if(!data.full_anticoag){
    if(data.ptev_in_use&&(data.active_bleeding||data.high_bleeding_risk||(plt!==null&&plt<50000))){
      alerts.push(["high","PTEV farmacológica em uso com marcador de maior risco hemorrágico: reavaliar segurança."]);
    }else if(!data.ptev_in_use&&!(data.active_bleeding||data.high_bleeding_risk||(plt!==null&&plt<50000))){
      alerts.push(["medium","PTEV farmacológica não registrada e sem contraindicação evidente no formulário: considerar indicação."]);
    }else if(!data.ptev_in_use&&(data.active_bleeding||data.high_bleeding_risk||(plt!==null&&plt<50000))){
      alerts.push(["info","PTEV farmacológica não registrada com possível contraindicação/alto risco hemorrágico: considerar profilaxia mecânica quando apropriada."]);
    }
  }else if(data.ptev_in_use){
    alerts.push(["high","Anticoagulação plena e PTEV farmacológica estão marcadas simultaneamente: revisar duplicidade."]);
  }

  return {data,renal,dva,map,alerts,sofa:calcSOFA(data,renal,dva)};
}

function updateChecklist(){
  const a=analyze();
  const high=a.alerts.filter(x=>x[0]==="high");
  const medium=a.alerts.filter(x=>x[0]==="medium");
  const info=a.alerts.filter(x=>x[0]==="info");
  let html="";
  if(high.length)html+=`<div class="alert-high"><strong>Prioridade</strong>${high.map(x=>`<div>${escapeHtml(x[1])}</div>`).join("")}</div>`;
  if(medium.length)html+=`<div class="alert-medium"><strong>Atenção</strong>${medium.map(x=>`<div>${escapeHtml(x[1])}</div>`).join("")}</div>`;
  if(info.length)html+=`<div class="alert-info">${info.map(x=>`<div>${escapeHtml(x[1])}</div>`).join("")}</div>`;
  document.getElementById("smartChecklist").innerHTML=html||'<div class="result ok">Sem alertas automáticos pelos dados preenchidos.</div>';
}

function generateEvolution(){
  const a=analyze(),d=a.data,r=a.renal,dva=a.dva;
  const narrative=[];

  // --- Main evolution narrative ---
  const allowedSeverity=["comprometido","grave","gravíssimo"];
  let first="Paciente evolui"+(allowedSeverity.includes(d.severity)?" "+d.severity:"");

  const usingDVA=Object.values(dva).some(x=>x!==null);
  if(usingDVA&&a.map!==null&&(a.map<65||a.map>90)){
    first+=", hemodinamicamente instável em detrimento do uso de DVA";
  }else if(usingDVA){
    first+=", hemodinamicamente compensado às custas de DVA";
  }else if(a.map!==null&&a.map>=65&&a.map<=90){
    first+=", hemodinamicamente estável, sem necessidade de DVA";
  }
  narrative.push(first+".");

  const names=[];
  if(dva.norepi!==null)names.push(`noradrenalina (${dva.norepi.toFixed(2)} mcg/kg/min)`);
  if(dva.vaso!==null)names.push(`vasopressina (${dva.vaso.toFixed(3)} UI/min)`);
  if(dva.dobut!==null)names.push(`dobutamina (${dva.dobut.toFixed(2)} mcg/kg/min)`);
  if(dva.nipride!==null)names.push(`Nipride (${dva.nipride.toFixed(2)} mcg/kg/min)`);
  if(dva.tridil!==null)names.push(`Tridil (${dva.tridil.toFixed(1)} mcg/min)`);
  if(names.length){
    narrative.push("Em uso de "+(names.length===1?names[0]:names.slice(0,-1).join(", ")+" e "+names.at(-1))+".");
  }

  if(d.resp_support){
    let s={
      iot:"Intubado, em VM",
      trach:"Traqueostomizado, em VM",
      trach_aa:"Traqueostomizado, em AA",
      spontaneous:"Em ventilação espontânea",
      oxygen:"Em oxigenoterapia suplementar",
      niv:"Em VNI"
    }[d.resp_support];

    if(d.adaptation==="good")s+=", bem adaptado, sem sinais de desconforto respiratório";
    else if(d.adaptation==="poor")s+=", com desconforto respiratório ou assincronia";

    if(d.sedation==="yes")s+=", sob sedoanalgesia";
    narrative.push(s+".");
  }

  const ptevStatus=d.ptev_in_use
    ?"PTEV farmacológica em uso"
    :(d.full_anticoag?"sem PTEV farmacológica adicional, em anticoagulação plena":"sem PTEV farmacológica");
  const lamgStatus=d.lamg_prophylaxis
    ?"profilaxia para LAMG em uso"
    :"sem profilaxia para LAMG";
  narrative.push(`Profilaxias: ${ptevStatus}; ${lamgStatus}.`);

  if(r.onHD)narrative.push("Paciente em HD.");

  if(r.urine){
    let s=r.urine.label==="diurese preservada"?"Diurese preservada":"Paciente "+r.urine.label;
    if(d.urine_route==="svd")s+=" por SVD";
    s+=`, DU de ${d.urine_volume} mL/${d.urine_hours} h`;
    if(r.urineActualRate!==null)s+=` (${r.urineActualRate.toFixed(2)} mL/kg/h pelo peso real)`;
    if(num(d,"fluid_balance")!==null){
      s+=`, com BH de ${num(d,"fluid_balance")>0?"+":""}${num(d,"fluid_balance")} mL no período`;
    }
    narrative.push(s+".");
  }

  if(r.finalStage){
    const c=r.cStage?`C${r.cStage}`:"C–";
    const u=r.urine?.stage?`U${r.urine.stage}`:"U–";
    narrative.push(`LRA funcional estágio ${r.finalStage} (${c}/${u}).`);
  }else if(r.creatinineReason&&r.worse){
    narrative.push("Piora da creatinina sem janela temporal suficiente para estadiamento automático de LRA.");
  }

  const gt=glyTempNarrative(d);
  if(gt)narrative.push(gt);

  const findings=[];
  if(r.worse)findings.push("piora laboratorial da função renal");

  [["potassium","hipocalemia","hipercalemia",3.5,5],
   ["phosphorus","hipofosfatemia","hiperfosfatemia",2.5,4.5],
   ["magnesium","hipomagnesemia","hipermagnesemia",1.7,2.4],
   ["sodium","hiponatremia","hipernatremia",135,145]
  ].forEach(([key,lo,hi,min,max])=>{
    const v=num(d,key+"_now");
    if(v!==null){
      if(v<min)findings.push(lo);
      else if(v>max)findings.push(hi);
    }
  });

  if(findings.length){
    const unique=[...new Set(findings)];
    narrative.push(
      "Evolui com "+
      (unique.length===1?unique[0]:unique.slice(0,-1).join(", ")+" e "+unique.at(-1))+
      "."
    );
  }

  if(d.free_text){
    narrative.push(d.free_text.trim().replace(/[.]?$/,"."));
  }

  // --- HD block ---
  const diagnosesText=(d.diagnoses_text||"").trim();
  let hdBlock="#HD:";
  if(diagnosesText){
    hdBlock+="\n"+diagnosesText;
  }else{
    hdBlock+=" -";
  }

  // --- Devices block ---
  const deviceDefs=[
    ["dev_cvc","CVC","dev_cvc_note"],
    ["dev_cdl","CDL","dev_cdl_note"],
    ["dev_avp","PAI","dev_avp_note"],
    ["dev_svd","SVD","dev_svd_note"],
    ["dev_tot","TOT/IOT","dev_tot_note"],
    ["dev_tqt","TQT","dev_tqt_note"]
  ];

  const devices=deviceDefs
    .filter(([key])=>!!d[key])
    .map(([key,label,noteKey])=>{
      const note=(d[noteKey]||"").trim();
      return note?`${label} ${note}`:label;
    });

  const devicesBlock="#Dispositivos: "+(devices.length?devices.join(" / "):"-");

  // --- Nursing data / DDE block ---
  const nursingPeriod=Number(d.nursing_period)||24;
  const nursingRaw=(d.nursing_aux_text||"").trim();
  const ddeBlock=`#DDE (${nursingPeriod}h): ${nursingRaw||"-"}`;

  // --- Final evolution block ---
  const evolutionBlock="#Evolução: "+narrative.join(" ");

  document.getElementById("evolutionText").value=
    hdBlock+"\n\n"+
    devicesBlock+"\n\n"+
    ddeBlock+"\n\n"+
    evolutionBlock;

  document.getElementById("sofaResult").innerHTML=
    `SOFA = <strong>${a.sofa.total}</strong> — respiratório ${a.sofa.parts.resp}, coagulação ${a.sofa.parts.coag}, hepático ${a.sofa.parts.liver}, cardiovascular ${a.sofa.parts.cardio}, neurológico ${a.sofa.parts.cns}, renal ${a.sofa.parts.renal}.`;

  updateChecklist();
  document.querySelector('[data-panel="evolution"]').click();
}

async function copyEvolution(){
  const text=document.getElementById("evolutionText").value;
  try{await navigator.clipboard.writeText(text);alert("Evolução copiada.");}
  catch{
    const el=document.getElementById("evolutionText");el.select();document.execCommand("copy");alert("Evolução copiada.");
  }
}


function buildPhysicalExamSuggestion(){
  const d=getData();

  const sbp=num(d,"sbp");
  const dbp=num(d,"dbp");
  const hr=num(d,"hr");
  const rr=num(d,"rr");
  const spo2=num(d,"spo2");
  const fio2=num(d,"fio2");
  const gcs=num(d,"gcs");

  const generalState={
    comprometido:"comprometido",
    grave:"grave",
    "gravíssimo":"gravíssimo"
  }[d.severity]||"regular";

  let acv="ACV: RCR em 2T, BNF, s/sopros.";
  const acvExtras=[];
  if(hr!==null)acvExtras.push(`FC ${hr} bpm`);
  if(sbp!==null && dbp!==null)acvExtras.push(`PA ${sbp}x${dbp} mmHg`);
  if(acvExtras.length)acv+=" "+acvExtras.join(". ")+".";

  let ar="AR: MV+ em AHT, sem RA.";
  const respExtras=[];
  if(rr!==null)respExtras.push(`FR ${rr} irpm`);
  if(spo2!==null)respExtras.push(`SpO2 ${spo2}%`);
  if(fio2!==null)respExtras.push(`FiO2 ${fio2}%`);
  if(respExtras.length)ar+=" "+respExtras.join(", ")+".";

  const neu=`NEU: ECG ${gcs!==null?gcs:15}, PIFR+.`;

  return [
    "#Ao exame:",
    `Estado geral ${generalState}, consciente e orientado, anictérico, acianótico, afebril, normocorado.`,
    acv,
    ar,
    "ABD: flácido, depressível, indolor à palpação. RHA+.",
    "EXT: TEC<3s, sem edemas.",
    neu
  ].join("\n");
}

function updatePhysicalExamSuggestion(){
  const box=document.getElementById("physicalExamTemplate");
  if(!box)return;
  box.value=buildPhysicalExamSuggestion();
}


function appendPhysicalExam(){
  const evo=document.getElementById("evolutionText");
  const exam=document.getElementById("physicalExamTemplate").value.trim();
  evo.value=(evo.value.trim()+"\n"+exam).trim();
}

function openScores(){
  document.getElementById("patientView").classList.add("hidden");
  document.getElementById("scoresView").classList.remove("hidden");
}

function closeScores(){
  document.getElementById("scoresView").classList.add("hidden");
  document.getElementById("patientView").classList.remove("hidden");
}

function calcNEWS2(){
  const rr=Number(document.getElementById("n_rr").value);
  const sp=Number(document.getElementById("n_spo2").value);
  const temp=Number(document.getElementById("n_temp").value);
  const sbp=Number(document.getElementById("n_sbp").value);
  const hr=Number(document.getElementById("n_hr").value);
  let s=0;
  s+=rr<=8?3:rr<=11?1:rr<=20?0:rr<=24?2:3;
  s+=sp<=91?3:sp<=93?2:sp<=95?1:0;
  s+=Number(document.getElementById("n_o2").value);
  s+=temp<=35?3:temp<=36?1:temp<=38?0:temp<=39?1:2;
  s+=sbp<=90?3:sbp<=100?2:sbp<=110?1:sbp<=219?0:3;
  s+=hr<=40?3:hr<=50?1:hr<=90?0:hr<=110?1:hr<=130?2:3;
  s+=Number(document.getElementById("n_con").value);
  document.getElementById("newsResult").innerHTML=`NEWS2 = <strong>${s}</strong>.`;
}

setup();
updateSidebarLabels();
