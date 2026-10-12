import React from 'react';

const str = value => typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
const esc = value => str(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const columns = {
  confirmedRequirements: [['item','需求'],['evidence','客户依据'],['acceptance','验收建议']],
  compatibilityMatrix: [['module','模块'],['current','当前'],['proposed','目标'],['verification','待验证']],
  milestones: [['stage','阶段'],['result','产出'],['gate','验收门槛']]
};
const names = [['confirmedRequirements','已确认需求'],['compatibilityMatrix','技术兼容矩阵'],['deliverables','交付物'],['outOfScope','不在范围内'],['milestones','阶段验收'],['risks','风险'],['commercialTerms','合作边界'],['openQuestions','待确认事项']];
const decisionColumns=[['label','决策'],['status','状态'],['value','客户答复'],['evidence','原话证据']];
const dayColumns=[['day','工作日'],['goal','阶段目标'],['aiTasks','AI辅助'],['humanGate','人工验收']];
const decisionStatus = value => value === 'confirmed' ? '已确认' : value === 'partial' ? '待补充' : '未回答';
const htmlTable = (rows, cols) => '<table><tr>'+cols.map(c=>'<th>'+esc(c[1])+'</th>').join('')+'</tr>'+(rows||[]).map(x=>'<tr>'+cols.map(c=>'<td>'+esc(x?.[c[0]])+'</td>').join('')+'</tr>').join('')+'</table>';
export function printProjectReport(report) {
 const sections = '<h2>六项关键交付决策</h2><p>只有客户原话可验证且回答完整的决策才标记已确认；不代表技术已实施验收。</p>'+
 htmlTable((report.decisionChecklist||[]).map(x=>({...x,status:decisionStatus(x.status)})),decisionColumns) +
 names.map(([key,name])=>'<h2>'+name+'</h2>'+(columns[key]?htmlTable(report[key],columns[key]):'<ul>'+(report[key]||[]).map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>')).join('') +
 '<h2>实施计划（需验证后确认）</h2>'+htmlTable(report.implementationPlan||[],dayColumns);
 const html='<!doctype html><html><head><meta charset="utf-8"><title>软件项目需求与技术评估初稿</title><style>body{font-family:-apple-system,"PingFang SC",sans-serif;color:#172338;line-height:1.6;padding:30px}h1{font-size:22px}h2{font-size:16px;margin-top:22px}p,td,th,li{font-size:12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bcc8d4;padding:7px;text-align:left;vertical-align:top}th{background:#f3f6f9}@page{size:A4;margin:16mm}</style></head><body><h1>软件项目需求与技术评估初稿</h1><p>未经双方确认，不作为正式交付、工期或报价承诺。</p><p>'+esc(report.summary)+'</p>'+sections+'<h2>估算状态</h2><p>'+esc(report.estimate?.confidence)+' · '+esc(report.estimate?.duration||'工期待验证')+'</p></body></html>';
 const frame=document.createElement('iframe');frame.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0';document.body.appendChild(frame);
 const d=frame.contentDocument; if(!d){frame.remove();return;}d.open();d.write(html);d.close();
 frame.onload=()=>setTimeout(()=>{try{frame.contentWindow?.focus();frame.contentWindow?.print();}finally{setTimeout(()=>frame.remove(),1500);}},260);
}
function Section({name,children}) {return <div className="report-section-block"><h4 className="rep-sec-title">{name}</h4>{children}</div>}
function Table({rows,cols}) {return <div className="table-responsive"><table className="opp-map-table"><thead><tr>{cols.map(c=><th key={c[0]}>{c[1]}</th>)}</tr></thead><tbody>{(rows||[]).map((row,i)=><tr key={i}>{cols.map(c=><td key={c[0]}>{str(row?.[c[0]])}</td>)}</tr>)}</tbody></table></div>}
export default function ProjectDiagnosisReport({report}) {
 return <div className="report-doc-container"><div className="report-actions-row"><button className="btn-download-report" type="button" onClick={()=>printProjectReport(report)}>导出 PDF</button></div>
 <div className="report-hero-card"><h3>软件项目需求与技术评估初稿</h3><p className="report-summary-p">{report.summary}</p><p>需求完整度：{report.completeness}% · {report.acceptanceReady ? '六项需求决策已确认，仍需技术验证' : '六项关键决策未全部确认，禁止作为固定报价或工期承诺'}</p></div>
 <Section name="六项关键交付决策"><p>状态基于客户已核验的原话，不等于技术已验收。</p><Table rows={(report.decisionChecklist||[]).map(x=>({...x,status:decisionStatus(x.status)}))} cols={decisionColumns}/></Section>
 {names.map(([key,name])=><Section key={key} name={name}>{columns[key]?<Table rows={report[key]} cols={columns[key]}/>:<ul className="rep-bullet-ul">{(report[key]||[]).map((item,i)=><li key={i}>{str(item)}</li>)}</ul>}</Section>)}
 <Section name="AI 辅助实施计划（条件性）"><Table rows={report.implementationPlan||[]} cols={dayColumns}/></Section>
 <Section name="工期与估算前提"><p>{report.estimate?.confidence||'待验证'} · {report.estimate?.duration||'周期待验证'}</p><ul className="rep-bullet-ul">{(report.estimate?.conditions||[]).map((x,i)=><li key={i}>{str(x)}</li>)}</ul></Section>
 </div>;
}
