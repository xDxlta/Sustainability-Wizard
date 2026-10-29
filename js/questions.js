/* Wizard definition (version 2): six short steps. Every question stays only because its answer
 * changes what the hotel sees in the result. `showIf(a)` receives the answers object. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.questions = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var steps = [
    {
      id: 'market', title: 'Where is your hotel?', intro: 'The market sets the currency and the reference values for occupancy, wages and bottle prices. You can change any of them on the result page.',
      fields: [
        { id: 'country', type: 'single', required: true, options: [
          { id: 'MY', label: 'Malaysia' },
          { id: 'ID', label: 'Indonesia' },
          { id: 'PH', label: 'Philippines' },
          { id: 'SG', label: 'Singapore' }
        ] }
      ]
    },
    {
      id: 'hotel', title: 'Tell us about the hotel', intro: 'An approximate room count is enough. If you do not know the occupancy, we use the latest published national figure.',
      fields: [
        { id: 'rooms', type: 'number', label: 'Number of guest rooms', required: true, min: 1, max: 5000, chips: [80, 150, 250, 400, 600], placeholder: 'e.g. 250' },
        { id: 'tier', type: 'single', label: 'Brand tier', required: true, options: [
          { id: 'luxury', label: 'Luxury', desc: 'Guest experience and audit standards drive the decision; a premium branded water may stay.' },
          { id: 'premium', label: 'Premium / upscale', desc: 'Full-service hotel with restaurants and meeting space.' },
          { id: 'select', label: 'Select-service / midscale', desc: 'Rooms-led, lean operations.' }
        ] },
        { id: 'build', type: 'single', label: 'The building', required: true, options: [
          { id: 'existing', label: 'Existing hotel, no renovation planned', desc: 'Retrofit units that need no change to the joinery.' },
          { id: 'renovation', label: 'Renovation planned or under way', desc: 'Water points can be built into the new joinery.' },
          { id: 'newbuild', label: 'New build or pre-opening', desc: 'Free design: power, drain and units are planned in.' }
        ] },
        { id: 'occupancy', type: 'single', label: 'Average occupancy', required: true, options: [
          { id: 'default', label: 'Not sure, use the national figure', desc: 'Latest published figure for the selected market.' },
          { id: '0.5', label: 'About 50%' }, { id: '0.6', label: 'About 60%' }, { id: '0.7', label: 'About 70%' }, { id: '0.8', label: 'About 80%' }, { id: '0.9', label: 'About 90%' }
        ] }
      ]
    },
    {
      id: 'water', title: 'Drinking water in guest rooms today', intro: 'This is the baseline the savings are measured against.',
      fields: [
        { id: 'current', type: 'single', required: true, options: [
          { id: 'pet_free', label: 'Single-use plastic bottles, complimentary' },
          { id: 'pet_sold', label: 'Single-use plastic bottles, sold via the minibar' },
          { id: 'glass_bought', label: 'Bought-in glass bottles (e.g. premium mineral water)' },
          { id: 'glass_own', label: 'Reusable glass bottles from our own bottling plant', desc: 'Plastic is already avoided; labour, washing and storage remain.' },
          { id: 'none', label: 'No bottled water in rooms, or already filtered', desc: 'We focus on restaurants, events and staff areas.' }
        ] },
        { id: 'bottlesPerRoomNight', type: 'single', label: 'Bottles placed per occupied room per night', required: true, showIf: function (a) { return a.current && a.current !== 'none'; }, options: [
          { id: 'default', label: 'Not sure, assume 2', desc: 'Typical complimentary set-up in industry case studies (labelled assumption).' },
          { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }, { id: '4', label: '4 or more' }
        ] },
        { id: 'bottleSizeMl', type: 'single', label: 'Usual bottle size', required: true, showIf: function (a) { return a.current && a.current !== 'none'; }, options: [
          { id: 'default', label: 'Not sure, assume 500 ml', desc: 'The only size with a published bottle weight.' },
          { id: '330', label: '330 ml' }, { id: '500', label: '500 ml' }, { id: '600', label: '600 ml' }, { id: '1500', label: '1.5 litres' }
        ] },
        { id: 'priceBand', type: 'single', label: 'What you pay per bottle', required: true, showIf: function (a) { return a.current && a.current !== 'none'; }, dynamic: 'bottlePrices', options: [] },
        { id: 'priceCustom', type: 'number', label: 'Your price per bottle (local currency)', showIf: function (a) { return a.current && a.current !== 'none' && a.priceBand === 'custom'; }, min: 0, max: 100000, step: 0.01, placeholder: 'e.g. 0.65' }
      ]
    },
    {
      id: 'areas', title: 'Where should filtered water go?', intro: 'Select every area you are considering. Guest rooms use in-room units; the other areas use drinking stations.',
      fields: [
        { id: 'areas', type: 'multi', required: true, options: [
          { id: 'rooms', label: 'Guest rooms' },
          { id: 'fnb', label: 'Restaurants and bars' },
          { id: 'meetings', label: 'Meeting rooms and events' },
          { id: 'boh', label: 'Staff areas and back of house' }
        ] },
        { id: 'otherBottlesPerDay', type: 'single', label: 'Bottles used outside guest rooms on a typical day', showIf: function (a) { var s = a.areas || []; return s.indexOf('fnb') >= 0 || s.indexOf('meetings') >= 0 || s.indexOf('boh') >= 0; }, options: [
          { id: '0', label: 'Not sure, leave them out', desc: 'Only guest-room bottles are counted.' },
          { id: '25', label: 'About 25' }, { id: '50', label: 'About 50' }, { id: '100', label: 'About 100' }, { id: '250', label: 'About 250' }, { id: '500', label: 'About 500' }, { id: '1000', label: '1,000 or more' }
        ] }
      ]
    },
    {
      id: 'inroom', title: 'The water point in the room', intro: 'Placement and water temperature decide which in-room unit fits.',
      showIf: function (a) { return (a.areas || []).indexOf('rooms') >= 0; },
      fields: [
        { id: 'placement', type: 'single', label: 'Where would it sit?', required: true, options: [
          { id: 'minibar', label: 'Minibar counter', desc: 'No change to the bathroom; power and drain are usually close.' },
          { id: 'vanity', label: 'Bathroom vanity', desc: 'Uses the existing water supply; a second tap next to the basin is disliked by guests.' },
          { id: 'notsure', label: 'Not sure, advise me' }
        ] },
        { id: 'temps', type: 'single', label: 'Which water should guests get?', required: true, options: [
          { id: 'ambient', label: 'Ambient only', desc: 'A filtered tap, no electricity.' },
          { id: 'cold', label: 'Chilled and ambient' },
          { id: 'hotcold', label: 'Hot and chilled', desc: 'Replaces the kettle as well.' },
          { id: 'sparkling', label: 'Chilled, ambient and sparkling', desc: 'Suites and luxury rooms.' }
        ] }
      ]
    },
    {
      id: 'supply', title: 'Your water supply', intro: 'The supply decides what the filtration has to handle and whether a water test is needed before the proposal.',
      fields: [
        { id: 'source', type: 'single', label: 'Where does the water in your taps come from?', required: true, options: [
          { id: 'mains', label: 'Municipal mains, directly' },
          { id: 'tank', label: 'Municipal mains via a rooftop or basement storage tank', desc: 'Common in the region; stored water can lose its chlorine residual.' },
          { id: 'well', label: 'Own well, borehole or private treatment plant' },
          { id: 'notsure', label: 'Not sure' }
        ] },
        { id: 'issues', type: 'multi', label: 'Known issues (optional)', options: [
          { id: 'sediment', label: 'Sediment, rust or discolouration' },
          { id: 'chlorine', label: 'Chlorine taste or smell' },
          { id: 'microbial', label: 'Microbial concerns (boil notices, test results)' }
        ] },
        { id: 'halal', type: 'single', label: 'Do you need Halal-certified filtration?', required: true, options: [
          { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, { id: 'notsure', label: 'Not sure' }
        ] }
      ]
    }
  ];

  /* Optional fields of the "request a proposal" form on the result page (not part of the flow). */
  var proposalFields = [
    { id: 'name', type: 'text', label: 'Your name', placeholder: 'Optional' },
    { id: 'hotel', type: 'text', label: 'Hotel name', placeholder: 'Optional' },
    { id: 'email', type: 'email', label: 'Work email', placeholder: 'Optional' },
    { id: 'timing', type: 'select', label: 'When would you like to implement? (optional)', options: [
      { id: '', label: 'Not decided' }, { id: 'lt3', label: 'Within 3 months' }, { id: '3to12', label: 'In 3 to 12 months' }, { id: 'gt12', label: 'In more than 12 months' }
    ] },
    { id: 'approval', type: 'select', label: 'Who approves the investment? (optional)', options: [
      { id: '', label: 'Not sure' }, { id: 'gm', label: 'Hotel management' }, { id: 'owner', label: 'The owner or asset manager' }
    ] }
  ];

  return { steps: steps, proposalFields: proposalFields };
});
