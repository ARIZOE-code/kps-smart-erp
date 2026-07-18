// ==========================================================
// KPS Smart ERP — Employee Management Logic
// ==========================================================

let allEmployees = [];
let editingEmpId = null;

function generateEmpId(){
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KPS-EMP-${year}-${rand}`;
}

function renderEmployees(list){
  const tbody = document.getElementById('employeesTbody');
  const emptyState = document.getElementById('empEmptyState');
  if(!tbody) return;

  if(list.length === 0){
    tbody.innerHTML = '';
    if(emptyState) emptyState.style.display = 'block';
    return;
  }
  if(emptyState) emptyState.style.display = 'none';

  tbody.innerHTML = list.map(e => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="avatar-chip">${(e.name||'?').charAt(0)}</div>
          <div>
            <div style="font-weight:600;">${e.name}</div>
            <div class="id-tag">${e.empId}</div>
          </div>
        </div>
      </td>
      <td><span class="role-badge">${e.designation}</span></td>
      <td>${e.mobile || '—'}</td>
      <td>₹${e.monthlySalary || 0}</td>
      <td><span class="status-chip ${e.status === 'inactive' ? 'inactive' : 'active'}">${e.status === 'inactive' ? 'निष्क्रिय' : 'सक्रिय'}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="openEditEmpModal('${e.id}')">एडिट</button>
          <button class="btn btn-danger btn-sm" onclick="toggleEmpStatus('${e.id}','${e.status || 'active'}')">${e.status === 'inactive' ? 'सक्रिय करें' : 'निष्क्रिय करें'}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function applyEmpFilters(){
  const search = (document.getElementById('empSearchInput')?.value || '').toLowerCase();
  const desigFilter = document.getElementById('desigFilter')?.value || '';

  let filtered = allEmployees.filter(e => {
    const matchSearch = !search ||
      (e.name || '').toLowerCase().includes(search) ||
      (e.empId || '').toLowerCase().includes(search);
    const matchDesig = !desigFilter || e.designation === desigFilter;
    return matchSearch && matchDesig;
  });

  document.getElementById('empTotalCount').textContent = allEmployees.length;
  renderEmployees(filtered);
}

function loadEmployees(){
  db.collection('employees').orderBy('createdAt','desc').onSnapshot(snap=>{
    allEmployees = snap.docs.map(d=>({id:d.id, ...d.data()}));
    applyEmpFilters();
  }, err=>{
    console.error(err);
    const tbody = document.getElementById('employeesTbody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:24px;">डेटा लोड नहीं हो पाया।</td></tr>`;
  });
}

document.getElementById('empSearchInput')?.addEventListener('input', applyEmpFilters);
document.getElementById('desigFilter')?.addEventListener('change', applyEmpFilters);

function openAddEmpModal(){
  editingEmpId = null;
  document.getElementById('empModalTitle').textContent = 'नया कर्मचारी जोड़ें';
  document.getElementById('employeeForm').reset();
  document.getElementById('employeeModal').classList.add('open');
}

window.openEditEmpModal = function(id){
  const e = allEmployees.find(x => x.id === id);
  if(!e) return;
  editingEmpId = id;
  document.getElementById('empModalTitle').textContent = 'कर्मचारी प्रोफाइल एडिट करें';
  document.getElementById('e_name').value = e.name || '';
  document.getElementById('e_designation').value = e.designation || '';
  document.getElementById('e_mobile').value = e.mobile || '';
  document.getElementById('e_salary').value = e.monthlySalary || '';
  document.getElementById('e_joinDate').value = e.joinDate || '';
  document.getElementById('employeeModal').classList.add('open');
};

function closeEmpModal(){
  document.getElementById('employeeModal').classList.remove('open');
}
document.getElementById('empModalCloseBtn')?.addEventListener('click', closeEmpModal);
document.getElementById('empModalOverlay')?.addEventListener('click', (e)=>{
  if(e.target.id === 'empModalOverlay') closeEmpModal();
});

const employeeForm = document.getElementById('employeeForm');
if(employeeForm){
  employeeForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const submitBtn = employeeForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'सेव हो रहा है...';

    const data = {
      name: document.getElementById('e_name').value.trim(),
      designation: document.getElementById('e_designation').value,
      mobile: document.getElementById('e_mobile').value.trim(),
      monthlySalary: parseFloat(document.getElementById('e_salary').value) || 0,
      joinDate: document.getElementById('e_joinDate').value,
      status: 'active'
    };

    try{
      if(editingEmpId){
        await db.collection('employees').doc(editingEmpId).update(data);
      } else {
        data.empId = generateEmpId();
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('employees').add(data);
      }
      closeEmpModal();
    } catch(err){
      alert('सेव नहीं हो पाया: ' + err.message);
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'सेव करें →';
  });
}

window.toggleEmpStatus = async function(id, currentStatus){
  const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
  if(!confirm(newStatus === 'inactive' ? 'इस कर्मचारी को निष्क्रिय करना है?' : 'दोबारा सक्रिय करना है?')) return;
  try{
    await db.collection('employees').doc(id).update({ status: newStatus });
  } catch(err){
    alert('अपडेट नहीं हो पाया: ' + err.message);
  }
};
