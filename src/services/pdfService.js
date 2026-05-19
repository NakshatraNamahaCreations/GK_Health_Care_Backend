// HTML → PDF using Handlebars (templating) + Puppeteer (headless Chromium).
//
// Templates live in src/templates/*.hbs and are read & compiled on first use,
// then cached in memory. Add new templates by dropping a .hbs file in that folder.
//
// Render with renderHtml(templateName, data) and convert via htmlToPdf(html).
// Use renderToPdf() to do both in one call.

const fs = require('fs/promises');
const path = require('path');
const Handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');
const _templateCache = new Map();
let _browserPromise = null;

// -- Handlebars helpers ---------------------------------------------------
Handlebars.registerHelper('formatDate', (value, fmt = 'date') => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  if (fmt === 'datetime') return d.toLocaleString('en-IN');
  // default: dd-MM-yyyy
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
});

Handlebars.registerHelper('currency', (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
});

Handlebars.registerHelper('eq', (a, b) => a === b);

Handlebars.registerHelper('inc', (value) => Number(value) + 1);

// -- Template loading -----------------------------------------------------
async function loadTemplate(name) {
  if (_templateCache.has(name)) return _templateCache.get(name);

  const safe = name.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe) throw ApiError.badRequest('Invalid template name');

  const file = path.join(TEMPLATES_DIR, `${safe}.hbs`);
  let raw;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (err) {
    throw ApiError.notFound(`Template not found: ${safe}.hbs`);
  }
  const tpl = Handlebars.compile(raw, { noEscape: false });
  _templateCache.set(name, tpl);
  return tpl;
}

async function renderHtml(templateName, data = {}) {
  const tpl = await loadTemplate(templateName);
  return tpl(data);
}

// -- Puppeteer browser (singleton) ----------------------------------------
async function getBrowser() {
  if (_browserPromise) return _browserPromise;
  _browserPromise = puppeteer
    .launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    .catch((err) => {
      _browserPromise = null;
      throw err;
    });
  return _browserPromise;
}

async function closeBrowser() {
  if (!_browserPromise) return;
  try {
    const b = await _browserPromise;
    await b.close();
  } catch (err) {
    logger.warn(`pdfService closeBrowser: ${err.message}`);
  }
  _browserPromise = null;
}

// Graceful close on app shutdown — server.js's SIGINT/SIGTERM hooks already
// call process.exit; this just ensures the Chromium child is reaped.
process.on('beforeExit', closeBrowser);

// -- PDF generation -------------------------------------------------------
async function htmlToPdf(html, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: options.format || 'A4',
      printBackground: options.printBackground !== false,
      margin: options.margin || { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
    });
    return pdf;
  } finally {
    await page.close();
  }
}

async function renderToPdf(templateName, data, options) {
  const html = await renderHtml(templateName, data);
  return htmlToPdf(html, options);
}

module.exports = { renderHtml, htmlToPdf, renderToPdf, loadTemplate, closeBrowser };
