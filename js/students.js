// ==========================================================
// KPS Smart ERP — Student Management Logic
// ==========================================================

let allStudents = [];
let editingId = null;

function generateStudentId(){
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KPS-${year}-${rand}`;
}

function initials(name){
  return (name || '?').trim().charAt(0).toUpperCase();
}

// ---------- Render table ----------
function renderStudents(list){
  const tbody = document.getElementById('studentsTbody');
  const emptyState = document.getElementById('emptyState');
  if(!tbody) return;

  if(list.length === 0){
    tbody.innerHTML = '';
    if(emptyState) emptyState.style.display = 'block';
    return;
  }
  if(emptyState) emptyState.style.display = 'none';

  tbody.innerHTML = list.map(s => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="avatar-chip">${initials(s.name)}</div>
          <div>
            <div style="font-weight:600;">${s.name}</div>
            <div class="id-tag">${s.studentId}</div>
          </div>
        </div>
      </td>
      <td>कक्षा ${s.className} · ${s.section}</td>
      <td>${s.rollNumber}</td>
      <td>${s.fatherName || '—'}</td>
      <td>${s.mobile || '—'}</td>
      <td><span class="status-chip ${s.status === 'inactive' ? 'inactive' : 'active'}">${s.status === 'inactive' ? 'निष्क्रिय' : 'सक्रिय'}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${s.id}')">एडिट</button>
          <button class="btn btn-danger btn-sm" onclick="toggleStudentStatus('${s.id}','${s.status || 'active'}')">${s.status === 'inactive' ? 'सक्रिय करें' : 'निष्क्रिय करें'}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function applyFilters(){
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const classFilter = document.getElementById('classFilter')?.value || '';

  let filtered = allStudents.filter(s => {
    const matchSearch = !search ||
      (s.name || '').toLowerCase().includes(search) ||
      (s.studentId || '').toLowerCase().includes(search) ||
      String(s.rollNumber || '').includes(search);
    const matchClass = !classFilter || s.className === classFilter;
    return matchSearch && matchClass;
  });

  document.getElementById('totalCount').textContent = allStudents.length;
  document.getElementById('filteredCount').textContent = filtered.length;
  renderStudents(filtered);
}

// ---------- Load (realtime) ----------
function loadStudents(){
  db.collection('students').orderBy('createdAt', 'desc').onSnapshot(snap => {
    allStudents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    applyFilters();
  }, err => {
    console.error('Firestore error:', err);
    const tbody = document.getElementById('studentsTbody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:24px;">डेटा लोड नहीं हो पाया। Firestore rules जांचो।</td></tr>`;
  });
}

document.getElementById('searchInput')?.addEventListener('input', applyFilters);
document.getElementById('classFilter')?.addEventListener('change', applyFilters);

// ---------- Modal open/close ----------
function openAddModal(){
  editingId = null;
  document.getElementById('modalTitle').textContent = 'नया छात्र जोड़ें';
  document.getElementById('studentForm').reset();
  document.getElementById('studentModal').classList.add('open');
}

window.openEditModal = function(id){
  const s = allStudents.find(x => x.id === id);
  if(!s) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'छात्र प्रोफाइल एडिट करें';
  document.getElementById('f_name').value = s.name || '';
  document.getElementById('f_class').value = s.className || '';
  document.getElementById('f_section').value = s.section || '';
  document.getElementById('f_roll').value = s.rollNumber || '';
  document.getElementById('f_father').value = s.fatherName || '';
  document.getElementById('f_mobile').value = s.mobile || '';
  document.getElementById('f_dob').value = s.dob || '';
  document.getElementById('studentModal').classList.add('open');
};

function closeModal(){
  document.getElementById('studentModal').classList.remove('open');
}
document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
  if(e.target.id === 'modalOverlay') closeModal();
});

// ---------- Add / Update ----------
const studentForm = document.getElementById('studentForm');
if(studentForm){
  studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = studentForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'सेव हो रहा है...';

    const data = {
      name: document.getElementById('f_name').value.trim(),
      className: document.getElementById('f_class').value,
      section: document.getElementById('f_section').value,
      rollNumber: document.getElementById('f_roll').value.trim(),
      fatherName: document.getElementById('f_father').value.trim(),
      mobile: document.getElementById('f_mobile').value.trim(),
      dob: document.getElementById('f_dob').value,
      status: 'active'
    };

    try{
      if(editingId){
        await db.collection('students').doc(editingId).update(data);
      } else {
        data.studentId = generateStudentId();
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('students').add(data);
      }
      closeModal();
    } catch(err){
      console.error(err);
      alert('सेव नहीं हो पाया। दोबारा कोशिश करो। (' + err.message + ')');
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'सेव करें →';
  });
}

// ---------- Soft delete (toggle active/inactive) ----------
window.toggleStudentStatus = async function(id, currentStatus){
  const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
  if(!confirm(newStatus === 'inactive' ? 'इस छात्र को निष्क्रिय करना है?' : 'इस छात्र को दोबारा सक्रिय करना है?')) return;
  try{
    await db.collection('students').doc(id).update({ status: newStatus });
  } catch(err){
    alert('अपडेट नहीं हो पाया: ' + err.message);
  }
};
