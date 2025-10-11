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
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed;
            }
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
    let tasks = {};
    if (stored) {
        try {
            tasks = JSON.parse(stored);
        } catch (e) {
            console.error('No se pudo analizar las tareas guardadas. Restableciendo a vacío.');
        }
    }
    const allUsers = loadUsers();
    allUsers.forEach(u => {
        if (u.username !== 'admin') {
            if (!tasks[u.username]) {
                tasks[u.username] = [];
            }
            tasks[u.username] = tasks[u.username].map(t => {
                if (typeof t === 'string') {
                    return { text: t, completed: false };
                } else {
                    return { text: t.text || '', completed: !!t.completed };
                }
            });
        }
    });
    saveTasks(tasks);
    return tasks;
}

// Guardar tareas
function saveTasks(tasks) {
    localStorage.setItem('tasksByUser', JSON.stringify(tasks));
}

// Asignar tarea a un usuario (usado desde la página de tareas por el administrador)
function assignTask(username, task, tasksByUser) {
    // If tasksByUser is not provided, load current tasks
    if (!tasksByUser) {
        tasksByUser = loadTasks();
    }
    if (!tasksByUser[username]) {
        tasksByUser[username] = [];
    }
    // Convert task to object with text and completed properties if needed
    let taskObj;
    if (typeof task === 'string') {
        taskObj = { text: task, completed: false };
    } else {
        taskObj = { text: task.text || '', completed: !!task.completed };
    }
    tasksByUser[username].push(taskObj);
    saveTasks(tasksByUser);
}

// Agregar un nuevo usuario con contraseña por defecto
function addUser(newUsername) {
    const users = loadUsers();
    // Evitar nombres vacíos y duplicados, y evitar sobrescribir admin
    if (!newUsername || users.some(u => u.username === newUsername)) {
        return false;
    }
    users.push({ username: newUsername, password: '1234' });
    saveUsers(users);
    // Inicializar tareas vacías para el nuevo usuario
    const tasksByUser = loadTasks();
    tasksByUser[newUsername] = [];
    saveTasks(tasksByUser);
    return true;
}
