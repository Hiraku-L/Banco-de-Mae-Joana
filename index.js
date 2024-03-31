firebase.auth().onAuthStateChanged(user => {
    if (user) {
        window.location.href = "pages/home/home.html";
    }
})

function onChangeUser() {
    toggleButtonsDisable();
    toggleUserErrors();
}

function onChangePassword() {
    toggleButtonsDisable();
    togglePasswordErrors();
} 

function toggleUserErrors() {
    const user = form.user().value;
    form.userRequiredError().style.display = user ? "none" : "block";
}

function togglePasswordErrors() {
    const password = form.password().value;
    form.passwordRequiredError().style.display = password ? "none" : "block";
}

function toggleButtonsDisable() {
    const emailValid = isUserValid();
    const passwordValid = isPasswordValid();
    form.loginButton().disabled = !emailValid || !passwordValid;
}


function isPasswordValid() {
    return form.password().value ? true : false;
}

function validateUser(user){ 
   return /\S+@\S+\.\S+/.test(user);
   //return (user);
}

function login(){
    showLoading();
    firebase.auth().signInWithEmailAndPassword(form.user().value, 
    form.password().value).then(response => {
        hideLoading();
        window.location.href = './pages/home/home.html';
    }).catch(error => {
        hideLoading();
        alert("VOCÊ NÃO É UM MEMBRO DO BANCO DE MÃE JOANA!!!")
    });
    console.log('depois')
    //window.location.href = 'pages/home/home.html';
}



const form = {
    user: () => document.getElementById("username"),
    password: () => document.getElementById("password"),
    loginButton: () => document.getElementById("botao-adentrar"),
    userRequiredError: () => document.getElementById("user-error"),
    passwordRequiredError: () => document.getElementById("error-password")

}
