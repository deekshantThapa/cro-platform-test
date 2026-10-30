/**
 * Mini CRO Engine — MVP
 *
 * Load order in <head>:
 *   1. cro-variations.js
 *   2. cro-engine.js
 *
 * QA / preview override:
 *   ?cro_preview=hero_headline_test.variant_b (forces a specific variation)
 */

(function () {
  const CONFIG_URL = 'experiments.json';
  const COOKIE_NAME = 'cro_vid';
  const BUCKET_SIZE = 10000;

  let currentVisitorId = null;

  // 1. Get or create a persistent visitor ID (180-day cookie)

  function getVisitorId() {
    const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]+)'));
    if (match) return match[1];
    const id = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const expires = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = COOKIE_NAME + '=' + id + '; expires=' + expires + '; path=/';
    return id;
  }

  // 2. Deterministic string hash -> integer bucket (0 to BUCKET_SIZE-1)

  function hashToBucket(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash % BUCKET_SIZE;
  }

  // 3. Decide which variation (if any) this visitor falls into

  function assignVariation(visitorId, experiment) {
    const bucket = hashToBucket(visitorId + experiment.id);
    if (bucket >= experiment.trafficAllocation) return null;

    let cumulative = 0;
    for (let i = 0; i < experiment.variations.length; i++) {
      cumulative += experiment.variations[i].weight;
      if (bucket < cumulative) return experiment.variations[i].id;
    }
    return null;
  }

  // 4. Read ?cro_preview=exp.variation[,exp2.variation2] from the URL

  function getPreviewOverrides() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('cro_preview');
    const overrides = {};
    if (raw) {
      raw.split(',').forEach(function (pair) {
        const parts = pair.split('.');
        if (parts.length === 2) overrides[parts[0].trim()] = parts[1].trim();
      });
    }
    return overrides;
  }

  // 5. Report an event (pageview or conversion) to GTM via the dataLayer

  function trackEvent(eventName, experimentId, variationId) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'cro_' + eventName,
        cro_experiment_id: experimentId,
        cro_variation_id: variationId,
        cro_visitor_id: currentVisitorId
      });
    } catch (e) {
      console.error('cro gtm - failed to push to dataLayer', e);
    }
  }

  // 6. Wire up the goal element (if configured) to fire a conversion event

  function attachGoalListener(experiment, variationId) {
    if (!experiment.goalSelector) return;
    const el = document.querySelector(experiment.goalSelector);
    if (!el) return;
    el.addEventListener('click', function () {
      trackEvent('conversion', experiment.id, variationId);
    });
  }

  function init(config) {
    currentVisitorId = getVisitorId();
    const previewOverrides = getPreviewOverrides();
    const assignments = {};

    (config.experiments || []).forEach(function (experiment) {
      const forced = previewOverrides[experiment.id];
      const variationId = forced || assignVariation(currentVisitorId, experiment);
      const finalVariationId = variationId || 'control';
      assignments[experiment.id] = finalVariationId;

      if (variationId && variationId !== 'control') {
        const action =
          window.croVariations &&
          window.croVariations[experiment.id] &&
          window.croVariations[experiment.id][variationId];
        if (typeof action === 'function') {
          try {
            action();
          } catch (e) {
            console.error('cro variation error in', experiment.id, variationId, e);
          }
        }
      }

      // Preview (forced) visits are QA only, so keeping them out of the results of ga4
      if (!forced) {
        trackEvent('pageview', experiment.id, finalVariationId);
        attachGoalListener(experiment, finalVariationId);
      }
    });

    window.croAssignments = assignments;
    window.croVisitorId = currentVisitorId;
    console.log('cro visitor', currentVisitorId, 'assignments', assignments);
  }

  fetch(CONFIG_URL)
    .then(function (r) {
      return r.json();
    })
    .then(init)
    .catch(function (err) {
      console.error('cro failed to initialise', err);
    });
})();
