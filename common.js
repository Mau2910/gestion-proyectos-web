// Funciones comunes y estado global

// Usuarios predeterminados. El administrador usa el nombre "admin".
// Cada usuario tiene un rol que puede ser 'admin' o 'user'.
const defaultUsers = [
    { username: 'admin', password: 'admin', role: 'admin' },
    { username: 'usuario1', password: '1234', role: 'user' },
    { username: 'usuario2', password: 'abcd', role: 'user' },
];

// Cargar usuarios desde localStorage o usar predeterminados
function loadUsers() {
    // Cargar usuarios desde localStorage. Si hay un error de análisis o
    // el formato es incorrecto, se restablece a los valores predeterminados.
    const stored = localStorage.getItem('users');
    let users = defaultUsers;
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                // Garantizar que cada usuario tenga un rol válido
                users = parsed.map(u => ({
                    username: u.username,
                    password: u.password,
                    role: u.role || (u.username === 'admin' ? 'admin' : 'user'),
                }));
            }
        } catch (e) {
            console.error('No se pudo analizar los usuarios guardados. Restableciendo a valores por defecto.');
        }
    }
    // Guardar de nuevo para normalizar
    localStorage.setItem('users', JSON.stringify(users));
    return users;
}

// Guardar usuarios en localStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Cargar tareas asignadas desde localStorage o inicializar para cada usuario
function loadTasks() {
    // Cargar las tareas de cada usuario desde localStorage. Si el análisis
    // falla, se usa un objeto vacío. Además se normaliza la estructura de
    // cada tarea para que tenga texto, fecha de asignación, fecha límite,
    // estado de completado y retroalimentación.
    let tasks = {};
    const stored = localStorage.getItem('tasksByUser');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                tasks = parsed;
            }
        } catch (e) {
            console.error('No se pudo analizar las tareas guardadas. Restableciendo a vacío.');
        }
    }
    const users = loadUsers();
    const today = new Date().toISOString().split('T')[0];
    users.forEach(u => {
        if (!tasks[u.username]) {
            tasks[u.username] = [];
        }
        // Normalizar cada tarea en la lista
        tasks[u.username] = tasks[u.username].map(task => {
            if (typeof task === 'string') {
                return {
                    text: task,
                    completed: false,
                    assignedDate: today,
                    dueDate: '',
                    feedback: ''
                };
            }
            return {
                text: task.text || '',
                completed: !!task.completed,
                assignedDate: task.assignedDate || today,
                dueDate: task.dueDate || '',
                feedback: task.feedback || ''
            };
        });
    });
    // Guardar de nuevo para asegurarnos de que la estructura es consistente
    saveTasks(tasks);
    return tasks;
}

// Guardar tareas
function saveTasks(tasks) {
    localStorage.setItem('tasksByUser', JSON.stringify(tasks));
}

// Asignar tarea a un usuario (usado desde la página de tareas por el administrador)
function assignTask(username, task, tasksByUser) {
    // Permitir que tasksByUser sea opcional
    if (!tasksByUser) {
        tasksByUser = loadTasks();
    }
    if (!tasksByUser[username]) {
        tasksByUser[username] = [];
    }
    // Convertir la entrada en un objeto de tarea completo
    let taskObj;
    const today = new Date().toISOString().split('T')[0];
    if (typeof task === 'string') {
        taskObj = {
            text: task,
            completed: false,
            assignedDate: today,
            dueDate: '',
            feedback: ''
        };
    } else {
        taskObj = {
            text: task.text || '',
            completed: !!task.completed,
            assignedDate: task.assignedDate || today,
            dueDate: task.dueDate || '',
            feedback: task.feedback || ''
        };
    }
    tasksByUser[username].push(taskObj);
    saveTasks(tasksByUser);
}

// Eliminar una tarea específica de un usuario por índice
function deleteTask(username, index) {
    const tasks = loadTasks();
    if (tasks[username]) {
        tasks[username].splice(index, 1);
        saveTasks(tasks);
    }
}

// Añadir un nuevo usuario con un rol especificado ('user' o 'admin').
// Devuelve true si el usuario se agregó correctamente o false si ya existe.
function addUser(newUsername, role = 'user') {
    const trimmed = newUsername.trim();
    if (!trimmed) {
        return false;
    }
    const users = loadUsers();
    if (users.some(u => u.username === trimmed)) {
        return false;
    }
    const newUser = { username: trimmed, password: '1234', role: role };
    users.push(newUser);
    saveUsers(users);
    // Inicializar tareas vacías para este usuario
    const tasks = loadTasks();
    tasks[trimmed] = [];
    saveTasks(tasks);
    return true;
}

// Eliminar usuario por nombre. También elimina sus tareas.
function deleteUser(username) {
    // Evitar eliminar al último administrador
    let users = loadUsers();
    const user = users.find(u => u.username === username);
    if (!user) return;
    if (user.role === 'admin') {
        const admins = users.filter(u => u.role === 'admin');
        if (admins.length <= 1) {
            // No eliminar si es el único administrador
            return;
        }
    }
    users = users.filter(u => u.username !== username);
    saveUsers(users);
    const tasks = loadTasks();
    delete tasks[username];
    saveTasks(tasks);
}