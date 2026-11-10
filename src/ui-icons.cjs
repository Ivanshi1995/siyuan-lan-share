'use strict';
const paths={
 share:'<path d="M6 28H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l7 7v3M16 3v7h7M7 13h6M7 18h4M18 22l8-5M18 22l8 5"/><circle cx="15" cy="22" r="3"/><circle cx="28" cy="16" r="3"/><circle cx="28" cy="28" r="3"/>',
 document:'<path d="M8 3h11l6 6v18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM19 3v7h6M11 16h9M11 22h9"/>',
 arrow:'<path d="M6 16h20M18 8l8 8-8 8"/>',
 check:'<path d="m7 16 6 6L26 9"/>',
 copy:'<rect x="10" y="10" width="16" height="18" rx="3"/><path d="M21 10V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4"/>',
 external:'<path d="M18 5h9v9M27 5 14 18M12 6H7a3 3 0 0 0-3 3v16a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3v-5"/>',
 refresh:'<path d="M27 12A12 12 0 0 0 6 8L3 12M3 4v8h8M5 20a12 12 0 0 0 21 4l3-4M29 28v-8h-8"/>',
 network:'<rect x="11" y="3" width="10" height="8" rx="2"/><path d="M16 11v7M6 22v-4h20v4"/><rect x="2" y="22" width="8" height="7" rx="2"/><rect x="22" y="22" width="8" height="7" rx="2"/>',
 close:'<path d="m8 8 16 16M24 8 8 24"/>',
 trash:'<path d="M5 8h22M12 8V4h8v4M8 8l2 20h12l2-20M14 13v10M19 13v10"/>',
};
const svg=(name)=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.document}</svg>`;
const symbol=`<symbol id="iconLanShare" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths.share}</g></symbol>`;
module.exports={svg,symbol};
