const fs = require('fs');
const path = require('path');

const content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{data.title}}</title>
    <style>
        :root {
            --primary-color: {{data.theme.primaryColor}};
            --text-color: {{data.theme.textColor}};
        }
        .golden-text-mixin, h1, h2, h3 {
             color: var(--primary-color) !important;
        }
        body {
            color: var(--text-color) !important;
            {{#if data.theme.backgroundImage}}
            background-image: url('/images/{{data.theme.backgroundImage}}');
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            {{/if}}
        }
        .wooden-panel {
            {{#if data.theme.tilesBackground}}
            background-image: url('/images/{{data.theme.tilesBackground}}') !important;
            background-size: cover;
            {{/if}}
        }
    </style>
</head>
<body>
    <script>window.data = {{{json data}}};</script>

    <script>
    setInterval(
        () => location.reload(),
        {{data.reloadTimeout}},
    );
    </script>

    <div id="main-entry"></div>

    {{{body}}}
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'views/layouts/main.handlebars'), content);
console.log('File written');
