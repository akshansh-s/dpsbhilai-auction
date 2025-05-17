/* global firebase */
const firebaseConfig = {
      apiKey: "AIzaSyDTqLeVYnn0DDHdZ2TM34OKY-RABpZp9xw",
      authDomain: "dpsb-auction.firebaseapp.com",
      projectId: "dpsb-auction",
      storageBucket: "dpsb-auction.firebasestorage.app",
      messagingSenderId: "968788714180",
      appId: "1:968788714180:web:5ce3d25bc85c8ea88c5f91",
      measurementId: "G-NC0267LNYQ"
    };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Elements
const highestBidEl = document.getElementById('highestBid');
const bidInput = document.getElementById('bidInput');
const bidBtn   = document.getElementById('bidBtn');
const bidModal = document.getElementById('bidModal');
const closeModal = document.getElementById('closeModal');
const bidForm  = document.getElementById('bidForm');

const authBtn   = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const closeAuth = document.getElementById('closeAuth');
const googleBtn = document.getElementById('googleSignIn');
const emailAuthForm = document.getElementById('emailAuthForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');

let currentHighest = 0;
let currentUser = null;
let isVerified  = false;
let pendingBidAmount = null;

// Listen highest bid
db.collection('bids').orderBy('amount','desc').limit(1)
  .onSnapshot(snapshot=>{
    currentHighest = snapshot.empty?0:snapshot.docs[0].data().amount;
    highestBidEl.textContent = currentHighest.toLocaleString();
    const minVal = currentHighest + 1;
    bidInput.min = minVal;
    if(!bidInput.value || parseInt(bidInput.value,10)<minVal){
      bidInput.value = minVal;
    }
  });

// Auth modal handlers
if(authBtn){
  authBtn.addEventListener('click',()=>authModal.classList.add('active'));
}
closeAuth.addEventListener('click',()=>authModal.classList.remove('active'));
window.addEventListener('click',e=>{if(e.target===authModal) authModal.classList.remove('active');});

// Google sign-in
googleBtn.addEventListener('click',()=>{
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(alert);
});

// Email sign-in/register
emailAuthForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const email = authEmail.value.trim();
  const pwd = authPassword.value.trim();
  try{
    const cred = await auth.createUserWithEmailAndPassword(email,pwd);
    await cred.user.sendEmailVerification();
    alert('Verification email sent. Please verify then sign in.');
    auth.signOut();
  }catch(err){
    if(err.code==='auth/email-already-in-use'){
      try{
        const cred = await auth.signInWithEmailAndPassword(email,pwd);
        if(!cred.user.emailVerified){
          await cred.user.sendEmailVerification();
          alert('Email not verified. Verification link re-sent.');
          auth.signOut();
        }
      }catch(subErr){alert(subErr.message);}  
    }else{alert(err.message);}  
  }
});

// Auth state
auth.onAuthStateChanged(user=>{
  currentUser = user;
  isVerified = !!user && (user.providerData.some(p=>p.providerId==='google.com') || user.emailVerified);
  if(authBtn){
    authBtn.classList.toggle('hidden',isVerified);
  }
  if(isVerified && pendingBidAmount!==null){
    if(pendingBidAmount<=currentHighest){
      pendingBidAmount=currentHighest+1;
      bidInput.value=pendingBidAmount;
    }
    openBidModal();
  }
});

function openBidModal(){
  document.getElementById('email').value = currentUser.email;
  bidModal.classList.add('active');
  pendingBidAmount = null;
}

// Bid flow
bidBtn.addEventListener('click',()=>{
  pendingBidAmount = parseInt(bidInput.value,10);
  if(!isVerified){
    authModal.classList.add('active');
  }else{
    openBidModal();
  }
});

// Close bid modal
closeModal.addEventListener('click', ()=>bidModal.classList.remove('active'));
window.addEventListener('click', e=>{if(e.target===bidModal) bidModal.classList.remove('active');});

// Submit bid
bidForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const amount = parseInt(bidInput.value,10);
  if(amount<=currentHighest){
    alert('Bid must exceed current highest bid.');
    return;
  }
  const doc = {
    amount,
    name: document.getElementById('fullName').value.trim(),
    email: currentUser.email,
    mobile: document.getElementById('mobile').value.trim(),
    plans: document.getElementById('plans').value.trim(),
    uid: currentUser.uid,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  try{
    await db.collection('bids').add(doc);
    alert('Bid placed successfully!');
    bidForm.reset();
    bidModal.classList.remove('active');
  }catch(err){
    console.error(err);
    alert('Failed to place bid.');
  }
});
