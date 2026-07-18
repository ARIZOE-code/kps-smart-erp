// ==========================================================
// KPS Smart ERP — Authentication Logic
// ==========================================================

let selectedRole = "admin";

// role chip selection (login.html)
document.querySelectorAll('.role-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.role-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedRole = chip.getAttribute('data-role');
  });
});

function showLoginError(msg){
  const el = document.getElementById('loginError');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
}
function hideLoginError(){
  const el = document.getElementById('loginError');
  if(!el) return;
  el.classList.remove('show');
}

// LOGIN FORM SUBMIT
const loginForm = document.getElementById('loginForm');
if(loginForm){
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideLoginError();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'लॉगिन हो रहा है...';

    try{
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const uid = cred.user.uid;

      // fetch role from Firestore "users" collection
      const userDoc = await db.collection('users').doc(uid).get();

      if(!userDoc.exists){
        showLoginError('यूज़र प्रोफाइल नहीं मिली। एडमिन से संपर्क करें।');
        await auth.signOut();
        submitBtn.disabled = false;
        submitBtn.textContent = 'लॉगिन करें →';
        return;
      }

      const userData = userDoc.data();
      // save basic session info for the dashboard to read
      // (handles both "Name"/"Role" and "name"/"role" field casing)
      sessionStorage.setItem('kps_role', userData.Role || userData.role || selectedRole);
      sessionStorage.setItem('kps_name', userData.Name || userData.name || 'यूज़र');

      window.location.href = 'dashboard.html';

    } catch(err){
      console.error(err);
      let msg = 'लॉगिन असफल रहा। दोबारा कोशिश करो।';
      if(err.code === 'auth/user-not-found') msg = 'यह ईमेल पंजीकृत नहीं है।';
      if(err.code === 'auth/wrong-password') msg = 'पासवर्ड गलत है।';
      if(err.code === 'auth/invalid-email') msg = 'ईमेल फॉर्मेट सही नहीं है।';
      if(err.code === 'auth/too-many-requests') msg = 'बहुत बार गलत कोशिश हुई। कुछ देर बाद प्रयास करो।';
      showLoginError(msg);
      submitBtn.disabled = false;
      submitBtn.textContent = 'लॉगिन करें →';
    }
  });
}

// PROTECT PAGES — call this at the top of dashboard.html / students.html etc.
function requireAuth(){
  auth.onAuthStateChanged((user) => {
    if(!user){
      window.location.href = 'login.html';
    } else {
      const nameEl = document.getElementById('userName');
      const roleEl = document.getElementById('userRole');
      if(nameEl) nameEl.textContent = sessionStorage.getItem('kps_name') || user.email;
      if(roleEl) roleEl.textContent = sessionStorage.getItem('kps_role') || 'user';
    }
  });
}

// LOGOUT
function kpsLogout(){
  auth.signOut().then(() => {
    sessionStorage.clear();
    window.location.href = 'login.html';
  });
}
document.querySelectorAll('[data-logout]').forEach(btn=>{
  btn.addEventListener('click', kpsLogout);
});
