const firebaseConfig = {
    apiKey: "AIzaSyBpZzdEoYMsQEDV7nZS20Y3zVRAjed746s",
    authDomain: "banco-de-mae-joana.firebaseapp.com",
    projectId: "banco-de-mae-joana",
    storageBucket: "banco-de-mae-joana.appspot.com",
    messagingSenderId: "515384045270",
    appId: "1:515384045270:web:7138ed7a765eeeb47ca377"
    };
firebase.initializeApp(firebaseConfig);

var db = firebase.firestore();