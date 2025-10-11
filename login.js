// Script para la página de inicio de sesión

// Cargar usuarios para validación

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('errorMsg');

    // Manejar envío del formulario
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
                const users = loadUsers();
        const user = users.find(u => u.username === username);
        if (!user || user.password !== password) {
            errorMsg.textContent = 'Usuario o contraseña incorrectos';
            return;
        }
        // Almacenar usuario actual en sessionStorage y redirigir
        sessionStorage.setItem('currentUser', username);
        window.location.href = 'tasks.html';
    });
});
