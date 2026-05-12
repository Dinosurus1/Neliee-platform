import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000', // La dirección de tu backend en FastAPI
    headers: {
        'Content-Type': 'application/json'
    }
});

export default api;