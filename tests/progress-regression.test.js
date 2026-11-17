import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/load-app.js';
import { getAllLessons, getLesson } from '../content/curriculum.js';
import { STORE_KEY, normalizeLessonEntry } from '../content/progress.js';

const action = (app, dataset) => app.call('handleAction', { target: { closest: () => ({ dataset }) } });

test('core and optional counts remain separate', () => {
  const app = loadApp();
  try {
    for (const lesson of getAllLessons()) for (const page of lesson.pages.filter(p => p.required !== false)) app.call('recordLessonPage', lesson, page);
    const html = app.visit('#/learn?review=completed').html;
    assert.match(html, /20 of 20 core concepts understood/);
    assert.match(html, /9 of 9 optional lessons completed/);
    assert.match(html, /partner-systems/);
    assert.match(app.visit('#/progress').html, /<strong>20<\/strong><span>concept steps understood/);
    assert.match(app.visit('#/').html, /20 concept steps understood/);
  } finally { app.dispose(); }
});

test('locked answers do not save progress', () => {
  const lesson = getLesson('rotation-positions');
  const app = loadApp({ hash: '#/lesson/rotation-positions?page=lose-rally' });
  try {
    action(app, { action:'page-answer', lesson:lesson.id, page:'lose-rally', index:'1' });
    assert.equal(JSON.parse(app.window.localStorage.getItem(STORE_KEY)).lessonProgress[lesson.id], undefined);
  } finally { app.dispose(); }
});

test('only boolean true counts as completion', () => {
  assert.equal(normalizeLessonEntry({ conceptUnderstood: 'yes' }).conceptUnderstood, false);
});

test('reset failure keeps stored and displayed progress and allows retry', () => {
  const app = loadApp({hash:'#/progress'});
  try {
    const lesson = getLesson('equipment-safety');
    for (const page of lesson.pages.filter(p => p.required !== false)) app.call('recordLessonPage', lesson, page);
    const before = app.window.localStorage.getItem(STORE_KEY);
    const remove = app.window.localStorage.removeItem;
    app.window.localStorage.removeItem = () => { throw Error('denied'); };
    action(app, {action:'reset-arm'});
    action(app, {action:'reset-confirm'});
    assert.equal(app.window.localStorage.getItem(STORE_KEY), before);
    assert.match(app.app.innerHTML, /Couldn’t reset progress/);
    assert.match(app.app.innerHTML, /reset-confirm/);
    assert.match(app.app.innerHTML, /<strong>1<\/strong><span>concept steps understood/);
    app.window.localStorage.removeItem = remove;
    action(app, {action:'reset-confirm'});
    assert.match(app.app.innerHTML, /<strong>0<\/strong><span>concept steps understood/);
  } finally { app.dispose(); }
});

test('optional-only pages cannot complete a lesson, while completion remains saved', () => {
  const app = loadApp();
  try {
    const onlyReference = {id:'reference-only', pages:[{id:'reference', required:false}], prerequisites:[]};
    app.call('recordLessonPage', onlyReference, onlyReference.pages[0]);
    assert.equal(JSON.parse(app.window.localStorage.getItem(STORE_KEY)).lessonProgress['reference-only'].conceptUnderstood, false);
    const lesson = getLesson('equipment-safety');
    const pages = lesson.pages.filter(p => p.required !== false);
    for (const page of pages) app.call('recordLessonPage', lesson, page);
    assert.equal(JSON.parse(app.window.localStorage.getItem(STORE_KEY)).lessonProgress[lesson.id].conceptUnderstood, true);
    assert.match(app.visit('#/lesson/equipment-safety').html, /Concept understood/);
  } finally { app.dispose(); }
});
