// Check if user is logged in on load
window.onload = () => {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = "pages/home/home.html";
    }
}

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

async function login(){
    showLoading();
    const email = form.user().value;
    const password = form.password().value;
    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            hideLoading();
            window.location.href = './pages/home/home.html';
        } else {
            hideLoading();
            alert("VOCÊ NÃO É UM MEMBRO DO BANCO DE MÃE JOANA!!!")
        }
    } catch (error) {
        hideLoading();
        alert("Erro de conexão");
    }
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
