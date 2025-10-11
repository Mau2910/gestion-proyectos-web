// Script para la página de inicio de sesión

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
        // Recargar la lista de usuarios cada vez, por si el administrador ha añadido nuevos
        const users = loadUsers();
        const user = users.find(u => u.username === username);
        if (!user || user.password !== password) {
            errorMsg.textContent = 'Usuario o contraseña incorrectos';
            return;
        }
            // Almacenar usuario actual en sessionStorage si es posible. En
            // navegadores donde sessionStorage no está disponible (por ejemplo,
            // algunos modos privados), usar un fallback en memoria.
            try {
                sessionStorage.setItem('currentUser', username);
            } catch (e) {
                // Fallback: almacenar en una propiedad global
                window.currentUser = username;
            }
            window.location.href = 'tasks.html';
    });
});