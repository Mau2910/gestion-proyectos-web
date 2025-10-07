// Funciones comunes y estado global

// Usuarios predeterminados. El administrador usa el nombre "admin".
const defaultUsers = [
    { username: 'admin', password: 'admin' },
    { username: 'usuario1', password: '1234' },
    { username: 'usuario2', password: 'abcd' },
];

// Cargar usuarios desde localStorage o usar predeterminados
function loadUsers() {
    const stored = localStorage.getItem('users');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('No se pudo analizar los usuarios guardados. Restableciendo a valores por defecto.');
        }
    }
    localStorage.setItem('users', JSON.stringify(defaultUsers));
    return defaultUsers;
}

// Guardar usuarios en localStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Cargar tareas asignadas desde localStorage o inicializar para cada usuario
function loadTasks() {
    const stored = localStorage.getItem('tasksByUser');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('No se pudo analizar las tareas guardadas. Restableciendo a vacío.');
        }
    }
    const tasks = {};
    defaultUsers.forEach(u => {
        if (u.username !== 'admin') {
            tasks[u.username] = [];
        }
    });
    localStorage.setItem('tasksByUser', JSON.stringify(tasks));
    return tasks;
}

// Guardar tareas
function saveTasks(tasks) {
    localStorage.setItem('tasksByUser', JSON.stringify(tasks));
}

// Asignar tarea a un usuario (usado desde la página de tareas por el administrador)
function assignTask(username, task, tasksByUser) {
    if (!tasksByUser[username]) {
        tasksByUser[username] = [];
    }
    tasksByUser[username].push(task);
    saveTasks(tasksByUser);
}