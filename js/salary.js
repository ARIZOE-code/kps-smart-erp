// ==========================================================
// KPS Smart ERP — Salary Management Logic
// ==========================================================

let allEmployeesForSalary = [];
let paidThisMonthMap = {};
let currentSalaryMonth = '';

function loadEmployeesForSalary(){
  db.collection('employees').where('status','==','active').onSnapshot(snap=>{
    allEmployeesForSalary = snap.docs.map(d=>({id:d.id, ...d.data()}));
    if(currentSalaryMonth) renderSalaryList();
  });
}

async function loadSalaryMonth(){
  const month = document.getElementById('sal_month').value;
  if(!month){ alert('पहले महीना चुनो।'); return; }
  currentSalaryMonth = month;

  const snap = await db.collection('salaryPayments').where('month','==',month).get();
  paidThisMonthMap = {};
  snap.docs.forEach(d => {
    const data = d.data();
    paidThisMonthMap[data.empRef] = data;
  });

  renderSalaryList();
}

function renderSalaryList(){
  const wrap = document.getElementById('salaryList');
  if(!wrap) return;

  if(allEmployeesForSalary.length === 0){
    wrap.innerHTML = `<p style="color:var(--muted);padding:16px;">कोई सक्रिय कर्मचारी नहीं मिला। पहले Employee Management से जोड़ो।</p>`;
    return;
  }

  const totalSalary = allEmployeesForSalary.reduce((sum,e)=> sum + (e.monthlySalary||0), 0);
  const paidCount = allEmployeesForSalary.filter(e => paidThisMonthMap[e.id]).length;
  const paidAmount = allEmployeesForSalary
    .filter(e => paidThisMonthMap[e.id])
    .reduce((sum,e)=> sum + (e.monthlySalary||0), 0);

  document.getElementById('salTotalCount').textContent = allEmployeesForSalary.length;
  document.getElementById('salPaidCount').textContent = paidCount;
  document.getElementById('salPendingAmount').textContent = '₹' + (totalSalary - paidAmount).toLocaleString('en-IN');

  wrap.innerHTML = allEmployeesForSalary.map(e => {
    const paid = paidThisMonthMap[e.id];
    return `
      <div class="salary-card glass">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="avatar-chip">${(e.name||'?').charAt(0)}</div>
          <div>
            <div style="font-weight:600;">${e.name}</div>
            <div class="id-tag">${e.designation} · ₹${e.monthlySalary || 0}/माह</div>
          </div>
        </div>
        <div style="text-align:left;">
          ${paid
            ? `<span class="status-chip active">भुगतान हुआ ✓</span><div class="id-tag" style="margin-top:4px;">${paid.paidDate} · ${paid.paymentMode}</div>`
            : `<button class="btn btn-gold btn-sm" onclick="openSalaryPayModal('${e.id}')">वेतन भुगतान करें</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

// ---------- Pay modal ----------
window.openSalaryPayModal = function(empId){
  const emp = allEmployeesForSalary.find(e => e.id === empId);
  if(!emp) return;
  document.getElementById('paySalaryEmpId').value = empId;
  document.getElementById('paySalaryEmpName').textContent = emp.name;
  document.getElementById('paySalaryAmount').value = emp.monthlySalary || 0;
  document.getElementById('salaryPayModal').classList.add('open');
};

function closeSalaryPayModal(){
  document.getElementById('salaryPayModal').classList.remove('open');
}
document.getElementById('salModalCloseBtn')?.addEventListener('click', closeSalaryPayModal);
document.getElementById('salModalOverlay')?.addEventListener('click', (e)=>{
  if(e.target.id === 'salModalOverlay') closeSalaryPayModal();
});

const salaryPayForm = document.getElementById('salaryPayForm');
if(salaryPayForm){
  salaryPayForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const empId = document.getElementById('paySalaryEmpId').value;
    const emp = allEmployeesForSalary.find(x => x.id === empId);
    if(!emp) return;

    const submitBtn = salaryPayForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'सेव हो रहा है...';

    const record = {
      empRef: empId,
      empName: emp.name,
      designation: emp.designation,
      month: currentSalaryMonth,
      amount: parseFloat(document.getElementById('paySalaryAmount').value) || 0,
      paymentMode: document.getElementById('paySalaryMode').value,
      paidDate: new Date().toISOString().slice(0,10),
      paidBy: sessionStorage.getItem('kps_name') || 'Admin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try{
      await db.collection('salaryPayments').doc(`${empId}_${currentSalaryMonth}`).set(record);
      closeSalaryPayModal();
      loadSalaryMonth();
    } catch(err){
      alert('सेव नहीं हो पाया: ' + err.message);
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'भुगतान दर्ज करें →';
  });
}
