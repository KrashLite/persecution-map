// archive-events.js - Сохранение событий в архив
const fs = require('fs');
const path = require('path');

const EVENTS_FILE = path.join(__dirname, 'data', 'events.json');
const ARCHIVE_FILE = path.join(__dirname, 'data', 'events-archive.json');

// Загрузить текущие события
function loadCurrent() {
    try {
        const data = fs.readFileSync(EVENTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { metadata: {}, events: [] };
    }
}

// Загрузить архив
function loadArchive() {
    try {
        const data = fs.readFileSync(ARCHIVE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {
            metadata: {
                created: new Date().toISOString(),
                description: 'Архив событий за последний год'
            },
            events: []
        };
    }
}

// Сохранить архив
function saveArchive(archive) {
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2), 'utf8');
}

// Объединить события
function mergeEvents(current, archive) {
    // Все события вместе
    const all = [...archive.events, ...current.events];
    
    // Дедупликация по URL
    const seen = new Set();
    const unique = [];
    
    for (const event of all) {
        const key = event.url || (event.title + event.date);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(event);
        }
    }
    
    // Фильтр: только события не старше 1 года
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const recent = unique.filter(e => new Date(e.date) > oneYearAgo);
    
    // Сортировка: новые первые
    recent.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return recent;
}

// Основная функция
function archiveEvents() {
    console.log('📦 Обновление архива...');
    
    const current = loadCurrent();
    const archive = loadArchive();
    
    console.log(`   Текущих: ${current.events.length}`);
    console.log(`   В архиве: ${archive.events.length}`);
    
    const merged = mergeEvents(current, archive);
    console.log(`   После объединения: ${merged.length}`);
    
    // Обновляем архив
    archive.events = merged;
    archive.metadata.lastUpdated = new Date().toISOString();
    archive.metadata.totalEvents = merged.length;
    
    saveArchive(archive);
    
    // Обновляем текущий файл (последние 50 для отображения)
    current.events = merged.slice(0, 50);
    current.metadata.totalEvents = merged.length;
    current.metadata.archivedTotal = merged.length;
    
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(current, null, 2), 'utf8');
    
    console.log('✅ Архив обновлён!');
    console.log(`   Всего сохранено: ${merged.length}`);
    console.log(`   Отображается: ${current.events.length}`);
}

archiveEvents();
