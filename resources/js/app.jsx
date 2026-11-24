import './bootstrap';
import '../css/app.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import GymApp from './GymApp';

const rootElement = document.getElementById('app');

if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<GymApp />);
} else {
    console.error("مش قادر ألاقي الـ div اللي اسمه app في صفحة HTML!");
}
