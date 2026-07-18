// ==========================================================
// KPS Smart ERP — Fee Management Logic
// ==========================================================

let allStudentsForFee = [];
let selectedStudent = null;
let allPayments = [];

function generateReceiptNo(){
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `KPS-RCPT-${year}-${rand}`;
}

function todayStr(){
  return new Date().toISOString().slice(0,10); // YYYY-MM-DD
}
function currentMonthPrefix(){
  return new Date().toISOString().slice(0,7); // YYYY-MM
}

// ---------- Sub-tab switching ----------
document.querySelectorAll('.subtab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.subtab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.getAttribute('data-target');
    document.querySelectorAll('.subtab-panel').forEach(p=>{
      p.classList.toggle('active', p.id === target);
    });
    if(target === 'panelPending') computePendingFees();
    if(target === 'panelDaily') computeDailyCollection();
  });
});

// ---------- Load students (for search) ----------
function loadStudentsForFee(){
  db.collection('students').where('status','==','active').onSnapshot(snap=>{
    allStudentsForFee = snap.docs.map(d=>({id:d.id, ...d.data()}));
  });
}

// ---------- Student search box ----------
const studentSearchInput = document.getElementById('studentSearchInput');
if(studentSearchInput){
  studentSearchInput.addEventListener('input', ()=>{
    const q = studentSearchInput.value.trim().toLowerCase();
    const resultsBox = document.getElementById('searchResults');
    if(!q){ resultsBox.classList.remove('show'); return; }

    const matches = allStudentsForFee.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.studentId || '').toLowerCase().includes(q) ||
      String(s.rollNumber || '').includes(q)
    ).slice(0, 8);

    if(matches.length === 0){
      resultsBox.innerHTML = `<div class="search-result-item" style="color:var(--muted);">कोई छात्र नहीं मिला</div>`;
    } else {
      resultsBox.innerHTML = matches.map(s => `
        <div class="search-result-item" data-id="${s.id}">
          <div class="avatar-chip" style="width:30px;height:30px;font-size:0.75rem;">${(s.name||'?').charAt(0)}</div>
          <div>
            <div style="font-size:0.86rem;font-weight:600;">${s.name}</div>
            <div class="id-tag">कक्षा ${s.className}-${s.section} · रोल ${s.rollNumber}</div>
          </div>
        </div>
      `).join('');
    }
    resultsBox.classList.add('show');

    resultsBox.querySelectorAll('.search-result-item[data-id]').forEach(item=>{
      item.addEventListener('click', ()=>{
        const id = item.getAttribute('data-id');
        selectedStudent = allStudentsForFee.find(s => s.id === id);
        showSelectedStudent();
        resultsBox.classList.remove('show');
        studentSearchInput.value = '';
      });
    });
  });
}

function showSelectedStudent(){
  const card = document.getElementById('selectedStudentCard');
  if(!card || !selectedStudent) return;
  card.innerHTML = `
    <div class="avatar-chip">${(selectedStudent.name||'?').charAt(0)}</div>
    <div>
      <div style="font-weight:600;">${selectedStudent.name}</div>
      <div class="id-tag">${selectedStudent.studentId} · कक्षा ${selectedStudent.className}-${selectedStudent.section} · रोल ${selectedStudent.rollNumber}</div>
    </div>
    <button type="button" class="btn btn-ghost btn-sm" style="margin-right:auto;" onclick="clearSelectedStudent()">बदलें</button>
  `;
  card.classList.add('show');
}
window.clearSelectedStudent = function(){
  selectedStudent = null;
  document.getElementById('selectedStudentCard').classList.remove('show');
};

// ---------- Fee collection form ----------
const feeForm = document.getElementById('feeForm');
if(feeForm){
  feeForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!selectedStudent){
      alert('पहले छात्र चुनो।');
      return;
    }
    const submitBtn = feeForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'दर्ज हो रहा है...';

    const record = {
      studentRef: selectedStudent.id,
      studentName: selectedStudent.name,
      studentClass: selectedStudent.className,
      studentSection: selectedStudent.section,
      studentIdCode: selectedStudent.studentId,
      feeType: document.getElementById('f_feeType').value,
      amount: parseFloat(document.getElementById('f_amount').value) || 0,
      paymentMode: document.getElementById('f_mode').value,
      receiptNo: generateReceiptNo(),
      date: todayStr(),
      collectedBy: sessionStorage.getItem('kps_name') || 'Admin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try{
      const docRef = await db.collection('payments').add(record);
      showReceipt({ ...record, id: docRef.id });
      feeForm.reset();
      clearSelectedStudent();
    } catch(err){
      alert('सेव नहीं हो पाया: ' + err.message);
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'शुल्क दर्ज करें →';
  });
}

