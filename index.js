// Check if user is logged in on load
window.onload = () => {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = "pages/home/home.html";
    }
}

function getApiBase() {
    // Use /api when served from a host (Vercel or static server with proxy),
    // fall back to localhost:4001 during local development when opened via file:// or when hostname is empty.
    try {
        if (location.protocol === 'file:') return 'http://localhost:4001';
        // treat common local hostnames/IPs as development environment
        const host = location.hostname || '';
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.startsWith('192.168.') ) {
            return 'http://localhost:4001';
        }
        return '/api';
    } catch (e) {
        return 'http://localhost:4001';
    }
}

// Try a list of API bases sequentially until one responds (helps dev when backend is on different port)
async function fetchWithFallback(path, options = {}) {
    const bases = [getApiBase(), 'http://localhost:4001', 'http://127.0.0.1:4001', 'http://localhost:3000', 'http://127.0.0.1:3000', '/api'];
    let lastErr = null;
    const joinUrl = (b, p) => {
        if (!b) return p;
        const base = b.endsWith('/') ? b.slice(0, -1) : b;
        const seg = p.startsWith('/') ? p : `/${p}`;
        return base + seg;
    };
    for (const base of bases) {
        try {
            const url = joinUrl(base, path);
            console.debug('Trying API base:', base, '->', url);
            const resp = await fetch(url, options);
            // If static server answered 404, 405 (method not allowed) or server error, try next base
            if (resp.status === 404 || resp.status === 405 || resp.status >= 500) {
                console.warn('Received status', resp.status, 'from', url, '- trying next base');
                lastErr = new Error(`HTTP ${resp.status}`);
                continue;
            }
            return resp;
        } catch (err) {
            lastErr = err;
            console.warn('fetchWithFallback failed for base', base, err && err.message ? err.message : err);
            // try next
        }
    }
    // If all failed, throw the last error to be handled by caller
    throw lastErr;
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
    const btn = form.loginButton();
    if (btn) btn.disabled = !emailValid || !passwordValid;
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
        const response = await fetchWithFallback('/login', {
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
