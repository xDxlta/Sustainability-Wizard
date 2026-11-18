/* Swisspro hotel pipeline tool - configuration.
 *
 * The ONE place for the weights and rules of the priority score, the fixed lists of the pipeline record
 * and the pitch texts. The weights are a proposal of the project team (brief of Nov 2026); the steps
 * inside each component are the implementation of that proposal and can be changed here.
 * The score is rule-based. It is not a probability and must never be labelled as one.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.CRM = root.CRM || {}; root.CRM.config = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var score = {
    label: 'Priority score (rule-based)',
    /* Reference month for "before opening". Fixed to the month the data was compiled so that scores are reproducible. */
    referenceYear: 2026,
    weights: { payback: 35, size: 20, owner: 20, segment: 15, timing: 10 },

    /* Payback fit: ratio = reference occupancy / occupancy needed for a cash payback within `years`.
       0 points at ratio <= zeroAt, full points at ratio >= fullAt, linear in between. */
    payback: { years: 3, zeroAt: 0.5, fullAt: 1.25 },

    /* Size: linear in rooms, full points from `fullAtRooms` rooms. */
    size: { fullAtRooms: 400 },

    /* Owner leverage: hotels of the same owner group in the data (this hotel included).
       `steps` is read top down: the first entry with count >= min applies.
       `projectBonus` is added when another hotel of the group is at Quoted, Mock-up or Won. */
    owner: {
      steps: [{ min: 5, points: 16 }, { min: 3, points: 12 }, { min: 2, points: 8 }, { min: 1, points: 4 }],
      projectBonus: 4,
      projectStatuses: ['Quoted', 'Mock-up', 'Won']
    },

    /* Segment fit: three parts that add up to the weight (8 + 4 + 3 = 15). */
    segment: {
      tier: { Premium: 8, Select: 8, 'Longer Stays': 5, Collections: 5, Luxury: 2 },
      model: { managed: 4, owner_operated: 3 },   // not sourced: neutral, half of 4
      modelMax: 4,
      stage: { existing: 3, new_build: 1 }
    },

    /* Timing: a new build before opening scores highest. Existing hotels: the renovation date is not in
       the data, so the component is neutral (half of the weight). */
    timing: { newBuildLater: 10, newBuildThisYear: 7 }
  };

  var statuses = ['Not contacted', 'Contacted', 'Quoted', 'Mock-up', 'Won', 'Lost', 'On hold'];
  var closedStatuses = ['Won', 'Lost'];
  var deciders = ['unknown', 'owner', 'owner representative', 'GM', 'engineering', 'procurement', 'chain office', 'consultant or contractor'];
  var reasons = ['payback', 'price', 'design', 'guest experience', 'brand or sustainability goal', 'timing or renovation', 'chose bottling plant', 'chose competitor', 'no budget', 'no decision', 'other'];

  /* Swisspro's own status words and the pipeline status they pre-fill. "Closed" stays unassigned: its meaning is not confirmed. */
  var projectStatusMap = { Hot: 'Mock-up', Warm: 'Quoted', Cold: 'On hold', HIT: 'Won', Closed: null };

  /* Pitch texts by segment, as given by the project team. */
  var pitch = {
    managed: { segment: 'Existing, Premium or Select, managed', text: 'The GM takes a payback case to the owner. Pitch at renovation or after a mock-up.' },
    owner_operated: { segment: 'Existing, Premium or Select, owner-operated', text: 'The owner decides alone on payback; the chain approves the supplier.' },
    new_build: { segment: 'New build, any tier', text: 'Pitch in the design phase, through the consultant or contractor who specifies the rooms.' },
    luxury: { segment: 'Existing, Luxury', text: 'Payback plus a design test; in-house glass bottling is the common alternative.' },
    not_sourced: { segment: 'Operating model not sourced', text: 'Find out first whether the hotel is managed or owner-operated; it decides who signs.' }
  };

  /**
   * Which pitch text applies to a hotel. Order: new build, then Luxury, then operating model not sourced,
   * then managed or owner-operated. The brief gives texts for Premium and Select only; for the tiers
   * Longer Stays and Collections the text of the same operating model is used and `otherTier` is set
   * so the interface can say so.
   */
  function pitchFor(hotel) {
    var key;
    if (hotel.build_stage === 'new_build') key = 'new_build';
    else if (hotel.tier === 'Luxury') key = 'luxury';
    else if (hotel.operating_model !== 'managed' && hotel.operating_model !== 'owner_operated') key = 'not_sourced';
    else key = hotel.operating_model;
    var otherTier = (key === 'managed' || key === 'owner_operated') && hotel.tier !== 'Premium' && hotel.tier !== 'Select';
    return { key: key, segment: pitch[key].segment, text: pitch[key].text, otherTier: otherTier };
  }

  /* Hotels of the list that already replaced single-use bottles according to the public case archive
     (hotel id -> case id in cases_public.json). Named by the project team, 18 Nov 2026. Shown as a label
     and offered as a filter; it does not enter the priority score. */
  var solved = { label: 'Already has a solution (public case)', byHotel: { h006: 'C01', h041: 'C02', h133: 'C18', h001: 'C24' } };

  /* Owner value that stands for a private individual whose name is not kept. Such hotels are not one
     owner group: each counts as a single-hotel owner and no "same owner" list is shown. */
  var privateOwner = 'Private owner';

  var labels = {
    operating_model: { managed: 'Managed', owner_operated: 'Owner-operated', not_sourced: 'Not sourced' },
    build_stage: { existing: 'Existing', new_build: 'New build' },
    hotel_status: { 'In Betrieb': 'Operating', Pipeline: 'Not open yet' }
  };

  return {
    score: score, statuses: statuses, closedStatuses: closedStatuses, deciders: deciders, reasons: reasons,
    projectStatusMap: projectStatusMap, solved: solved, privateOwner: privateOwner, pitch: pitch, pitchFor: pitchFor, labels: labels,
    dataDate: 'compiled Oct to Nov 2026 by the project team',
    storageKey: 'swisspro-crm-v1', projectsKey: 'swisspro-crm-projects-v1'
  };
});
