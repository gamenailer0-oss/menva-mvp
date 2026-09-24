// Builds social/n8n/workflow.json (the file n8n imports) from the readable sources in
// social/n8n/src/. Edit the .js files there, then run:  node social/scripts/build-workflow.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../n8n');
const src = (f) => fs.readFileSync(path.join(DIR, 'src', f), 'utf8');
const lib = src('lib.js');
const code = (f) => lib + '\n' + src(f);

const MAIN_ID = 'MenvaAutopost001';
const ALERT_ID = 'MenvaAlerts00001';

const form = (name, value) => ({ parameterType: 'formData', name, value });

const main = {
  id: MAIN_ID,
  name: 'MENVA – Instagram autopost',
  active: false,
  settings: { executionOrder: 'v1', timezone: 'Asia/Karachi', errorWorkflow: ALERT_ID, saveManualExecutions: true },
  nodes: [
    {
      id: 'b0c1a001-0000-4000-8000-000000000001', name: 'Every 15 minutes', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0],
      parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 15 }] } },
    },
    {
      id: 'b0c1a001-0000-4000-8000-000000000002', name: 'Run now (test)', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 200],
      parameters: {},
    },
    {
      id: 'b0c1a001-0000-4000-8000-000000000003', name: "Pick today's post", type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 100],
      parameters: { jsCode: code('pick.js') },
      notes: 'Reads social/content/calendar.json. Posts after POST_TIME on calendar days; does nothing on rest days.',
    },
    {
      id: 'b0c1a001-0000-4000-8000-000000000004', name: 'Build render requests', type: 'n8n-nodes-base.code', typeVersion: 2, position: [480, 100],
      parameters: { jsCode: code('build.js') },
    },
    {
      id: 'b0c1a001-0000-4000-8000-000000000005', name: 'Render slide (Gotenberg)', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [720, 100],
      retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
      parameters: {
        method: 'POST',
        url: 'http://gotenberg:3000/forms/chromium/screenshot/url',
        sendBody: true,
        contentType: 'multipart-form-data',
        bodyParameters: {
          parameters: [
            form('url', '={{ $json.renderUrl }}'),
            form('width', '1080'),
            form('height', '1350'),
            form('clip', 'true'),
            form('format', 'jpeg'),
            form('quality', '92'),
            form('waitForExpression', 'window.__ready === true'),
            form('failOnConsoleExceptions', 'true'),
            form('failOnResourceLoadingFailed', 'true'),
          ],
        },
        options: { response: { response: { responseFormat: 'file', outputPropertyName: 'data' } }, timeout: 90000 },
      },
    },
    {
      id: 'b0c1a001-0000-4000-8000-000000000006', name: 'Save image', type: 'n8n-nodes-base.readWriteFile', typeVersion: 1, position: [960, 100],
      parameters: { operation: 'write', fileName: "={{ $('Build render requests').item.json.filePath }}", dataPropertyName: 'data', options: {} },
    },
    {
      id: 'b0c1a001-0000-4000-8000-000000000007', name: 'Publish to Instagram', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1200, 100],
      parameters: { jsCode: code('publish.js') },
      notes: 'DRY_RUN=true in .env: only makes the images. Refreshes the Instagram token weekly.',
    },
    {
      id: 'b0c1a001-0000-4000-8000-000000000008', name: 'Build story request', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1440, 100],
      onError: 'continueRegularOutput',
      parameters: { jsCode: code('story-build.js') },
      notes: 'STORIES=false in .env switches Stories off.',
    },
    {
      id: 'b0c1a001-0000-4000-8000-000000000009', name: 'Render story (Gotenberg)', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1680, 100],
      onError: 'continueRegularOutput',
      parameters: {
        method: 'POST',
        url: 'http://gotenberg:3000/forms/chromium/screenshot/url',
        sendBody: true,
        contentType: 'multipart-form-data',
        bodyParameters: {
          parameters: [
            form('url', '={{ $json.renderUrl }}'),
            form('width', '1080'),
            form('height', '1920'),
            form('clip', 'true'),
            form('format', 'jpeg'),
            form('quality', '90'),
            form('waitForExpression', 'window.__ready === true'),
            form('failOnConsoleExceptions', 'true'),
          ],
        },
        options: { response: { response: { responseFormat: 'file', outputPropertyName: 'data' } }, timeout: 90000 },
      },
    },
    {
      id: 'b0c1a001-0000-4000-8000-000000000010', name: 'Save story image', type: 'n8n-nodes-base.readWriteFile', typeVersion: 1, position: [1920, 100],
      onError: 'continueRegularOutput',
      parameters: { operation: 'write', fileName: "={{ $('Build story request').item.json.filePath }}", dataPropertyName: 'data', options: {} },
    },
    {
      id: 'b0c1a001-0000-4000-8000-000000000011', name: 'Publish story', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2160, 100],
      onError: 'continueRegularOutput',
      parameters: { jsCode: code('story-publish.js') },
      notes: 'Never fails the run: a Story problem only logs and alerts.',
    },
  ],
  connections: {
    'Every 15 minutes': { main: [[{ node: "Pick today's post", type: 'main', index: 0 }]] },
    'Run now (test)': { main: [[{ node: "Pick today's post", type: 'main', index: 0 }]] },
    "Pick today's post": { main: [[{ node: 'Build render requests', type: 'main', index: 0 }]] },
    'Build render requests': { main: [[{ node: 'Render slide (Gotenberg)', type: 'main', index: 0 }]] },
    'Render slide (Gotenberg)': { main: [[{ node: 'Save image', type: 'main', index: 0 }]] },
    'Save image': { main: [[{ node: 'Publish to Instagram', type: 'main', index: 0 }]] },
    'Publish to Instagram': { main: [[{ node: 'Build story request', type: 'main', index: 0 }]] },
    'Build story request': { main: [[{ node: 'Render story (Gotenberg)', type: 'main', index: 0 }]] },
    'Render story (Gotenberg)': { main: [[{ node: 'Save story image', type: 'main', index: 0 }]] },
    'Save story image': { main: [[{ node: 'Publish story', type: 'main', index: 0 }]] },
  },
  pinData: {},
};

const alerts = {
  id: ALERT_ID,
  name: 'MENVA – alert on failure',
  active: false,
  settings: { executionOrder: 'v1', timezone: 'Asia/Karachi' },
  nodes: [
    { id: 'b0c1a002-0000-4000-8000-000000000001', name: 'When autopost fails', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
    { id: 'b0c1a002-0000-4000-8000-000000000002', name: 'Log + phone alert', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 0], parameters: { jsCode: code('alert.js') } },
  ],
  connections: { 'When autopost fails': { main: [[{ node: 'Log + phone alert', type: 'main', index: 0 }]] } },
  pinData: {},
};

fs.writeFileSync(path.join(DIR, 'workflow.json'), JSON.stringify([main, alerts], null, 2) + '\n');
console.log('Wrote social/n8n/workflow.json (2 workflows)');
