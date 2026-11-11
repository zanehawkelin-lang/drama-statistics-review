(function (root) {
  'use strict';
  const pageGroups = {payment:'payment',channels:'payment',global:'payment',links:'links',create:'links',products:'products',templates:'templates'};
  const group = page => pageGroups[page] || 'links';
  function create(siteIds, saved = null, legacy = null) {
    const valid = value => value === 'all' || siteIds.includes(value);
    const defaultSite = siteIds.includes('dv') ? 'dv' : siteIds[0] || 'all';
    const defaults = {payment:'all',links:defaultSite,products:defaultSite,templates:defaultSite};
    const hasSaved = saved && typeof saved === 'object' && !Array.isArray(saved);
    let values = Object.fromEntries(Object.keys(defaults).map(key => [key,hasSaved && valid(saved[key]) ? saved[key] : !hasSaved && valid(legacy) ? legacy : defaults[key]]));
    return {
      get(page) { return values[group(page)]; },
      set(page, value) { if(!valid(value)) return false; values[group(page)] = value; return true; },
      snapshot() { return {...values}; },
      reset() { values = {...defaults}; }
    };
  }
  const api = {group,create};
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.PSPPageScopes = api;
})(typeof window === 'object' ? window : globalThis);
