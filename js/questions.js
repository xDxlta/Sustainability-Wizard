/* Wizard definition: every step is multiple choice; numbers are optional quick-picks.
 * `showIf(a)` receives the answers object. Option `value`s are what the engine consumes. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.questions = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var steps = [
    {
      id: 'country', title: 'Where is your hotel?', intro: 'We use the market to pick sourced reference values for occupancy, wages, bottle prices and local regulations. You can change any of them later.',
      fields: [
        { id: 'country', type: 'single', required: true, options: [
          { id: 'SG', label: 'Singapore' },
          { id: 'MY', label: 'Malaysia' },
          { id: 'ID', label: 'Indonesia' },
          { id: 'PH', label: 'Philippines' },
          { id: 'OTHER', label: 'Other Asia-Pacific market', desc: 'Results in US dollars; you enter your own prices.' }
        ] }
      ]
    },
    {
      id: 'property', title: 'What kind of property is it?', intro: 'Different segments decide differently, so the summary and the arguments are tailored.',
      fields: [
        { id: 'tier', type: 'single', label: 'Brand tier', required: true, options: [
          { id: 'luxury', label: 'Luxury', desc: 'Guest experience and audit standards (Forbes, LQA) drive the decision.' },
          { id: 'premium', label: 'Premium / upscale', desc: 'Full-service hotel with F&B and meeting space.' },
          { id: 'select', label: 'Select-service / midscale', desc: 'Rooms-led, lean operations, cost focus.' }
        ] },
        { id: 'ownership', type: 'single', label: 'Who owns and operates it?', required: true, options: [
          { id: 'owned', label: 'Owner-operated or independent', desc: 'The owner decides and keeps the savings.' },
          { id: 'managed', label: 'Operated by a brand under a management agreement', desc: 'Brand standards apply; the owner may need to approve capital spend.' },
          { id: 'franchised', label: 'Franchised', desc: 'Owner runs the hotel under brand standards.' }
        ] },
        { id: 'build', type: 'single', label: 'Where is the building in its life cycle?', required: true, options: [
          { id: 'existing', label: 'Existing hotel, no renovation planned', desc: 'Space and plumbing are fixed; retrofit solutions.' },
          { id: 'renovation', label: 'Renovation planned or under way', desc: 'The best moment to integrate water points into the joinery.' },
          { id: 'newbuild', label: 'New build or pre-opening', desc: 'Free design: taps and dispensers can be planned in.' }
        ] }
      ]
    },
    {
      id: 'size', title: 'How big is the hotel?', intro: 'An approximate room count is enough. If you do not know the occupancy, we use the latest published national average.',
      fields: [
        { id: 'rooms', type: 'number', label: 'Number of guest rooms', required: true, min: 1, max: 5000, chips: [80, 150, 250, 400, 600], placeholder: 'e.g. 250' },
        { id: 'occupancy', type: 'single', label: 'Average occupancy', required: true, options: [
          { id: 'default', label: 'Not sure - use the national average', desc: 'Sourced figure for the selected market.' },
          { id: '0.5', label: 'About 50%' }, { id: '0.6', label: 'About 60%' }, { id: '0.7', label: 'About 70%' },
          { id: '0.8', label: 'About 80%' }, { id: '0.9', label: 'About 90%' }
        ] }
      ]
    },
    {
      id: 'water', title: 'How do you serve drinking water in guest rooms today?', intro: 'This sets the baseline we compare against.',
      fields: [
        { id: 'current', type: 'single', required: true, options: [
          { id: 'pet_free', label: 'Single-use plastic bottles, complimentary' },
          { id: 'pet_sold', label: 'Single-use plastic bottles, sold via the minibar' },
          { id: 'glass_bought', label: 'Bought-in glass bottles (e.g. premium mineral water)' },
          { id: 'glass_own', label: 'Glass bottles from our own bottling plant', desc: 'Reusable glass: plastic is already avoided, labour and washing remain.' },
          { id: 'cooler', label: '19-litre water-cooler bottles or jugs' },
          { id: 'none', label: 'No bottled water in rooms / already filtered', desc: 'We will focus on F&B, meetings and back of house.' }
        ] },
        { id: 'bottlesPerRoomNight', type: 'single', label: 'Bottles placed per occupied room per night', required: true, showIf: function (a) { return a.current !== 'none'; }, options: [
          { id: 'default', label: 'Not sure - assume 2', desc: 'Typical complimentary set-up in industry case studies (labelled assumption).' },
          { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }, { id: '4', label: '4 or more' }
        ] },
        { id: 'bottleSizeMl', type: 'single', label: 'Usual bottle size', required: true, showIf: function (a) { return a.current !== 'none'; }, options: [
          { id: '330', label: '330 ml' }, { id: '500', label: '500 ml', desc: 'Most common; the only size with a sourced bottle weight.' },
          { id: '600', label: '600 ml' }, { id: '1000', label: '1 litre' }, { id: '1500', label: '1.5 litres' }
        ] }
      ]
    },
    {
      id: 'price', title: 'What does a bottle cost you?', intro: 'Pick the closest option. The reference prices are published carton prices (not restaurant prices); hotels on contracts may pay less.',
      fields: [
        { id: 'priceBand', type: 'single', required: true, dynamic: 'bottlePrices', options: [] },
        { id: 'priceCustom', type: 'number', label: 'Your price per bottle (local currency)', showIf: function (a) { return a.priceBand === 'custom'; }, min: 0, max: 100000, step: 0.01, placeholder: 'e.g. 0.45' }
      ]
    },
    {
      id: 'areas', title: 'Where should filtered water go?', intro: 'Select every area you are considering. Each area gets its own product suggestion.',
      fields: [
        { id: 'areas', type: 'multi', required: true, options: [
          { id: 'rooms', label: 'Guest rooms' },
          { id: 'fnb', label: 'Restaurants and bars' },
          { id: 'meetings', label: 'Meeting rooms and events' },
          { id: 'boh', label: 'Back of house (kitchen, stewarding, staff areas)' },
          { id: 'public', label: 'Gym, spa, pool, lobby' }
        ] },
        { id: 'fnbOutlets', type: 'single', label: 'Number of F&B outlets', showIf: function (a) { return (a.areas || []).indexOf('fnb') >= 0; }, options: [
          { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }, { id: '5', label: '5 or more' }
        ] },
        { id: 'meetingRooms', type: 'single', label: 'Number of meeting rooms / ballrooms', showIf: function (a) { return (a.areas || []).indexOf('meetings') >= 0; }, options: [
          { id: '2', label: '1-2' }, { id: '5', label: '3-5' }, { id: '10', label: '6-10' }, { id: '15', label: 'More than 10' }
        ] },
        { id: 'otherBottlesPerDay', type: 'single', label: 'Bottles used outside guest rooms on a typical day (F&B, events, staff)', showIf: function (a) { var s = a.areas || []; return s.indexOf('fnb') >= 0 || s.indexOf('meetings') >= 0 || s.indexOf('boh') >= 0 || s.indexOf('public') >= 0; }, options: [
          { id: '0', label: 'Not sure - leave out', desc: 'Only guest-room bottles are counted.' },
          { id: '25', label: 'About 25' }, { id: '50', label: 'About 50' }, { id: '100', label: 'About 100' },
          { id: '250', label: 'About 250' }, { id: '500', label: 'About 500' }, { id: '1000', label: '1,000 or more' }
        ] }
      ]
    },
    {
      id: 'roomprefs', title: 'Guest-room preferences', intro: 'Like configuring a product online: placement, temperatures and finish decide which Swisspro unit fits.',
      showIf: function (a) { return (a.areas || []).indexOf('rooms') >= 0; },
      fields: [
        { id: 'placement', type: 'single', label: 'Where would the water point sit?', required: true, options: [
          { id: 'minibar', label: 'Minibar counter', desc: 'Preferred by guests and operators; no change to the bathroom.' },
          { id: 'vanity', label: 'Bathroom vanity', desc: 'Uses the existing water supply; guests dislike a drinking tap right next to the basin.' },
          { id: 'notsure', label: 'Not sure - advise me' }
        ] },
        { id: 'temps', type: 'single', label: 'Which water types should guests get?', required: true, options: [
          { id: 'ambient', label: 'Ambient only', desc: 'Simplest: a filtered tap, no electricity.' },
          { id: 'cold', label: 'Chilled + ambient' },
          { id: 'hotcold', label: 'Hot + chilled', desc: 'Replaces the kettle as well.' },
          { id: 'sparkling', label: 'Hot, chilled and sparkling', desc: 'Suites and luxury: replaces imported sparkling water.' }
        ] },
        { id: 'finish', type: 'single', label: 'Preferred look', required: true, options: [
          { id: 'chrome', label: 'Chrome' }, { id: 'black', label: 'Black' }, { id: 'white', label: 'White' }, { id: 'nopref', label: 'No preference' }
        ] },
        { id: 'space', type: 'single', label: 'Space at the minibar or vanity', required: true, options: [
          { id: 'enough', label: 'Enough counter and cabinet space' },
          { id: 'tight', label: 'Tight - compact or built-in needed' }
        ] }
      ]
    },
    {
      id: 'supply', title: 'Your water supply', intro: 'Local water quality decides the filter specification and how often filters are changed.',
      fields: [
        { id: 'source', type: 'single', label: 'Where does the water in your taps come from?', required: true, options: [
          { id: 'mains', label: 'Municipal mains, directly' },
          { id: 'tank', label: 'Municipal mains via a rooftop or basement storage tank', desc: 'Common in the region; tanks can let bacteria regrow.' },
          { id: 'well', label: 'Own well, borehole or private treatment plant' },
          { id: 'notsure', label: 'Not sure' }
        ] },
        { id: 'issues', type: 'multi', label: 'Any known issues? (select all that apply)', options: [
          { id: 'none', label: 'None that we know of', exclusive: true },
          { id: 'sediment', label: 'Sediment, rust or discolouration' },
          { id: 'chlorine', label: 'Chlorine taste or smell' },
          { id: 'microbial', label: 'Microbial concerns (boil notices, test results)' },
          { id: 'notsure', label: 'Not sure', exclusive: true }
        ] },
        { id: 'halal', type: 'single', label: 'Do you need Halal-certified filtration?', required: true, options: [
          { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, { id: 'notsure', label: 'Not sure' }
        ] }
      ]
    },
    {
      id: 'drivers', title: 'What is driving the change?', intro: 'We order the business case around what matters to your decision makers.',
      fields: [
        { id: 'drivers', type: 'multi', label: 'Select all that apply', required: true, options: [
          { id: 'cost', label: 'Cost of bottled water' },
          { id: 'efficiency', label: 'Housekeeping efficiency and guest convenience' },
          { id: 'storage', label: 'Storage, deliveries and heavy trolleys' },
          { id: 'certification', label: 'Sustainability certification (Green Globe, GSTC, EarthCheck, etc.)' },
          { id: 'audit', label: 'Luxury audit standards (Forbes Travel Guide, LQA)' },
          { id: 'mandate', label: 'Brand or owner single-use plastic policy' },
          { id: 'renovation', label: 'Renovation or new build' },
          { id: 'safety', label: 'Water safety and guest health' }
        ] },
        { id: 'keepPremium', type: 'single', label: 'Will you keep offering a premium branded water?', required: true, showIf: function (a) { return a.tier === 'luxury'; }, options: [
          { id: 'no', label: 'No - filtered water for all guests' },
          { id: 'yes', label: 'Yes - as a paid or VIP option', desc: 'Filtered water replaces the complimentary bottles only.' }
        ] },
        { id: 'approval', type: 'single', label: 'Who can approve the investment?', required: true, options: [
          { id: 'gm', label: 'The general manager or hotel management' },
          { id: 'owner', label: 'The owner or asset manager must approve' },
          { id: 'notsure', label: 'Not sure' }
        ] },
        { id: 'timeline', type: 'single', label: 'When would you like to implement?', required: true, options: [
          { id: 'lt3', label: 'Within 3 months' }, { id: '3to12', label: 'In 3-12 months' }, { id: 'gt12', label: 'In more than 12 months' }, { id: 'exploring', label: 'Just exploring' }
        ] }
      ]
    },
    {
      id: 'contact', title: 'Almost done', intro: 'Optional: tell us who you are so Swisspro can send you the detailed report and a quote. Your results appear either way.',
      fields: [
        { id: 'name', type: 'text', label: 'Your name', placeholder: 'Optional' },
        { id: 'role', type: 'text', label: 'Your role', placeholder: 'e.g. Director of Rooms (optional)' },
        { id: 'hotel', type: 'text', label: 'Hotel name', placeholder: 'Optional' },
        { id: 'email', type: 'email', label: 'Work email', placeholder: 'Optional' }
      ]
    }
  ];

  return { steps: steps };
});
