import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';

/* =========================================================================
 * IconComponent — Unified Material Symbols-style SVG icon set
 * No CDN, all SVG paths embedded. 24x24 viewBox, currentColor stroke/fill.
 * Usage: <app-icon name="search" size="md" aria-hidden="true" />
 * ========================================================================= */
export type IconName =
  /* Navigation */
  | 'home' | 'dashboard' | 'menu' | 'close' | 'chevron-left' | 'chevron-right'
  | 'chevron-down' | 'chevron-up' | 'arrow-right' | 'arrow-up-right'
  | 'arrow-left' | 'external-link' | 'logout' | 'login'
  /* Chat / Communication */
  | 'chat' | 'chat-bubble' | 'send' | 'paperclip' | 'attachment'
  | 'sparkles' | 'bot' | 'user' | 'users' | 'headset'
  /* Search / Filter */
  | 'search' | 'filter' | 'sliders' | 'sort' | 'close-circle'
  /* Files & Content */
  | 'file' | 'file-text' | 'folder' | 'documents' | 'copy' | 'download'
  | 'upload' | 'link' | 'book-open'
  /* Status / Semantic */
  | 'check' | 'check-circle' | 'check-double'
  | 'alert-circle' | 'alert-triangle' | 'warning'
  | 'x-circle' | 'info' | 'help-circle' | 'question-mark'
  | 'clock' | 'calendar' | 'history' | 'refresh' | 'retry'
  /* Priority / Triage */
  | 'flag' | 'fire' | 'arrow-up' | 'arrow-down' | 'minus' | 'equal'
  /* System & UI */
  | 'settings' | 'gear' | 'bell' | 'bell-off' | 'eye' | 'eye-off'
  | 'sun' | 'moon' | 'globe' | 'language' | 'shield' | 'lock' | 'unlock'
  | 'plus' | 'pencil' | 'edit' | 'trash' | 'more-horizontal' | 'more-vertical'
  /* Analytics / Data */
  | 'chart-bar' | 'chart-pie' | 'chart-line' | 'activity' | 'trending-up'
  | 'trending-down' | 'cpu' | 'database'
  /* Misc / Tickets */
  | 'ticket' | 'tag' | 'layers' | 'target' | 'zap' | 'thumbs-up'
  | 'thumbs-down' | 'star' | 'hash' | 'columns' | 'circle';

interface IconPaths {
  paths: string[];
  viewBox?: string;
  filled?: boolean;
}

