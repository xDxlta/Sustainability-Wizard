/* Wizard definition (version 2.1): three steps, nine answers. A question stays only if its answer
 * changes a number or a product in the result. Everything else is a default the hotel can adjust on
 * the result page, or an optional field of the proposal form. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.SW = root.SW || {}; root.SW.questions = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var steps = [
    {
      id: 'hotel', title: 'Your hotel',
      fields: [
        { id: 'country', type: 'single', label: 'Market', required: true, options: [
          { id: 'MY', label: 'Malaysia' }, { id: 'ID', label: 'Indonesia' }, { id: 'PH', label: 'Philippines' }, { id: 'SG', label: 'Singapore' }
        ] },
        { id: 'rooms', type: 'number', label: 'Guest rooms', required: true, min: 1, max: 5000, chips: [80, 150, 250, 400, 600], placeholder: 'e.g. 250' },
        { id: 'occupancy', type: 'single', label: 'Average occupancy', required: true, options: [
          { id: 'default', label: 'Not sure', desc: 'National average' },
          { id: '0.5', label: '50%' }, { id: '0.6', label: '60%' }, { id: '0.7', label: '70%' }, { id: '0.8', label: '80%' }, { id: '0.9', label: '90%' }
        ] }
      ]
    },
    {
      id: 'water', title: 'Bottled water in the rooms today',
      fields: [
        { id: 'current', type: 'single', label: 'What guests find in the room', required: true, options: [
          { id: 'pet_free', label: 'Plastic bottles, free' },
          { id: 'pet_sold', label: 'Plastic bottles, sold from the minibar' },
          { id: 'glass_bought', label: 'Glass bottles, bought in' },
          { id: 'glass_own', label: 'Glass bottles, filled in-house' },
          { id: 'none', label: 'None' }
        ] },
        { id: 'bottlesPerRoomNight', type: 'single', label: 'Bottles per room and night', required: true, showIf: function (a) { return a.current && a.current !== 'none'; }, options: [
          { id: 'default', label: 'Not sure', desc: 'We assume 2' }, { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }, { id: '4', label: '4 or more' }
        ] },
        { id: 'bottleSizeMl', type: 'single', label: 'Bottle size', required: true, showIf: function (a) { return a.current && a.current !== 'none'; }, options: [
          { id: 'default', label: 'Not sure', desc: 'We assume 500 ml' }, { id: '330', label: '330 ml' }, { id: '500', label: '500 ml' }, { id: '600', label: '600 ml' }, { id: '1500', label: '1.5 L' }
        ] },
        { id: 'priceBand', type: 'single', label: 'Price you pay per bottle', required: true, showIf: function (a) { return a.current && a.current !== 'none'; }, dynamic: 'bottlePrices', options: [] },
        { id: 'priceCustom', type: 'number', label: 'Price per bottle (local currency)', showIf: function (a) { return a.current && a.current !== 'none' && a.priceBand === 'custom'; }, min: 0, max: 100000, step: 0.01, placeholder: 'e.g. 0.65' }
      ]
    },
    {
      id: 'wish', title: 'What you want',
      fields: [
        { id: 'areas', type: 'multi', label: 'Where filtered water should go (choose all that apply)', required: true, options: [
          { id: 'rooms', label: 'Guest rooms' }, { id: 'fnb', label: 'Restaurants and bars' }, { id: 'meetings', label: 'Meetings and events' }, { id: 'boh', label: 'Staff areas' }
        ] },
        { id: 'temps', type: 'single', label: 'Water in the room', required: true, showIf: function (a) { return (a.areas || []).indexOf('rooms') >= 0; }, options: [
          { id: 'ambient', label: 'Ambient', desc: 'Filtered tap' }, { id: 'cold', label: 'Chilled' }, { id: 'hotcold', label: 'Hot and chilled' }, { id: 'sparkling', label: 'Chilled and sparkling' }
        ] }
      ]
    }
  ];

  /* Optional fields of the proposal form on the result page (not part of the flow). */
  var proposalFields = [
    { id: 'name', type: 'text', label: 'Name', placeholder: 'Optional' },
    { id: 'hotel', type: 'text', label: 'Hotel', placeholder: 'Optional' },
    { id: 'email', type: 'email', label: 'Work email', placeholder: 'Optional' },
    { id: 'source', type: 'select', label: 'Water supply', options: [
      { id: '', label: 'Not sure' }, { id: 'mains', label: 'Municipal mains' }, { id: 'tank', label: 'Mains via storage tank' }, { id: 'well', label: 'Own well or treatment plant' }
    ] },
    { id: 'halal', type: 'select', label: 'Halal certificate', options: [
      { id: '', label: 'Not needed' }, { id: 'yes', label: 'Please include' }
    ] },
    { id: 'timing', type: 'select', label: 'Timing', options: [
      { id: '', label: 'Not decided' }, { id: 'lt3', label: 'Within 3 months' }, { id: '3to12', label: '3 to 12 months' }, { id: 'gt12', label: 'Later' }
    ] },
    { id: 'approval', type: 'select', label: 'Who approves', options: [
      { id: '', label: 'Not sure' }, { id: 'gm', label: 'Hotel management' }, { id: 'owner', label: 'Owner' }
    ] }
  ];

  return { steps: steps, proposalFields: proposalFields };
});
