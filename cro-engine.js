/**
 * Mini CRO Engine — MVP
 *
 * Load order in <head>:
 *   1. cro-variations.js   (defines window.croVariations)
 *   2. cro-engine.js       (this file)
 *
 * QA / preview override:
 *   ?cro_preview=hero_headline_test.variant_b forces a specific variation.
 *
 * Results:
 *   Open the console and run  croGetResults()  to see pageviews,
 *   conversions, and conversion rate per variation.
 */

(function () {
  var CONFIG_URL = 'experiments.json';
  var COOKIE_NAME = '_cro_vid';
  var EVENTS_KEY = 'cro_events';
  var BUCKET_SIZE = 10000;

  // // Google Apps Script Web App URL after deploying it
  // var BACKEND_URL =
  //   'https://script.google.com/macros/s/AKfycbye8g2rMA0EWhpaZxLTiBxqRcIJaIe4Qu9u7d9EdkYGUzfYbg6HtGg1Q92lA5cZ4XLdOQ/exec';

  var currentVisitorId = null;

  // 1. Get or create a persistent visitor ID (180-day cookie)
  function getVisitorId() {
    var match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]+)'));
    if (match) return match[1];
    var id = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    var expires = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = COOKIE_NAME + '=' + id + '; expires=' + expires + '; path=/';
    return id;
  }

  // 2. Deterministic string hash -> integer bucket (0 to BUCKET_SIZE-1)
  function hashToBucket(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash % BUCKET_SIZE;
  }

  // 3. Decide which variation (if any) this visitor falls into
  function assignVariation(visitorId, experiment) {
    var bucket = hashToBucket(visitorId + experiment.id);
    if (bucket >= experiment.trafficAllocation) return null;

    var cumulative = 0;
    for (var i = 0; i < experiment.variations.length; i++) {
      cumulative += experiment.variations[i].weight;
      if (bucket < cumulative) return experiment.variations[i].id;
    }
    return null;
  }

  // 4. Read ?cro_preview=exp.variation[,exp2.variation2] from the URL
  function getPreviewOverrides() {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get('cro_preview');
    var overrides = {};
    if (raw) {
      raw.split(',').forEach(function (pair) {
        var parts = pair.split('.');
        if (parts.length === 2) overrides[parts[0].trim()] = parts[1].trim();
      });
    }
    return overrides;
  }

  function revealPage() {
    document.documentElement.classList.remove('cro-hide');
  }

  // 5. Log an event (pageview or conversion) into localStorage
  function trackEvent(eventName, experimentId, variationId) {
    var payload = {
      visitorId: currentVisitorId,
      experimentId: experimentId,
      variationId: variationId,
      event: eventName,
      ts: Date.now()
    };

    // Local copy — keeps croGetResults() working for quick in-browser checks
    try {
      var events = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
      events.push(payload);
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    } catch (e) {
      console.error('cro failed to save event locally', e);
    }

    // Google sheets — every real visitor's events land in the same Sheet

    // if (BACKEND_URL && BACKEND_URL.indexOf('PASTE_') !== 0) {
    //   fetch(BACKEND_URL, {
    //     method: 'POST',
    //     mode: 'no-cors', // Apps Script doesn't return CORS headers; fire-and-forget is fine here
    //     headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    //     body: JSON.stringify(payload)
    //   }).catch(function (err) {
    //     console.error('cro failed to send event to backend', err);
    //   });
    // }

    // console.log('cro event:', eventName, experimentId, variationId);

    // GTM datalayer
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'cro_' + eventName,
        cro_event_name: eventName,
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
    var el = document.querySelector(experiment.goalSelector);
    if (!el) return;
    el.addEventListener('click', function () {
      trackEvent('conversion', experiment.id, variationId);
    });
  }

  function init(config) {
    currentVisitorId = getVisitorId();
    var previewOverrides = getPreviewOverrides();
    var assignments = {};

    (config.experiments || []).forEach(function (experiment) {
      var forced = previewOverrides[experiment.id];
      var variationId = forced || assignVariation(currentVisitorId, experiment);
      var finalVariationId = variationId || 'control';
      assignments[experiment.id] = finalVariationId;

      if (variationId && variationId !== 'control') {
        var action =
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

      // Every visitor counts as exposed, regardless of which variation they got
      trackEvent('pageview', experiment.id, finalVariationId);
      attachGoalListener(experiment, finalVariationId);
    });

    window.croAssignments = assignments;
    window.croVisitorId = currentVisitorId;
    console.log('cro visitor', currentVisitorId, 'assignments', assignments);

    revealPage();
  }

  // 7. Console helper: tally events into pageviews / conversions / rate per variation
  window.croGetResults = function () {
    var events = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
    var stats = {};
    events.forEach(function (e) {
      var key = e.experimentId + ' / ' + e.variationId;
      if (!stats[key]) stats[key] = { pageviews: 0, conversions: 0 };
      if (e.event === 'pageview') stats[key].pageviews++;
      if (e.event === 'conversion') stats[key].conversions++;
    });
    Object.keys(stats).forEach(function (key) {
      var s = stats[key];
      s.conversionRate = s.pageviews ? ((s.conversions / s.pageviews) * 100).toFixed(1) + '%' : '0%';
    });
    console.table(stats);
    return stats;
  };

  fetch(CONFIG_URL)
    .then(function (r) {
      return r.json();
    })
    .then(init)
    .catch(function (err) {
      console.error('cro failed to load config, showing original page', err);
      revealPage();
    });
})();