/* Compact 24x24 stroke-based icons (Material Symbols Outlines) — paths only */
const ICONS: Record<IconName, IconPaths> = {
  home:             { paths: ['M3 12l9-9 9 9v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z'] },
  dashboard:        { paths: ['M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z'] },
  menu:             { paths: ['M4 6h16M4 12h16M4 18h16'] },
  close:            { paths: ['M6 6l12 12M18 6L6 18'] },
  'chevron-left':   { paths: ['M15 6l-6 6 6 6'] },
  'chevron-right':  { paths: ['M9 6l6 6-6 6'] },
  'chevron-down':   { paths: ['M6 9l6 6 6-6'] },
  'chevron-up':     { paths: ['M6 15l6-6 6 6'] },
  'arrow-right':    { paths: ['M5 12h14M13 6l6 6-6 6'] },
  'arrow-up-right': { paths: ['M7 17L17 7M9 7h8v8'] },
  'arrow-left':     { paths: ['M19 12H5M11 6l-6 6 6 6'] },
  'external-link':  { paths: ['M14 4h6v6M10 14L20 4M20 14v6H4V4h6'] },
  logout:           { paths: ['M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h12'] },
  login:            { paths: ['M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 7l-5 5 5 5M5 12h12'] },
  chat:             { paths: ['M21 12a8 8 0 1 1-3.3-6.5L21 4l-1.5 3.3A8 8 0 0 1 21 12z'] },
  'chat-bubble':    { paths: ['M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 3 11.5a8.5 8.5 0 0 1 17 0z'] },
  send:             { paths: ['M22 2L11 13M22 2l-7 20-4-9-9-4z'] },
  paperclip:        { paths: ['M21 11l-9.5 9.5a5.5 5.5 0 0 1-7.8-7.8l10-10a3.5 3.5 0 0 1 5 5L8.5 18a1.5 1.5 0 0 1-2-2L15 7'] },
  attachment:       { paths: ['M21.4 12.6a6 6 0 0 0-8.5 0L7.5 18a4 4 0 1 1-5.7-5.7L12 2M15.6 6L6.5 15.1a2 2 0 0 0 2.8 2.8L18.4 8.8a2.5 2.5 0 0 0-2.8-2.8z'] },
  sparkles:         { paths: ['M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6L15.5 17.5l2.6-.9zM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8z'] },
  bot:              { paths: ['M12 2v2M7 5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 14h2M19 14h2M9 11h.01M15 11h.01M9 15h6'] },
  user:             { paths: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'] },
  users:            { paths: ['M17 21v-2a4 4 0 0 0-3-3.9M9 21v-2a4 4 0 0 1 3-3.9M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM22 21v-2a4 4 0 0 0-3-3.9M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z'] },
  headset:          { paths: ['M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 1 2-2h2v6H6a2 2 0 0 1-2-2v-2zM20 14a2 2 0 0 0-2-2h-2v6h2a2 2 0 0 0 2-2v-2z'] },
  search:           { paths: ['M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3'] },
  filter:           { paths: ['M4 5h16M7 12h10M10 19h4'] },
  sliders:          { paths: ['M4 6h10M18 6h2M14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM4 12h2M8 12h12M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM4 18h14M20 18h0M16 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z'] },
  sort:             { paths: ['M7 4v16M7 4L3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4'] },
  'close-circle':   { paths: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM8 8l8 8M16 8L8 16'] },
  file:             { paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6'] },
  'file-text':      { paths: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2'] },
  folder:           { paths: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'] },
  documents:        { paths: ['M4 4h12v12H4zM8 2v2M12 2v2M16 2v2M8 20v2M12 20v2M16 20v2M20 8v12H8'] },
  copy:             { paths: ['M9 9h10v10H9zM5 15V5h10'] },
  download:         { paths: ['M12 3v12M7 10l5 5 5-5M5 21h14'] },
  upload:           { paths: ['M12 21V9M7 14l5-5 5 5M5 3h14'] },
  link:             { paths: ['M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1'] },
  'book-open':      { paths: ['M3 4h7a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H3zM21 4h-7a3 3 0 0 0-3 3v14a3 3 0 0 1 3-3h7z'] },
  check:            { paths: ['M5 12l5 5L20 7'] },
  'check-circle':   { paths: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM7 12l4 4 8-8'] },
  'check-double':   { paths: ['M2 12l5 5L14 7M9 12l5 5 8-8'] },
  'alert-circle':   { paths: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM12 8v5M12 16h.01'] },
  'alert-triangle': { paths: ['M12 3L2 21h20zM12 10v5M12 18h.01'] },
  warning:          { paths: ['M12 3L2 21h20zM12 10v5M12 18h.01'] },
  'x-circle':       { paths: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM8 8l8 8M16 8L8 16'] },
  info:             { paths: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM12 11v5M12 8h.01'] },
  'help-circle':    { paths: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM9.5 9a2.5 2.5 0 1 1 4 1.6c-.8.7-1.5 1.2-1.5 2.4M12 17h.01'] },
  'question-mark':  { paths: ['M9.5 9a2.5 2.5 0 1 1 4 1.6c-.8.7-1.5 1.2-1.5 2.4M12 17h.01M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z'] },
  clock:            { paths: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM12 6v6l4 2'] },
  calendar:         { paths: ['M4 6h16v14H4zM4 10h16M8 2v4M16 2v4'] },
  history:          { paths: ['M3 3v5h5M3.5 9a9 9 0 1 1 2 6.5M12 7v5l3 3'] },
  refresh:          { paths: ['M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5'] },
  retry:            { paths: ['M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M3 12a9 9 0 0 0 15.5 6.3L21 16M21 21v-5h-5'] },
  flag:             { paths: ['M4 22V4h14l-2 4 2 4H6'] },
  fire:             { paths: ['M12 2s4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-3s-1 5 3 5 1-4 1-4 2 2 2 5a6 6 0 1 1-12 0c0-4 5-6 9-11z'] },
  'arrow-up':       { paths: ['M12 20V4M5 11l7-7 7 7'] },
  'arrow-down':     { paths: ['M12 4v16M5 13l7 7 7-7'] },
  minus:            { paths: ['M5 12h14'] },
  equal:            { paths: ['M5 9h14M5 15h14'] },
  settings:         { paths: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'] },
  gear:             { paths: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'] },
  bell:             { paths: ['M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.7 21a2 2 0 0 1-3.4 0'] },
  'bell-off':       { paths: ['M4 4l16 16M18 8a6 6 0 0 0-8.5-5.4M17 17l-11-2.9S4 12 4 12h13M13.7 21a2 2 0 0 1-3.4 0'] },
  eye:              { paths: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'] },
  'eye-off':        { paths: ['M3 3l18 18M10.6 6.1A6 6 0 0 1 12 6c7 0 11 6 11 6a17 17 0 0 1-3.2 4M6.1 6.1A17 17 0 0 0 1 12s4 8 11 8a8 8 0 0 0 4.3-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2'] },
  sun:              { paths: ['M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'] },
  moon:             { paths: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'] },
  globe:            { paths: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20'] },
  language:         { paths: ['M5 8h14M9 22l3-10 3 10M11 18h2M12 2a10 10 0 0 1 0 20M2 12h20'] },
  shield:           { paths: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'] },
  lock:             { paths: ['M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4'] },
  unlock:           { paths: ['M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0'] },
  plus:             { paths: ['M12 5v14M5 12h14'] },
  pencil:           { paths: ['M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z'] },
  edit:             { paths: ['M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z'] },
  trash:            { paths: ['M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6'] },
  'more-horizontal':{ paths: ['M6 12h.01M12 12h.01M18 12h.01'] },
  'more-vertical':  { paths: ['M12 6h.01M12 12h.01M12 18h.01'] },
  'chart-bar':      { paths: ['M3 21V10M9 21V3M15 21v-8M21 21V15'] },
  'chart-pie':      { paths: ['M21.2 12.3H12V2.8a10 10 0 0 1 9.2 9.5zM3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zM21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9v9z'] },
  'chart-line':     { paths: ['M3 3v18h18M7 15l4-4 3 3 5-6'] },
  activity:         { paths: ['M22 12h-4l-3 9L9 3l-3 9H2'] },
  'trending-up':    { paths: ['M3 17l6-6 4 4 8-8M14 7h7v7'] },
  'trending-down':  { paths: ['M3 7l6 6 4-4 8 8M14 17h7v-7'] },
  cpu:              { paths: ['M4 4h16v16H4zM9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2M9 9h6v6H9z'] },
  database:         { paths: ['M4 6a8 4 0 0 1 16 0 8 4 0 0 1-16 0zM4 6v6a8 4 0 0 0 16 0V6M4 12v6a8 4 0 0 0 16 0v-6'] },
  ticket:           { paths: ['M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2zM13 6v12'] },
  tag:              { paths: ['M20.6 13.4L11 22l-9-9V2h11zM7 7h.01'] },
  layers:           { paths: ['M12 2L2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5'] },
  target:           { paths: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'] },
  zap:              { paths: ['M13 2L3 14h7l-1 8 10-12h-7z'] },
  'thumbs-up':      { paths: ['M7 10v11H3V10zM14 4a3 3 0 0 0-3 3v5h7.3a2 2 0 0 0 2-1.7l1.4-6A2 2 0 0 0 19.7 2H14zM14 11v9h6a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z'] },
  'thumbs-down':    { paths: ['M17 14V3h4v11zM10 20a3 3 0 0 0 3-3v-5H5.7a2 2 0 0 0-2 1.7l-1.4 6A2 2 0 0 0 4.3 22H10zM10 13V4H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2z'] },
  star:             { paths: ['M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 4.8 21.1 6 14.2l-5-4.9 6.9-1z'] },
  hash:             { paths: ['M4 9h16M4 15h16M10 3L8 21M16 3l-2 18'] },
  columns:          { paths: ['M4 2h7v20H4zM13 2h7v20h-7z'] },
  circle:           { paths: ['M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z'] },
};

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_MAP: Record<IconSize, { w: number; h: number; stroke: number }> = {
  xs:   { w: 14, h: 14, stroke: 1.8 },
  sm:   { w: 16, h: 16, stroke: 2.0 },
  md:   { w: 20, h: 20, stroke: 2.0 },
  lg:   { w: 24, h: 24, stroke: 2.0 },
  xl:   { w: 28, h: 28, stroke: 2.2 },
  '2xl':{ w: 36, h: 36, stroke: 2.2 },
};

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="sizeConfig().w"
      [attr.height]="sizeConfig().h"
      [attr.viewBox]="viewBox"
      [attr.aria-hidden]="ariaHidden ? 'true' : null"
      [attr.aria-label]="ariaLabel"
      [attr.role]="ariaLabel ? 'img' : null"
      [style.display]="'block'"
      [style.overflow]="'visible'"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class]="hostClass"
    >
      @for (p of iconPaths(); track $index) {
        <path [attr.d]="p" />
      }
    </svg>
  `,
  host: {
    '[style.display]': '"inline-flex"',
    '[style.alignItems]': '"center"',
    '[style.justifyContent]': '"center"',
    '[style.verticalAlign]': '"middle"',
    '[style.flexShrink]': '"0"',
    '[style.width.px]': 'sizeConfig().w',
    '[style.height.px]': 'sizeConfig().h',
    '[attr.data-icon]': 'name',
  }
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size: IconSize = 'md';
  @Input() strokeWidth: number | null = null;
  @Input() ariaLabel: string | null = null;
  @Input() ariaHidden = true;
  @Input() hostClass = '';

  readonly viewBox = '0 0 24 24';

  readonly iconPaths = computed<string[]>(() => {
    const cfg = ICONS[this.name];
    if (!cfg) {
      console.warn(`[IconComponent] Unknown icon: "${this.name}". Falling back to "info".`);
      return ICONS.info.paths;
    }
    return cfg.paths;
  });

  readonly sizeConfig = computed(() => SIZE_MAP[this.size] ?? SIZE_MAP.md);
}
