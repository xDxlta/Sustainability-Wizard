# Embedding the wizard in swissprowater.com

The wizard is a static folder (`index.html`, `sources.html`, `styles.css`, `js/`, `assets/`). Copy it to the
web server, e.g. `https://swissprowater.com/wizard/`, and embed it with an iframe in embed mode:

```html
<iframe id="swisspro-wizard" src="https://swissprowater.com/wizard/index.html?embed=1"
        title="Swisspro Sustainability Wizard" style="width:100%;border:0;min-height:900px" loading="lazy"></iframe>
<script>
  window.addEventListener('message', function (e) {
    if (e.data && e.data.swissproWizardHeight) document.getElementById('swisspro-wizard').style.height = e.data.swissproWizardHeight + 'px';
  });
</script>
```

Embed mode hides the wizard's own header and footer, makes the page background transparent and posts its
content height to the parent page so the iframe grows with the result page.

Brand: all colours and fonts are tokens at the top of `styles.css` (`--brand`, `--brand-deep`, `--accent`,
`--font-display`, `--font-body`). Replace them with the values of the site's stylesheet; the Google Fonts
link in `index.html` and `sources.html` can be removed if the site serves its own fonts.

Lead email: `leadEmail` in `js/pricelist.js`. The "Send the request" button opens the visitor's email program with
the summary addressed to that email. To send without an email program, set `leadEndpoint` in `js/pricelist.js` to a
URL that accepts a POST with a JSON body (`name`, `hotel`, `email`, `source`, `halal`, `timing`, `approval`,
`answers`, `overrides`, `summary`), for example a form service or the website's own form handler; the button then
posts the request and shows a confirmation.

Analytics: add the site's tag to both HTML files.
