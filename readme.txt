This is the landing page deployed here for testing an in-house A/B testing engine.

The goal is to understand and replicate, at a small scale, how client-side experimentation
platforms like Optimizely work — visitor bucketing, variation rendering, and event
tracking — before building anything more permanent.

### What's being tested

| File | Role |

| `experiments.json` | Experiment config — traffic split, variation weights, goal selector |
| `cro-variations.js` | Variation code — the DOM changes per variation |
| `cro-engine.js` | Runtime — visitor bucketing, variation dispatch, event tracking |

### Trying it out
- Load the page normally to get randomly bucketed into `control`, `variant_a`, or `variant_b`.
- Force a specific variation via URL: `?cro_preview=hero_headline_test.variant_a`
- Open the browser console and run `croGetResults()` to see logged pageviews/conversions
  per variation.