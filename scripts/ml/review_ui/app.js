"use strict";
const $ = id => document.getElementById(id);
const roomNames = {bedroom:"Phòng ngủ",bathroom:"Phòng tắm",hallway:"Hành lang"};
const actionNames = {pending:"Chưa duyệt",keep:"Đã giữ",reject:"Đã loại",replace:"Cần thay"};
let data, selectedId, busy = false, visible = [];
const reasons = {
  small_image:"Ảnh có cạnh ngắn dưới ngưỡng audit",
  possible_monochrome_line_drawing:"Có thể là bản vẽ nét đen trắng · cần xem ảnh",
  possible_sensitive_content_metadata:"Metadata có dấu hiệu nội dung nhạy cảm · cần xem xét",
  license_metadata_needs_review:"Thiếu hoặc không khớp metadata giấy phép · chưa đủ điều kiện vào bộ cuối",
  unreadable_or_corrupt_image:"Không đọc được ảnh / ảnh lỗi",
  sha256_mismatch:"SHA-256 không khớp manifest gốc",
  dimensions_mismatch:"Kích thước không khớp manifest",
  invalid_manifest_dhash:"dHash trong manifest không hợp lệ",
  duplicate_or_near_duplicate_candidate:"Ứng viên trùng hoặc gần trùng · xem chi tiết audit.json"
};
function describe(reason){
  if(reasons[reason]) return reasons[reason];
  if(reason.startsWith("category_keyword:")) return "Category chứa từ khóa cần xem: "+reason.split(":").slice(1).join(":");
  if(reason.startsWith("non_residential_or_staged_candidate:")) return "Có thể là cảnh ngoài phạm vi nhà ở: "+reason.split(":").slice(1).join(":");
  return reason;
}
function message(text,error=false){$("message").textContent=text;$("message").className=error?"error":"";}
function renderSummary(){
  $("summary").replaceChildren();
  Object.entries(data.summary.rooms).forEach(([room,s])=>{
    const box=document.createElement("div");box.className="stat";
    const title=document.createElement("strong");title.textContent=`${roomNames[room] || room} · ${s.keep}/${s.target} giữ`;
    const p=document.createElement("p");p.textContent=`Chờ ${s.pending} · Loại ${s.reject} · Cần thay ${s.replace}`;
    const more=document.createElement("p");more.textContent=`Ứng viên qua file/hash/license: ${s.eligible_candidates}. Tối thiểu cần bù theo quyết định: ${s.minimum_replacements_after_decisions}.`;
    box.append(title,p,more);$("summary").append(box);
  });
}
function refilter(){
  const room=$("room").value,status=$("status").value,flag=$("flag").value;
  visible=data.items.filter(item=>(room==="all"||item.room===room)&&(status==="all"||(item.review?.decision||"pending")===status)&&(flag==="all"||(flag==="flagged")===item.audit.suggested_review));
  visible.sort((a,b)=>Number(b.audit.suggested_review)-Number(a.audit.suggested_review)||Number(b.audit.possible_sensitive_content)-Number(a.audit.possible_sensitive_content)||a.image_id.localeCompare(b.image_id));
  if(!visible.some(item=>item.image_id===selectedId))selectedId=visible[0]?.image_id;
  render();
}
function render(){
  renderSummary();
  const index=visible.findIndex(item=>item.image_id===selectedId),item=visible[index];
  $("workspace").hidden=!item;$("empty").hidden=Boolean(item);
  if(!item)return;
  $("position").textContent=`${index+1} / ${visible.length} trong bộ lọc`;
  $("image-id").textContent=item.image_id;$("decision").textContent=actionNames[item.review?.decision||"pending"];
  $("title").textContent=item.title||item.file;
  $("dimensions").textContent=`${roomNames[item.room]||item.room} · ${item.audit.width||"?"} × ${item.audit.height||"?"} px`;
  $("note").value=item.review?.note||"";
  $("reasons").replaceChildren();
  const list=item.audit.reasons.length?item.audit.reasons:["Không có cảnh báo tự động. Vẫn cần kiểm tra cảnh và giấy phép."];
  list.forEach(reason=>{const li=document.createElement("li");li.textContent=describe(reason);$("reasons").append(li);});
  $("metadata").replaceChildren();
  [["Category",item.category_discovered],["License",item.license_short],["License URL",item.license_url||"Trống — cần xác minh"],["Author",item.author],["Attribution",item.attribution||"Trống trong manifest"],["Mô tả nguồn",item.source_description],["Đã duyệt bởi",item.review?`${item.review.reviewer} · ${item.review.at}`:"Chưa có"]].forEach(([label,value])=>{
    const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=label;dd.textContent=value;$("metadata").append(dt,dd);
  });
  try{const source=new URL(item.source_page);if(!["https:","http:"].includes(source.protocol))throw Error();$("source").href=source.href;$("source").hidden=false;}catch{$("source").removeAttribute("href");$("source").hidden=true;}
  $("photo").removeAttribute("src");$("photo").hidden=item.audit.conceal_by_default;
  $("conceal").hidden=!item.audit.conceal_by_default;
  if(!item.audit.conceal_by_default)$("photo").src="/image?id="+encodeURIComponent(item.image_id);
}
$("reveal").onclick=()=>{$("conceal").hidden=true;$("photo").hidden=false;$("photo").src="/image?id="+encodeURIComponent(selectedId);};
$("photo").onerror=()=>message("Không đọc được ảnh. Bạn có thể ghi chú và chọn Loại/Cần thay.",true);
function move(delta){if(busy||!visible.length)return;let i=visible.findIndex(item=>item.image_id===selectedId);selectedId=visible[(i+delta+visible.length)%visible.length].image_id;render();}
$("prev").onclick=()=>move(-1);$("next").onclick=()=>move(1);
["room","status","flag"].forEach(id=>$(id).onchange=()=>{if(!busy)refilter();});
async function load(){
  if(busy)return;
  try{const response=await fetch("/api/state");const body=await response.json();if(!response.ok)throw Error(body.error);data=body;refilter();message("Sẵn sàng. Ảnh có cảnh báo được xếp trước. K = Giữ, X = Loại, T = Cần thay.");}
  catch(error){message("Không tải được: "+error.message,true);}
}
async function save(action){
  if(busy||!selectedId)return;
  const reviewer=$("reviewer").value.trim();if(!reviewer){message("Nhập tên người duyệt trước khi lưu.",true);$("reviewer").focus();return;}
  if(action==="keep"&&($("photo").hidden||!$("photo").complete||!$("photo").naturalWidth)){message("Hãy hiển thị và xem ảnh trước khi chọn Giữ.",true);return;}
  const currentId=selectedId,index=visible.findIndex(item=>item.image_id===currentId),nextId=visible[index+1]?.image_id;
  busy=true;document.querySelectorAll("button,select").forEach(button=>button.disabled=true);message("Đang lưu…");
  try{
    const response=await fetch("/api/decision",{method:"POST",headers:{"Content-Type":"application/json","X-Review-Token":data.token},body:JSON.stringify({revision:data.revision,image_id:currentId,decision:action,reviewer,note:$("note").value})});
    const result=await response.json();if(!response.ok)throw Error(result.error);
    data.revision=result.revision;data.summary=result.summary;data.items.find(item=>item.image_id===currentId).review=result.decision;
    selectedId=nextId||currentId;refilter();message(`Đã lưu ${currentId}: ${actionNames[action]}. Manifest làm việc đã cập nhật.`);
  }catch(error){message("Chưa lưu thành công: "+error.message+". Bấm Nạp lại nếu có xung đột.",true);}
  finally{busy=false;document.querySelectorAll("button,select").forEach(button=>button.disabled=false);}
}
["keep","reject","replace"].forEach(action=>$(action).onclick=()=>save(action));$("reset").onclick=()=>save("pending");$("reload").onclick=load;
document.addEventListener("keydown",event=>{if(event.ctrlKey||event.altKey||event.metaKey||["INPUT","TEXTAREA","SELECT","BUTTON"].includes(event.target.tagName))return;const action={k:"keep",x:"reject",t:"replace"}[event.key.toLowerCase()];if(action){event.preventDefault();save(action);}if(event.key==="ArrowRight")move(1);if(event.key==="ArrowLeft")move(-1);});
load();