// ---------- Receipt preview + print ----------
function showReceipt(r){
  const box = document.getElementById('receiptBox');
  if(!box) return;
  box.innerHTML = `
    <div class="receipt-preview" id="printArea">
      <h3>KPS Smart ERP — शुल्क रसीद</h3>
      <div class="school-sub">Kamla Public School, Naini</div>
      <div class="receipt-row"><span>रसीद नंबर</span><span class="mono">${r.receiptNo}</span></div>
      <div class="receipt-row"><span>छात्र</span><span>${r.studentName}</span></div>
      <div class="receipt-row"><span>कक्षा</span><span>${r.studentClass}-${r.studentSection}</span></div>
      <div class="receipt-row"><span>शुल्क प्रकार</span><span>${r.feeType}</span></div>
      <div class="receipt-row"><span>भुगतान माध्यम</span><span>${r.paymentMode}</span></div>
      <div class="receipt-row"><span>तारीख</span><span class="mono">${r.date}</span></div>
      <div class="receipt-row"><span>वसूला गया द्वारा</span><span>${r.collectedBy}</span></div>
      <div class="receipt-row total"><span>कुल राशि</span><span>₹${r.amount}</span></div>
    </div>
    <div style="text-align:center;margin-top:16px;">
      <button class="btn btn-royal btn-sm" onclick="window.print()">🖨️ प्रिंट करें</button>
    </div>
  `;
  box.style.display = 'block';
  box.scrollIntoView({behavior:'smooth', block:'center'});
}

// ---------- Receipts list ----------
function loadPayments(){
  db.collection('payments').orderBy('createdAt','desc').limit(100).onSnapshot(snap=>{
    allPayments = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderReceiptsList(allPayments);
  }, err=>{
    console.error(err);
  });
}

function renderReceiptsList(list){
  const tbody = document.getElementById('receiptsTbody');
  if(!tbody) return;
  if(list.length === 0){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted);">अभी तक कोई रसीद नहीं बनी।</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(r => `
    <tr>
      <td class="id-tag">${r.receiptNo}</td>
      <td>${r.studentName}<br><span class="id-tag">कक्षा ${r.studentClass}-${r.studentSection}</span></td>
      <td>${r.feeType}</td>
      <td>₹${r.amount}</td>
      <td class="mono">${r.date}</td>
      <td><button class="btn btn-ghost btn-sm" onclick='showReceipt(${JSON.stringify(r).replace(/'/g,"&apos;")})'>देखें</button></td>
    </tr>
  `).join('');
}

const receiptSearchInput = document.getElementById('receiptSearchInput');
if(receiptSearchInput){
  receiptSearchInput.addEventListener('input', ()=>{
    const q = receiptSearchInput.value.trim().toLowerCase();
    const filtered = allPayments.filter(r =>
      (r.studentName||'').toLowerCase().includes(q) ||
      (r.receiptNo||'').toLowerCase().includes(q)
    );
    renderReceiptsList(filtered);
  });
}

// ---------- Pending fees (simplified: monthly fee not paid this month) ----------
function computePendingFees(){
  const tbody = document.getElementById('pendingTbody');
  if(!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted);">लोड हो रहा है...</td></tr>`;

  const monthPrefix = currentMonthPrefix();
  const paidThisMonth = new Set(
    allPayments
      .filter(p => p.feeType === 'Monthly Fee' && (p.date || '').startsWith(monthPrefix))
      .map(p => p.studentRef)
  );

  const pendingList = allStudentsForFee.filter(s => !paidThisMonth.has(s.id));

  if(pendingList.length === 0){
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--success);">इस महीने सबका मासिक शुल्क जमा हो चुका है ✓</td></tr>`;
    return;
  }

  tbody.innerHTML = pendingList.map(s => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="avatar-chip">${(s.name||'?').charAt(0)}</div>
          <div>${s.name}<br><span class="id-tag">${s.studentId}</span></div>
        </div>
      </td>
      <td>कक्षा ${s.className}-${s.section}</td>
      <td><span class="status-chip inactive">मासिक शुल्क बकाया</span></td>
      <td><button class="btn btn-gold btn-sm" onclick="quickCollectFor('${s.id}')">शुल्क वसूलें</button></td>
    </tr>
  `).join('');
}

window.quickCollectFor = function(id){
  selectedStudent = allStudentsForFee.find(s => s.id === id);
  document.querySelectorAll('.subtab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('[data-target="panelCollect"]').classList.add('active');
  document.querySelectorAll('.subtab-panel').forEach(p=>p.classList.toggle('active', p.id === 'panelCollect'));
  showSelectedStudent();
  document.getElementById('f_feeType').value = 'Monthly Fee';
  window.scrollTo({top:0, behavior:'smooth'});
};

// ---------- Daily collection ----------
function computeDailyCollection(){
  const today = todayStr();
  const todayPayments = allPayments.filter(p => p.date === today);
  const total = todayPayments.reduce((sum,p) => sum + (p.amount||0), 0);

  document.getElementById('dailyTotal').textContent = '₹' + total.toLocaleString('en-IN');
  document.getElementById('dailyCount').textContent = todayPayments.length;

  const tbody = document.getElementById('dailyTbody');
  if(!tbody) return;
  if(todayPayments.length === 0){
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted);">आज अभी तक कोई शुल्क जमा नहीं हुआ।</td></tr>`;
    return;
  }
  tbody.innerHTML = todayPayments.map(r => `
    <tr>
      <td>${r.studentName}</td>
      <td>${r.feeType}</td>
      <td>₹${r.amount}</td>
      <td>${r.paymentMode}</td>
    </tr>
  `).join('');
}
