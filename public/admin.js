import {auth,provider,signInWithPopup,signOut,onAuthStateChanged,call,$,esc,fmt} from "./shared.js";
const list=call("adminListData"),createTicket=call("adminCreateTicket"),enrollFace=call("adminEnrollFace"),setStatus=call("adminSetTicketStatus"),deleteFace=call("adminDeleteFace");
let stream=null,models=false;
const note=(id,t,b=false)=>{$(id).innerHTML=`<div class="message ${b?"error":""}">${esc(t)}</div>`;};
$("login").onclick=()=>signInWithPopup(auth,provider).catch(e=>note("authMsg",e.message,true));
$("logout").onclick=()=>signOut(auth);
onAuthStateChanged(auth,async u=>{ $("userLabel").textContent=u?.email||"未登入";$("login").classList.toggle("hidden",!!u);$("logout").classList.toggle("hidden",!u);
 if(!u){$("app").classList.add("hidden");$("authMsg").textContent="請使用已授權管理員帳戶登入。";$("authMsg").classList.remove("hidden");return;}
 try{await u.getIdToken(true);await refresh();$("app").classList.remove("hidden");$("authMsg").classList.add("hidden");}
 catch(e){$("app").classList.add("hidden");note("authMsg","帳戶未獲管理員權限或讀取失敗："+e.message,true);}
});
async function refresh(){const d=(await list()).data,v=d.visitors||{},t=d.tickets||{},logs=Object.values(d.logs||{}).sort((a,b)=>b.createdAt-a.createdAt);
 $("visitors").textContent=Object.keys(v).length;$("tickets").textContent=Object.keys(t).length;$("uses").textContent=Object.values(t).reduce((n,x)=>n+Number(x.usedCount||0),0);$("today").textContent=logs.filter(x=>x.kind==="accepted"&&new Date(x.createdAt).toDateString()===new Date().toDateString()).length;
 const names={single:"單次",multi:"多次",multi_day:"多日"};
 $("ticketRows").innerHTML=Object.values(t).sort((a,b)=>b.createdAt-a.createdAt).map(x=>`<tr><td>${esc(x.ticketId.slice(-8))}</td><td>${esc(x.visitorName)}<br>${esc(x.visitorId)}</td><td>${names[x.type]||x.type}</td><td>${x.usedCount}/${x.maxUses}</td><td>${fmt(x.validFrom)}<br>${fmt(x.validTo)}</td><td>${esc(x.status)}</td><td><button data-id="${esc(x.ticketId)}" data-status="${x.status==="active"?"disabled":"active"}">${x.status==="active"?"停用":"啟用"}</button></td></tr>`).join("")||'<tr><td colspan="7" class="empty">尚無門票</td></tr>';
 $("logRows").innerHTML=logs.map(x=>`<tr><td>${fmt(x.createdAt)}</td><td>${esc(x.kind)}</td><td>${esc(x.visitorName||x.visitorId||"—")}</td><td>${esc(x.gateId||"—")}</td><td>${esc(x.reason||"—")}</td></tr>`).join("")||'<tr><td colspan="5" class="empty">尚無紀錄</td></tr>';
}
$("refresh").onclick=()=>refresh().catch(e=>note("authMsg",e.message,true));
$("create").onclick=async()=>{try{const now=Date.now(),days=Math.max(1,Number($("days").value)||1),r=(await createTicket({visitorId:$("visitorId").value,visitorName:$("visitorName").value,type:$("type").value,maxUses:Number($("maxUses").value),validFrom:now,validTo:now+days*86400000})).data;
 $("qr").innerHTML="";new QRCode($("qr"),{text:r.token,width:220,height:220});$("qrInfo").textContent=`${r.visitorName} · ${r.type} · ${r.maxUses} 次。QR Token 只顯示一次，請立即保存。`;$("qrBox").classList.remove("hidden");note("ticketMsg","門票建立成功。");await refresh();
 }catch(e){note("ticketMsg",e.message,true);}};
$("download").onclick=()=>{const n=$("qr").querySelector("img")||$("qr").querySelector("canvas");if(!n)return;const a=document.createElement("a");a.href=n.src||n.toDataURL();a.download="park-ticket-qr.png";a.click();};
$("ticketRows").onclick=async e=>{const b=e.target.closest("button[data-id]");if(!b)return;try{await setStatus({ticketId:b.dataset.id,status:b.dataset.status});await refresh();}catch(x){note("authMsg",x.message,true);}};
async function loadModels(){try{await Promise.all(["ssdMobilenetv1","faceLandmark68Net","faceRecognitionNet"].map(n=>faceapi.nets[n].loadFromUri("https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/")));models=true;}catch(e){note("faceMsg","模型載入失敗："+e.message,true);}}loadModels();
$("faceStart").onclick=async()=>{try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});$("faceVideo").srcObject=stream;await $("faceVideo").play();$("faceEnroll").disabled=false;}catch(e){note("faceMsg",e.message,true);}};
$("faceEnroll").onclick=async()=>{try{if(!models)throw Error("模型仍在載入");if(!$("consent").checked)throw Error("請先確認已取得明確同意");const found=await faceapi.detectAllFaces($("faceVideo"),new faceapi.SsdMobilenetv1Options({minConfidence:.6})).withFaceLandmarks().withFaceDescriptors();if(found.length!==1)throw Error(found.length?"畫面必須只有一張人臉":"未偵測到人臉");await enrollFace({visitorId:$("faceId").value.trim(),descriptor:Array.from(found[0].descriptor),consent:true});note("faceMsg","人臉特徵已登記。");$("consent").checked=false;}catch(e){note("faceMsg",e.message,true);}};
window.addEventListener("beforeunload",()=>stream?.getTracks().forEach(t=>t.stop()));
$("faceDelete").onclick=async()=>{try{const id=$("faceId").value.trim();if(!id)throw Error("請輸入遊客編號");if(!confirm("確認撤回同意並刪除該遊客的人臉特徵？此操作無法復原。"))return;await deleteFace({visitorId:id});note("faceMsg","人臉特徵已刪除，並已記錄操作。");}catch(e){note("faceMsg",e.message,true);}};
