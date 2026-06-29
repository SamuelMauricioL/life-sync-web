/**
 * LifeSync — Google Classroom OAuth + API Client
 * Conexión real con Google Classroom vía OAuth 2.0.
 */

const CLASSROOM_CONFIG_KEY = 'lifesync_classroom_config';

const ClassroomAPI = {

  _config: null,

  getConfig() {
    if (this._config) return this._config;
    const saved = localStorage.getItem(CLASSROOM_CONFIG_KEY);
    if (saved) {
      this._config = JSON.parse(saved);
      return this._config;
    }
    // Client ID por defecto para el proyecto
    const defaultConfig = {
      clientId: '1023983567101-nrh1kpja2gjen0k4o5mpp5kj1fp0p19c.apps.googleusercontent.com',
      redirectUri: this._getRedirectUri()
    };
    this._config = defaultConfig;
    return this._config;
  },

  setConfig(clientId) {
    const config = { clientId, redirectUri: this._getRedirectUri() };
    localStorage.setItem(CLASSROOM_CONFIG_KEY, JSON.stringify(config));
    this._config = config;
  },

  isConfigured() {
    return !!this.getConfig()?.clientId;
  },

  _getRedirectUri() {
    // La URL actual sin el archivo, + oauth-callback.html
    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    return base + '/oauth-callback.html';
  },

  _getAccessToken() {
    return localStorage.getItem('lifesync_classroom_token');
  },

  _setAccessToken(token) {
    localStorage.setItem('lifesync_classroom_token', token);
  },

  clearToken() {
    localStorage.removeItem('lifesync_classroom_token');
  },

  // Iniciar flujo OAuth: abre popup
  iniciarOAuth() {
    const config = this.getConfig();
    if (!config) {
      alert('Configura tu Client ID de Google primero.');
      return;
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'token',
      scope: [
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.coursework.students.readonly'
      ].join(' ')
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    // Abrir popup centrado
    const w = 600, h = 700;
    const left = (screen.width / 2) - (w / 2);
    const top = (screen.height / 2) - (h / 2);
    const popup = window.open(url, 'google-oauth',
      `width=${w},height=${h},top=${top},left=${left}`);

    // Escuchar el token desde el popup
    return new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'classroom-oauth') {
          window.removeEventListener('message', handler);
          if (event.data.token) {
            this._setAccessToken(event.data.token);
            resolve(event.data.token);
          } else {
            reject(new Error('No se obtuvo token'));
          }
        }
      };
      window.addEventListener('message', handler);

      // Timeout por si el usuario cierra el popup
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Timeout'));
      }, 120000);
    });
  },

  // Obtener cursos del alumno
  async getCourses() {
    const token = this._getAccessToken();
    if (!token) throw new Error('NO_TOKEN');

    const res = await fetch(
      'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken();
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error('API_ERROR');
    }

    const data = await res.json();
    return data.courses || [];
  },

  // Obtener tareas de un curso
  async getCourseWork(courseId) {
    const token = this._getAccessToken();
    if (!token) throw new Error('NO_TOKEN');

    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken();
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error('API_ERROR');
    }

    const data = await res.json();
    return data.courseWork || [];
  },

  // Importar todas las tareas de todos los cursos
  async importarTareas() {
    const cursos = await this.getCourses();
    let tareas = [];

    for (const curso of cursos) {
      const courseWork = await this.getCourseWork(curso.id);
      for (const t of courseWork) {
        // Solo tareas que tienen fecha de entrega
        if (!t.dueDate) continue;

        const dueDate = `${t.dueDate.year}-${String(t.dueDate.month).padStart(2, '0')}-${String(t.dueDate.day).padStart(2, '0')}`;
        let dueTime = '';
        if (t.dueTime) {
          dueTime = `${String(t.dueTime.hours || 0).padStart(2, '0')}:${String(t.dueTime.minutes || 0).padStart(2, '0')}`;
        }

        tareas.push({
          id: `classroom_${t.id}`,
          curso: curso.name,
          nombre: t.title,
          descripcion: t.description || 'Sin descripción',
          fecha: dueDate,
          hora: dueTime || '23:59',
          prioridad: 'media',
          categoria: 'estudio',
          origen: 'google_classroom',
          completada: false
        });
      }
    }

    return tareas;
  }
};

// Exponer para usar desde planificar.js
window.ClassroomAPI = ClassroomAPI;
