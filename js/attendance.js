// ==========================================================
// KPS Smart ERP — Attendance Logic (Students)
// ==========================================================

let rosterStudents = [];
let attendanceState = {}; // { studentId: 'present' | 'absent' | 'leave' }

function attDocId(date, cls, section){
  return `${date}_${cls}_${section}`;
}

// ---------- Load roster for selected class/section ----------
async function loadRoster(){
  const cls = document.getElementById('att_class').value;
  const section = document.getElementById('att_section').value;
  const date = document.getElementById('att_date').value;

  if(!cls || !section || !date){
    document.getElementById('rollListWrap').style.display = 'none';
    return;
  }

  const snap = await db.collection('students')
    .where('className','==',cls)
    .where('section','==',section)
    .where('status','==','active')
    .get();

  rosterStudents = snap.docs.map(d => ({id:d.id, ...d.data()}));
  attendanceState = {};

  // check if attendance already marked for this date -> prefill
  const existing = await db.collection('attendance').doc(attDocId(date, cls, section)).get();
  const existingRecords = existing.exists ? (existing.data().records || {}) : {};

  rosterStudents.forEach(s => {
    attendanceState[s.id] = existingRecords[s.id] || 'present';
  });

  renderRoster();
}

function renderRoster(){
  const wrap = document.getElementById('rollListWrap');
  const list = document.getElementById('rollList');
  if(!list) return;

  if(rosterStudents.length === 0){
    list.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;padding:14px;">इस कक्षा-अनुभाग में कोई सक्रिय छात्र नहीं मिला।</p>`;
    wrap.style.display = 'block';
    return;
  }

  list.innerHTML = rosterStudents.map(s => `
    <div class="att-roll-item">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="avatar-chip">${(s.name||'?').charAt(0)}</div>
        <div>
          <div style="font-weight:600;font-size:0.88rem;">${s.name}</div>
          <div class="id-tag">रोल ${s.rollNumber}</div>
        </div>
      </div>
      <div class="att-status-btns" data-student="${s.id}">
        <button type="button" class="att-btn present ${attendanceState[s.id]==='present'?'active':''}" onclick="setAttStatus('${s.id}','present')">उपस्थित</button>
        <button type="button" class="att-btn absent ${attendanceState[s.id]==='absent'?'active':''}" onclick="setAttStatus('${s.id}','absent')">अनुपस्थित</button>
        <button type="button" class="att-btn leave ${attendanceState[s.id]==='leave'?'active':''}" onclick="setAttStatus('${s.id}','leave')">छुट्टी</button>
      </div>
    </div>
  `).join('');
  wrap.style.display = 'block';
}

window.setAttStatus = function(studentId, status){
  attendanceState[studentId] = status;
  const group = document.querySelector(`.att-status-btns[data-student="${studentId}"]`);
  if(!group) return;
  group.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
  group.querySelector(`.att-btn.${status}`).classList.add('active');
};

// ---------- Save attendance ----------
async function saveAttendance(){
  const cls = document.getElementById('att_class').value;
  const section = document.getElementById('att_section').value;
  const date = document.getElementById('att_date').value;
  if(!cls || !section || !date || rosterStudents.length === 0){
    alert('पहले कक्षा, अनुभाग और तारीख चुनकर सूची लोड करो।');
    return;
  }

  const saveBtn = document.getElementById('saveAttBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'सेव हो रहा है...';

  try{
    await db.collection('attendance').doc(attDocId(date, cls, section)).set({
      date, className: cls, section,
      records: attendanceState,
      markedBy: sessionStorage.getItem('kps_name') || 'Admin',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('उपस्थिति सेव हो गई ✓');
  } catch(err){
    alert('सेव नहीं हो पाया: ' + err.message);
  }
  saveBtn.disabled = false;
  saveBtn.textContent = 'उपस्थिति सेव करें →';
}

// ---------- Monthly report ----------
async function loadMonthlyReport(){
  const cls = document.getElementById('rep_class').value;
  const section = document.getElementById('rep_section').value;
  const month = document.getElementById('rep_month').value; // YYYY-MM
  const tbody = document.getElementById('reportTbody');

  if(!cls || !section || !month){
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted);">कक्षा, अनुभाग और महीना चुनो।</td></tr>`;
    return;
  }
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted);">लोड हो रहा है...</td></tr>`;

  const snap = await db.collection('attendance')
    .where('className','==',cls)
    .where('section','==',section)
    .get();

  const monthDocs = snap.docs.filter(d => (d.data().date || '').startsWith(month));

  const studentSnap = await db.collection('students')
    .where('className','==',cls).where('section','==',section).get();
  const students = studentSnap.docs.map(d => ({id:d.id, ...d.data()}));

  const totals = {}; // studentId -> {present, absent, leave}
  students.forEach(s => totals[s.id] = {present:0, absent:0, leave:0});

  monthDocs.forEach(doc => {
    const records = doc.data().records || {};
    Object.keys(records).forEach(sid => {
      if(!totals[sid]) totals[sid] = {present:0, absent:0, leave:0};
      totals[sid][records[sid]] = (totals[sid][records[sid]] || 0) + 1;
    });
  });

  const totalDays = monthDocs.length;

  if(students.length === 0){
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted);">इस कक्षा-अनुभाग में छात्र नहीं मिले।</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => {
    const t = totals[s.id] || {present:0, absent:0, leave:0};
    const pct = totalDays > 0 ? Math.round((t.present / totalDays) * 100) : 0;
    const barClass = pct >= 75 ? '' : (pct >= 50 ? 'mid' : 'low');
    return `
      <tr>
        <td>${s.name}<br><span class="id-tag">रोल ${s.rollNumber}</span></td>
        <td>${t.present} उपस्थित / ${t.absent} अनुपस्थित / ${t.leave} छुट्टी</td>
        <td class="mono">${pct}%</td>
        <td><div class="att-percent-bar"><div class="att-percent-fill ${barClass}" style="width:${pct}%;"></div></div></td>
      </tr>
    `;
  }).join('');
}
